import Task from '../models/Task';
import Meeting from '../models/Meeting';
import MeetingParticipant from '../models/MeetingParticipant';
import HubMembership from '../models/HubMembership';
import Submission from '../models/Submission';

export class AnalyticsService {
  /**
   * Get analytics dashboard payload for a hub.
   */
  async getHubAnalytics(hubId: string) {
    // 1. Member Count
    const totalMembers = await HubMembership.countDocuments({ hubId, status: 'active' });

    // 2. Task counts
    const totalTasks = await Task.countDocuments({ hubId, status: { $ne: 'archived' } });
    const completedTasks = await Task.countDocuments({ hubId, status: 'completed' });
    const approvedTasks = await Task.countDocuments({ hubId, status: 'approved' });
    const overdueTasks = await Task.countDocuments({ hubId, status: 'overdue' });
    const activeTasks = await Task.countDocuments({
      hubId,
      status: { $in: ['assigned', 'blocked', 'in_progress', 'pending_review', 'revision_required'] },
    });

    const completionRate = totalTasks > 0 ? ((completedTasks + approvedTasks) / totalTasks) * 100 : 0;

    // 3. Task distribution by priority
    const priorityDistribution = await Task.aggregate([
      { $match: { hubId: new Object(hubId), status: { $ne: 'archived' } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    // 4. Meeting metrics
    const totalMeetings = await Meeting.countDocuments({ hubId });
    const completedMeetings = await Meeting.countDocuments({ hubId, status: 'completed' });
    
    // Average attendance rate
    let avgAttendanceRate = 0;
    if (totalMeetings > 0) {
      const allParticipantsCount = await MeetingParticipant.countDocuments({
        meetingId: { $in: await Meeting.find({ hubId }).distinct('_id') },
        absent: false,
      });
      avgAttendanceRate = totalMembers > 0 ? (allParticipantsCount / (totalMeetings * totalMembers)) * 100 : 0;
    }

    // 5. Submission metrics
    const totalSubmissions = await Submission.countDocuments({
      taskId: { $in: await Task.find({ hubId }).distinct('_id') },
    });

    return {
      membersCount: totalMembers,
      tasks: {
        total: totalTasks,
        completed: completedTasks + approvedTasks,
        overdue: overdueTasks,
        active: activeTasks,
        completionRate: Math.round(completionRate),
        priorityDistribution: priorityDistribution.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, { low: 0, medium: 0, high: 0, critical: 0 }),
      },
      meetings: {
        total: totalMeetings,
        completed: completedMeetings,
        averageAttendanceRate: Math.round(avgAttendanceRate),
      },
      submissions: {
        total: totalSubmissions,
      },
    };
  }
}

export default new AnalyticsService();
