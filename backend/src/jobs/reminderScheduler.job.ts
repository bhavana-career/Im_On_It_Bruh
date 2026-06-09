import { reminderSchedulerQueue, notificationDispatchQueue } from './queue';
import Meeting from '../models/Meeting';
import Task from '../models/Task';
import Hub from '../models/Hub';
import HubMembership from '../models/HubMembership';
import Notification from '../models/Notification';

reminderSchedulerQueue.process(async (job) => {
  try {
    console.log('[ReminderSchedulerJob] Running reminder scheduler check...');
    const now = new Date();
    
    // ----------------------------------------------------
    // 1. MEETING REMINDERS (24h, 30m, 15m)
    // ----------------------------------------------------
    const upcomingMeetings = await Meeting.find({
      status: 'scheduled',
      scheduledAt: { $gt: now },
    });

    for (const meeting of upcomingMeetings) {
      const diffMs = meeting.scheduledAt.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      let reminderType = '';
      let reminderMsg = '';

      if (diffMins <= 15 && diffMins > 0) {
        reminderType = 'MEETING_REMINDER_15M';
        reminderMsg = `The meeting "${meeting.title}" starts in 15 minutes.`;
      } else if (diffMins <= 30 && diffMins > 15) {
        reminderType = 'MEETING_REMINDER_30M';
        reminderMsg = `The meeting "${meeting.title}" starts in 30 minutes.`;
      } else if (diffMins <= 1440 && diffMins > 1400) { // roughly 24 hours
        reminderType = 'MEETING_REMINDER_24H';
        reminderMsg = `Reminder: "${meeting.title}" is scheduled for tomorrow at ${meeting.scheduledAt.toLocaleTimeString()}.`;
      }

      if (reminderType) {
        // Find if we already sent this specific reminder to avoid duplicate runs
        const alreadySent = await Notification.findOne({
          type: reminderType,
          'relatedEntity.id': meeting._id,
        });

        if (!alreadySent) {
          // Fetch hub name for email template
          const hub = await Hub.findById(meeting.hubId);
          const hubName = hub?.name || 'Your Hub';

          // Find all hub members
          const members = await HubMembership.find({ hubId: meeting.hubId, status: 'active' });
          for (const member of members) {
            await notificationDispatchQueue.add({
              userId: member.userId.toString(),
              type: reminderType,
              title: `Meeting Reminder: ${meeting.title}`,
              message: reminderMsg,
              relatedEntity: { type: 'Meeting', id: meeting._id.toString() },
              channels: { platform: true, email: true, whatsapp: false },
              metadata: {
                meetingTitle: meeting.title,
                hubName,
                hubId: meeting.hubId.toString(),
              },
            });
          }
        }
      }
    }

    // ----------------------------------------------------
    // 2. TASK REMINDERS (7d, 3d, 1d)
    // ----------------------------------------------------
    const activeTasks = await Task.find({
      status: { $in: ['assigned', 'in_progress', 'revision_required'] },
      deadline: { $gt: now },
    }).populate('assigneeId');

    for (const task of activeTasks) {
      const diffMs = task.deadline.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let reminderType = '';
      let reminderMsg = '';

      if (diffDays === 1) {
        reminderType = 'TASK_REMINDER_1D';
        reminderMsg = `Your task "${task.title}" is due tomorrow. Please submit your work on time.`;
      } else if (diffDays === 3) {
        reminderType = 'TASK_REMINDER_3D';
        reminderMsg = `Your task "${task.title}" is due in 3 days.`;
      } else if (diffDays === 7) {
        reminderType = 'TASK_REMINDER_7D';
        reminderMsg = `Your task "${task.title}" is due in 7 days.`;
      }

      if (reminderType) {
        const alreadySent = await Notification.findOne({
          userId: task.assigneeId._id,
          type: reminderType,
          'relatedEntity.id': task._id,
        });

        if (!alreadySent) {
          await notificationDispatchQueue.add({
            userId: task.assigneeId._id.toString(),
            type: reminderType,
            title: `Task Deadline: ${task.title}`,
            message: reminderMsg,
            relatedEntity: {
              type: 'Task',
              id: task._id.toString(),
            },
            channels: {
              platform: true,
              email: true,
              whatsapp: false,
            },
          });
        }
      }
    }

    return { status: 'success' };
  } catch (error) {
    console.error('[ReminderSchedulerJob] Error in scheduler:', error);
    throw error;
  }
});
