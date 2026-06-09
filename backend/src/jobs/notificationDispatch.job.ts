import { notificationDispatchQueue } from './queue';
import Notification from '../models/Notification';
import User from '../models/User';
import { SendGridClient } from '../integrations/sendgrid.client';
import { WhatsAppClient } from '../integrations/whatsapp.client';

const sendgrid = new SendGridClient();
const whatsappClient = new WhatsAppClient();

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedEntity?: {
    type: string;
    id: string;
  };
  channels: {
    platform: boolean;
    email: boolean;
    whatsapp: boolean;
  };
  metadata?: {
    adminName?: string;
    hubName?: string;
    inviteLink?: string;
    meetingTitle?: string;
    scheduledAt?: string;
    scheduledAtIso?: string;
    description?: string;
    hubId?: string;
    estimatedDuration?: number;
    broadcastTitle?: string;
    broadcastBody?: string;
    urgency?: string;
    broadcastId?: string;
    memberName?: string;
    replyMessage?: string;
  };
}

notificationDispatchQueue.process(async (job) => {
  const { userId, type, title, message, relatedEntity, channels, metadata } = job.data as NotificationJobData;

  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    if (channels.platform) {
      await Notification.create({
        userId,
        type,
        title,
        message,
        relatedEntity,
        channels,
        isRead: false,
      });

      if ((global as any).io) {
        (global as any).io.to(userId).emit('notification', { title, message, type, relatedEntity });
      }
    }

    if (channels.email && user.notificationPreferences?.email !== false) {
      const frontendUrl = process.env.NEXTAUTH_URL || 'https://im-on-it-bruh.vercel.app';
      let emailSubject = title;
      let bodyHtml = `<div style="font-family: Arial; padding: 20px;"><h3>${title}</h3><p>${message}</p></div>`;
      let attachments: Array<{ content: string; filename: string; type: string; disposition: 'attachment' }> | undefined;

      if (type === 'TASK_ASSIGNED') {
        bodyHtml = sendgrid.getTaskAssignedTemplate(title, message, new Date(), 'medium', metadata?.hubName || "I'm On It Bruh");
      } else if (type === 'HUB_INVITATION' && metadata) {
        bodyHtml = sendgrid.getHackerEarthInviteTemplate(
          metadata.adminName || 'Admin',
          metadata.hubName || 'Workspace',
          metadata.inviteLink || `${frontendUrl}/dashboard`
        );
      } else if (type === 'MEETING_SCHEDULED' && metadata) {
        emailSubject = `Meeting Invite: ${metadata.meetingTitle || title}`;
        bodyHtml = sendgrid.getMeetingScheduledTemplate(
          metadata.meetingTitle || title,
          metadata.hubName || 'Your Hub',
          metadata.scheduledAt || '',
          metadata.description || '',
          `${frontendUrl}/dashboard`
        );

        if (metadata.scheduledAtIso) {
          attachments = [
            sendgrid.buildMeetingInviteAttachment({
              meetingTitle: metadata.meetingTitle || title,
              description: metadata.description || message,
              scheduledAtIso: metadata.scheduledAtIso,
              estimatedDurationMinutes: metadata.estimatedDuration || 30,
              location: `${frontendUrl}/dashboard`,
            }),
          ];
        }
      } else if (
        (type === 'MEETING_REMINDER_15M' || type === 'MEETING_REMINDER_30M' || type === 'MEETING_REMINDER_24H') &&
        metadata
      ) {
        const timeLabel =
          type === 'MEETING_REMINDER_15M' ? '15 minutes' :
          type === 'MEETING_REMINDER_30M' ? '30 minutes' : 'tomorrow';
        emailSubject = `Reminder: ${metadata.meetingTitle || title} starts in ${timeLabel}`;
        bodyHtml = sendgrid.getMeetingReminderTemplate(
          metadata.meetingTitle || title,
          metadata.hubName || 'Your Hub',
          timeLabel,
          `${frontendUrl}/dashboard`,
          metadata.hubId
            ? `${frontendUrl}/dashboard/member/${metadata.hubId}?tab=broadcasts`
            : `${frontendUrl}/dashboard`
        );
      } else if (type === 'BROADCAST_SENT' && metadata) {
        emailSubject = `${metadata.hubName || 'Workspace'} Announcement: ${metadata.broadcastTitle || title}`;
        bodyHtml = sendgrid.getBroadcastTemplate(
          metadata.adminName || 'Admin',
          metadata.hubName || 'Your Hub',
          metadata.broadcastTitle || title,
          metadata.broadcastBody || message,
          metadata.urgency || 'medium',
          metadata.hubId && metadata.broadcastId
            ? `${frontendUrl}/dashboard/member/${metadata.hubId}?tab=broadcasts&replyTo=${metadata.broadcastId}`
            : `${frontendUrl}/dashboard`
        );
      } else if (type === 'BROADCAST_REPLY' && metadata) {
        emailSubject = `${metadata.memberName || 'A member'} replied to your announcement`;
        bodyHtml = sendgrid.getBroadcastReplyTemplate(
          metadata.memberName || 'A member',
          metadata.broadcastTitle || title,
          metadata.replyMessage || message,
          metadata.hubId
            ? `${frontendUrl}/dashboard/admin/${metadata.hubId}?tab=broadcasts`
            : `${frontendUrl}/dashboard`
        );
      }

      await sendgrid.sendEmail(user.email, emailSubject, bodyHtml, attachments);
    }

    if (channels.whatsapp && user.notificationPreferences?.whatsapp && user.whatsappEnabled && user.phoneNumber) {
      await whatsappClient.sendNotification(user.phoneNumber, `${title}: ${message}`);
    }

    return { status: 'success' };
  } catch (error: any) {
    console.error(`[NotificationDispatchJob] Error processing job ${job.id}:`, error);
    throw error;
  }
});
