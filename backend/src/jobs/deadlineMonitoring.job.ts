import { deadlineMonitoringQueue, notificationDispatchQueue } from './queue';
import Task from '../models/Task';
import HubMembership from '../models/HubMembership';

deadlineMonitoringQueue.process(async (job) => {
  try {
    console.log('[DeadlineMonitoringJob] Scanning for overdue tasks...');
    const now = new Date();

    // Find all tasks where deadline has passed, and they are not complete or already overdue
    const overdueTasks = await Task.find({
      deadline: { $lt: now },
      status: { $nin: ['pending_review', 'approved', 'completed', 'overdue', 'archived'] },
    }).populate('assigneeId');

    console.log(`[DeadlineMonitoringJob] Found ${overdueTasks.length} newly overdue tasks.`);

    for (const task of overdueTasks) {
      task.status = 'overdue';
      await task.save();

      const assignee = task.assigneeId as any;
      console.log(`[DeadlineMonitoringJob] Task "${task.title}" (ID: ${task._id}) marked as OVERDUE for user: ${assignee.email}`);

      // 1. Notify Assignee
      await notificationDispatchQueue.add({
        userId: assignee._id.toString(),
        type: 'TASK_OVERDUE',
        title: 'Task Overdue!',
        message: `Your assigned task "${task.title}" is overdue. Please submit your work immediately.`,
        relatedEntity: {
          type: 'Task',
          id: task._id.toString(),
        },
        channels: {
          platform: true,
          email: true,
          whatsapp: true, // feature-gated fallback handles this
        },
      });

      // 2. Notify Hub Admins
      const admins = await HubMembership.find({
        hubId: task.hubId,
        role: 'admin',
        status: 'active',
      }).populate('userId');

      for (const admin of admins) {
        const adminUser = admin.userId as any;
        await notificationDispatchQueue.add({
          userId: adminUser._id.toString(),
          type: 'MEMBER_TASK_OVERDUE',
          title: 'Member Task Overdue',
          message: `The task "${task.title}" assigned to ${assignee.profileName} is now overdue.`,
          relatedEntity: {
            type: 'Task',
            id: task._id.toString(),
          },
          channels: {
            platform: true,
            email: false,
            whatsapp: false,
          },
        });
      }
    }

    return { updatedCount: overdueTasks.length };
  } catch (error) {
    console.error('[DeadlineMonitoringJob] Failed scanning overdue tasks:', error);
    throw error;
  }
});
