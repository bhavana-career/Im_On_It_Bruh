import Meeting from '../models/Meeting';
import Task from '../models/Task';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  color: 'blue' | 'orange' | 'green';
  type: 'meeting' | 'task_deadline' | 'task_completed';
  url?: string;
}

export class CalendarService {
  /**
   * Get calendar events for a specific user and hub.
   */
  async getHubCalendarEvents(hubId: string, userId?: string): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    // 1. Fetch Meetings (blue)
    const meetings = await Meeting.find({ hubId, status: { $ne: 'ended' } });
    for (const m of meetings) {
      const end = new Date(m.scheduledAt.getTime() + m.estimatedDuration * 60 * 1000);
      events.push({
        id: `meeting-${m._id}`,
        title: `Meeting: ${m.title}`,
        start: m.scheduledAt,
        end,
        color: 'blue',
        type: 'meeting',
        url: `/dashboard/member/${hubId}/meetings`,
      });
    }

    // 2. Fetch Tasks assigned to user or all hub tasks depending on role (orange for pending/assigned, green for completed)
    const query: any = { hubId, status: { $ne: 'archived' } };
    if (userId) {
      // If userId is passed, filter to user-specific tasks
      query.assigneeId = userId;
    }

    const tasks = await Task.find(query);
    for (const t of tasks) {
      const isCompleted = t.status === 'completed' || t.status === 'approved';
      events.push({
        id: `task-${t._id}`,
        title: `Task: ${t.title}`,
        start: t.deadline,
        color: isCompleted ? 'green' : 'orange',
        type: isCompleted ? 'task_completed' : 'task_deadline',
        url: `/dashboard/member/${hubId}/tasks`,
      });
    }

    return events;
  }
}

export default new CalendarService();
