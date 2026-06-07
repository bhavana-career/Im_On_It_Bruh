import Task from '../models/Task';
import TaskDependency from '../models/TaskDependency';
import { notificationDispatchQueue } from '../jobs/queue';

export class TaskService {
  /**
   * Resolve dependencies for a completed/approved task.
   * If any dependent tasks are now fully unblocked, transition them from 'blocked' to 'assigned'.
   */
  async resolveDependencies(taskId: string) {
    console.log(`[TaskService] Resolving dependencies for unblocked task: ${taskId}`);

    // Find all dependencies where taskId is the blocker
    const blockingDeps = await TaskDependency.find({ dependsOnTaskId: taskId });
    
    for (const dep of blockingDeps) {
      const dependentTaskId = dep.taskId;

      // Check if this dependent task has any OTHER unresolved dependencies
      const remainingBlockers = await TaskDependency.find({
        taskId: dependentTaskId,
        dependsOnTaskId: { $ne: taskId as any },
      });

      let isFullyUnblocked = true;

      // Double-check if the remaining blockers are indeed not completed yet
      for (const remaining of remainingBlockers) {
        const blockerTask = await Task.findById(remaining.dependsOnTaskId);
        if (blockerTask && blockerTask.status !== 'completed' && blockerTask.status !== 'approved') {
          isFullyUnblocked = false;
          break;
        }
      }

      if (isFullyUnblocked) {
        // Retrieve the dependent task
        const dependentTask = await Task.findById(dependentTaskId);
        if (dependentTask && dependentTask.status === 'blocked') {
          // Unblock the task!
          dependentTask.status = 'assigned';
          await dependentTask.save();

          console.log(`[TaskService] Unblocked task: "${dependentTask.title}" (ID: ${dependentTask._id}) for user: ${dependentTask.assigneeId}`);

          // Notify the assignee
          await notificationDispatchQueue.add({
            userId: dependentTask.assigneeId.toString(),
            type: 'TASK_UNBLOCKED',
            title: 'Task Unblocked',
            message: `Your task "${dependentTask.title}" is now unblocked. You can begin working on it!`,
            relatedEntity: {
              type: 'Task',
              id: dependentTask._id.toString(),
            },
            channels: {
              platform: true,
              email: true,
              whatsapp: false,
            },
          });
        }
      }

      // Delete this dependency link since it is now resolved
      await dep.deleteOne();
    }
  }

  /**
   * Retrieve all tasks for a hub.
   */
  async getHubTasks(hubId: string) {
    const tasks = await Task.find({ hubId, status: { $ne: 'archived' } }).populate('assigneeId', 'profileName email avatarUrl');
    
    // Add dependencies detail to each task
    const tasksWithDeps = [];
    for (const task of tasks) {
      const dependencies = await TaskDependency.find({ taskId: task._id }).populate('dependsOnTaskId', 'title status');
      tasksWithDeps.push({
        ...task.toObject(),
        dependencies: dependencies.map(d => d.dependsOnTaskId),
      });
    }

    return tasksWithDeps;
  }

  /**
   * Retrieve tasks assigned to a specific user in a hub.
   */
  async getUserTasks(userId: string, hubId: string) {
    const tasks = await Task.find({ assigneeId: userId, hubId, status: { $ne: 'archived' } });
    
    const tasksWithDeps = [];
    for (const task of tasks) {
      const dependencies = await TaskDependency.find({ taskId: task._id }).populate('dependsOnTaskId', 'title status');
      tasksWithDeps.push({
        ...task.toObject(),
        dependencies: dependencies.map(d => d.dependsOnTaskId),
      });
    }

    return tasksWithDeps;
  }
}

export default new TaskService();
