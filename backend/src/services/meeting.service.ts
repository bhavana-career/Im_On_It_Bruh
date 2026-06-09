import Meeting from '../models/Meeting';
import MeetingParticipant from '../models/MeetingParticipant';
import HubMembership from '../models/HubMembership';
import Hub from '../models/Hub';
import User from '../models/User';
import { LiveKitClient } from '../integrations/livekit.client';
import { GoogleCalendarClient } from '../integrations/googleCalendar.client';
import { aiProcessingQueue, notificationDispatchQueue } from '../jobs/queue';

const livekit = new LiveKitClient();
const googleCalendar = new GoogleCalendarClient();

export class MeetingService {
  /**
   * Get all meetings.
   */
  async getAllMeetings() {
    return Meeting.find({}).sort({ scheduledAt: 1 }); // Sort chronologically so upcoming display correctly
  }

  /**
   * Schedule a new meeting.
   */
  async scheduleMeeting(
    hubId: string,
    title: string,
    description: string,
    scheduledAt: Date,
    estimatedDuration: number,
    creatorId: string
  ) {
    const meeting = await Meeting.create({
      hubId,
      title,
      description,
      scheduledAt,
      estimatedDuration,
      status: 'scheduled',
      createdBy: creatorId,
    });

    // Fetch hub member emails to invite to Google Calendar event
    const memberships = await HubMembership.find({ hubId, status: 'active' }).populate('userId');
    const memberEmails = memberships
      .map((m) => (m.userId as any).email)
      .filter((email) => email);

    // Sync meeting with Google Calendar
    try {
      const calEventId = await googleCalendar.createMeetingEvent(
        {
          title,
          description,
          scheduledAt,
          estimatedDuration,
        },
        memberEmails
      );
      // Optional: Save calendar event ID in meeting metadata if needed
    } catch (err) {
      console.error('[MeetingService] Failed to sync to Google Calendar:', err);
    }

    // Notify all active members in the hub
    try {
      const creator = await User.findById(creatorId);
      const creatorName = creator?.profileName || 'Admin';

      // Fetch hub name for email templates
      const hub = await Hub.findById(hubId);
      const hubName = hub?.name || 'Your Hub';
      const scheduledAtStr = new Date(scheduledAt).toLocaleString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
      });

      const now = new Date();
      const diffMs = new Date(scheduledAt).getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      let isStartingSoon = false;
      let reminderType = '';
      let reminderMsg = '';

      if (diffMins <= 30 && diffMins > 0) {
        isStartingSoon = true;
        if (diffMins <= 15) {
          reminderType = 'MEETING_REMINDER_15M';
          reminderMsg = `The meeting "${title}" scheduled by ${creatorName} starts in ${diffMins} minutes. Please prepare to join!`;
        } else {
          reminderType = 'MEETING_REMINDER_30M';
          reminderMsg = `The meeting "${title}" scheduled by ${creatorName} starts in ${diffMins} minutes. Please prepare to join!`;
        }
      }

      for (const m of memberships) {
        const memberUserId = (m.userId as any)?._id?.toString() || m.userId?.toString();
        if (!memberUserId || memberUserId === creatorId) continue;

        // Send creation notification
        await notificationDispatchQueue.add({
          userId: memberUserId,
          type: 'MEETING_SCHEDULED',
          title: 'New Meeting Scheduled',
          message: `A new meeting "${title}" has been scheduled by ${creatorName} for ${new Date(scheduledAt).toLocaleString()}.`,
          relatedEntity: { type: 'Meeting', id: meeting._id.toString() },
          channels: { platform: true, email: true, whatsapp: true },
          metadata: {
            meetingTitle: title,
            hubName,
            scheduledAt: scheduledAtStr,
            description,
            hubId: hubId.toString(),
          },
        });

        // If meeting starts in 30 mins or less, send an immediate urgent reminder
        if (isStartingSoon && reminderType && reminderMsg) {
          await notificationDispatchQueue.add({
            userId: memberUserId,
            type: reminderType,
            title: `Meeting Reminder: ${title}`,
            message: reminderMsg,
            relatedEntity: { type: 'Meeting', id: meeting._id.toString() },
            channels: { platform: true, email: true, whatsapp: true },
            metadata: {
              meetingTitle: title,
              hubName,
              hubId: hubId.toString(),
            },
          });
        }
      }
    } catch (err) {
      console.error('[MeetingService] Failed to dispatch meeting notifications:', err);
    }

    return meeting;
  }

  /**
   * Start a meeting and generate LiveKit token.
   */
  async startMeeting(meetingId: string, userId: string) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) throw new Error('Meeting not found');

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Generate LiveKit room ID if not exists
    if (!meeting.liveKitRoomId) {
      meeting.liveKitRoomId = `room-${meeting._id}`;
    }

    meeting.status = 'active';
    await meeting.save();

    // Check if user is creator/admin to assign host role
    const membership = await HubMembership.findOne({ hubId: meeting.hubId, userId });
    const role = (membership?.role === 'admin' || meeting.createdBy.toString() === userId) ? 'host' : 'participant';

    // Record participant join
    await MeetingParticipant.findOneAndUpdate(
      { meetingId: meeting._id, userId },
      {
        joinedAt: new Date(),
        role,
        absent: false,
      },
      { upsert: true, new: true }
    );

    // Generate token
    const token = await livekit.generateToken(
      meeting.liveKitRoomId,
      userId,
      user.profileName || (user as any).username || 'User'
    );

    return {
      token,
      liveKitRoomId: meeting.liveKitRoomId,
      meeting,
    };
  }

  /**
   * End a meeting session, which fires the background AI processing job.
   */
  async endMeeting(meetingId: string, recordingUrl?: string) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) throw new Error('Meeting not found');

    meeting.status = 'ended';
    if (recordingUrl) {
      meeting.recordingUrl = recordingUrl;
    }
    await meeting.save();

    // Record left time for participants currently in meeting
    await MeetingParticipant.updateMany(
      { meetingId, leftAt: { $exists: false } },
      { $set: { leftAt: new Date() } }
    );

    // Calculate duration for all participants
    const participants = await MeetingParticipant.find({ meetingId });
    for (const p of participants) {
      if (p.joinedAt && p.leftAt) {
        const durationSec = Math.floor((p.leftAt.getTime() - p.joinedAt.getTime()) / 1000);
        p.duration = durationSec;
        await p.save();
      }
    }

    // End LiveKit room
    if (meeting.liveKitRoomId) {
      try {
        await livekit.endRoom(meeting.liveKitRoomId);
      } catch (err) {
        console.error('[MeetingService] Failed ending LiveKit room:', err);
      }
    }

    // Trigger AI processing queue
    console.log(`[MeetingService] Adding meeting ${meetingId} to AI processing queue.`);
    await aiProcessingQueue.add({ meetingId: meeting._id.toString() });

    return meeting;
  }
}

export default new MeetingService();
