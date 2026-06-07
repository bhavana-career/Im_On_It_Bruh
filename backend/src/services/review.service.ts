import AIArtifact from '../models/AIArtifact';
import Task from '../models/Task';
import TaskDependency from '../models/TaskDependency';
import User from '../models/User';
import OrganizationalMemory from '../models/OrganizationalMemory';
import AuditLog from '../models/AuditLog';
import Meeting from '../models/Meeting';
import HubMembership from '../models/HubMembership';
import { GoogleCalendarClient } from '../integrations/googleCalendar.client';
import { notificationDispatchQueue } from '../jobs/queue';

const googleCalendar = new GoogleCalendarClient();

export interface TaskAssignmentEdit {
  title: string;
  description: string;
  assigneeEmail: string;
  deadline: string; // ISO String
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependsOnTitle?: string; // Edit-time blocker task description title
}

export interface ReviewApprovalPayload {
  summary: string;
  discussionTopics: string[];
  decisions: string[];
  outcomes: string[];
  assignments: TaskAssignmentEdit[];
}

export class ReviewService {
  /**
   * Approve and distribute AI meeting draft. Creates tasks, dependencies, calendar sync, memory, audit logs.
   */
  async approveAndDistribute(artifactId: string, payload: ReviewApprovalPayload, adminId: string) {
    const artifact = await AIArtifact.findById(artifactId);
    if (!artifact) throw new Error('AIArtifact not found');
    if (artifact.status === 'approved') throw new Error('AIArtifact is already approved');

    // 1. Update AIArtifact details and mark approved
    artifact.summary = payload.summary;
    artifact.discussionTopics = payload.discussionTopics;
    artifact.decisions = payload.decisions;
    artifact.outcomes = payload.outcomes;
    artifact.status = 'approved';
    artifact.approvedBy = adminId as any;
    artifact.approvedAt = new Date();
    await artifact.save();

    // Create a dictionary to keep track of created tasks by title,
    // so we can set up dependency references when they link to each other.
    const createdTasksMap = new Map<string, any>();

    // First pass: Create all tasks.
    // If a task depends on another task in the same meeting list, we'll initialize it in 'assigned' or 'blocked' status
    // depending on whether it has dependencies. We'll set the status in the second pass.
    for (const assignment of payload.assignments) {
      const assigneeUser = await User.findOne({ email: assignment.assigneeEmail });
      if (!assigneeUser) {
        console.warn(`[ReviewService] User with email ${assignment.assigneeEmail} not found. Skipping assignment.`);
        continue;
      }

      const task = await Task.create({
        hubId: artifact.hubId,
        meetingId: artifact.meetingId,
        aiReviewId: artifact._id,
        title: assignment.title,
        description: assignment.description,
        assigneeId: assigneeUser._id,
        createdBy: adminId,
        deadline: new Date(assignment.deadline),
        priority: assignment.priority,
        status: 'assigned', // Initial state
      });

      createdTasksMap.set(assignment.title.trim().toLowerCase(), task);
      createdTasksMap.set(assignment.description.trim().toLowerCase(), task); // Map both for fuzzy match
    }

    // Second pass: Setup task dependencies, adjust statuses, sync calendars, and send notifications
    for (const assignment of payload.assignments) {
      const currentTask = createdTasksMap.get(assignment.title.trim().toLowerCase());
      if (!currentTask) continue;

      let isBlocked = false;

      if (assignment.dependsOnTitle) {
        const blockerTitle = assignment.dependsOnTitle.trim().toLowerCase();
        // Look up blocker task
        let blockerTask = createdTasksMap.get(blockerTitle);
        
        // If not found in the newly created tasks, try to find an existing active task in the database for the same hub
        if (!blockerTask) {
          blockerTask = await Task.findOne({
            hubId: artifact.hubId,
            $or: [{ title: assignment.dependsOnTitle }, { description: assignment.dependsOnTitle }],
            status: { $ne: 'completed' },
          });
        }

        if (blockerTask) {
          // Create TaskDependency
          await TaskDependency.create({
            taskId: currentTask._id,
            dependsOnTaskId: blockerTask._id,
            hubId: artifact.hubId,
          });

          // Set status to blocked since it has an active blocker
          currentTask.status = 'blocked';
          await currentTask.save();
          isBlocked = true;
        }
      }

      // Sync with Google Calendar
      try {
        const assignee = await User.findById(currentTask.assigneeId);
        if (assignee && assignee.email) {
          await googleCalendar.createTaskDeadlineEvent(
            {
              title: currentTask.title,
              description: currentTask.description,
              deadline: currentTask.deadline,
            },
            assignee.email
          );
        }
      } catch (err) {
        console.error(`[ReviewService] Failed to sync task ${currentTask._id} to Calendar:`, err);
      }

      // Dispatch notification
      const notifyType = isBlocked ? 'TASK_BLOCKED_PENDING' : 'TASK_ASSIGNED';
      const notifyMsg = isBlocked
        ? `Task "${currentTask.title}" has been assigned to you, but is currently BLOCKED pending completion of dependencies.`
        : `You have been assigned a new task: "${currentTask.title}". Deadline: ${new Date(currentTask.deadline).toLocaleString()}`;

      await notificationDispatchQueue.add({
        userId: currentTask.assigneeId.toString(),
        type: notifyType,
        title: isBlocked ? 'New Blocked Task' : 'New Task Assigned',
        message: notifyMsg,
        relatedEntity: {
          type: 'Task',
          id: currentTask._id.toString(),
        },
        channels: {
          platform: true,
          email: true,
          whatsapp: false,
        },
      });
    }

    // 3. Create OrganizationalMemory
    const memory = await OrganizationalMemory.create({
      hubId: artifact.hubId,
      meetingId: artifact.meetingId,
      summaryContent: payload.summary,
      keyDecisions: payload.decisions,
      tags: ['meeting-summary', ...payload.discussionTopics],
      approvedBy: adminId,
    });

    // 4. Create AuditLog entry
    await AuditLog.create({
      actorId: adminId,
      hubId: artifact.hubId,
      action: 'MEETING_REVIEW_APPROVE',
      targetEntity: {
        type: 'AIArtifact',
        id: artifact._id,
      },
      metadata: {
        tasksCount: payload.assignments.length,
        memoryId: memory._id,
      },
    });

    return {
      status: 'success',
      tasksCreatedCount: createdTasksMap.size / 2, // half since we mapped twice
      memoryId: memory._id,
    };
  }
}

export default new ReviewService();
