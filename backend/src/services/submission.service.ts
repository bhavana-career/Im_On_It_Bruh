import Submission from '../models/Submission';
import Task from '../models/Task';
import User from '../models/User';
import HubMembership from '../models/HubMembership';
import AuditLog from '../models/AuditLog';
import { getStorageProvider } from '../providers';
import TaskService from './task.service';
import { notificationDispatchQueue } from '../jobs/queue';

const storage = getStorageProvider();

export class SubmissionService {
  /**
   * Submit work for an assigned task.
   */
  async submitWork(
    taskId: string,
    userId: string,
    note: string,
    files: Array<{ originalname: string; buffer: Buffer; mimetype: string }>,
    driveLinks: string[]
  ) {
    const task = await Task.findById(taskId);
    if (!task) throw new Error('Task not found');
    if (task.status === 'blocked') throw new Error('Cannot submit work for a BLOCKED task');

    // 1. Calculate submission version
    const previousSubmissionsCount = await Submission.countDocuments({ taskId, submittedBy: userId });
    const version = previousSubmissionsCount + 1;

    // 2. Upload file attachments using StorageProvider
    const attachments = [];
    for (const file of files) {
      const folderPath = `hubs/${task.hubId}/tasks/${taskId}/submissions/v${version}`;
      const uploadDetails = await storage.uploadFile(file, folderPath);
      attachments.push({
        driveFileId: uploadDetails.fileId,
        fileName: uploadDetails.fileName,
        mimeType: uploadDetails.mimeType,
        url: uploadDetails.fileUrl,
      });
    }

    // 3. Create Submission record
    const submission = await Submission.create({
      taskId,
      submittedBy: userId,
      version,
      note,
      attachments,
      driveLinks,
      status: 'pending',
      submittedAt: new Date(),
    });

    // 4. Update task status
    task.status = 'pending_review';
    await task.save();

    // 5. Notify Hub Admins
    const submitter = await User.findById(userId);
    const admins = await HubMembership.find({ hubId: task.hubId, role: 'admin', status: 'active' });

    for (const admin of admins) {
      await notificationDispatchQueue.add({
        userId: admin.userId.toString(),
        type: 'SUBMISSION_RECEIVED',
        title: 'New Work Submitted',
        message: `${submitter?.profileName || 'A member'} submitted work for "${task.title}".`,
        relatedEntity: {
          type: 'Submission',
          id: submission._id.toString(),
        },
        channels: {
          platform: true,
          email: false,
          whatsapp: false,
        },
      });
    }

    return submission;
  }

  /**
   * Admin review of submission: Approve.
   */
  async approveSubmission(submissionId: string, adminId: string) {
    const submission = await Submission.findById(submissionId);
    if (!submission) throw new Error('Submission not found');
    if (submission.status !== 'pending') throw new Error('Submission is already reviewed');

    submission.status = 'approved';
    submission.reviewedBy = adminId as any;
    submission.reviewedAt = new Date();
    await submission.save();

    // Update matching task status to completed
    const task = await Task.findById(submission.taskId);
    if (task) {
      task.status = 'completed';
      await task.save();

      // Resolve dependencies for dependent tasks (unblocking them)
      await TaskService.resolveDependencies(task._id.toString());

      // Create AuditLog entry
      await AuditLog.create({
        actorId: adminId,
        hubId: task.hubId,
        action: 'TASK_SUBMISSION_APPROVE',
        targetEntity: {
          type: 'Task',
          id: task._id,
        },
        metadata: {
          submissionId: submission._id,
          assigneeId: task.assigneeId,
        },
      });

      // Notify the member
      await notificationDispatchQueue.add({
        userId: task.assigneeId.toString(),
        type: 'SUBMISSION_APPROVED',
        title: 'Submission Approved!',
        message: `Your submission for "${task.title}" has been approved. Well done!`,
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

    return submission;
  }

  /**
   * Admin review of submission: Reject with feedback.
   */
  async rejectSubmission(submissionId: string, feedback: string, adminId: string) {
    if (!feedback) throw new Error('Rejection feedback is required');

    const submission = await Submission.findById(submissionId);
    if (!submission) throw new Error('Submission not found');
    if (submission.status !== 'pending') throw new Error('Submission is already reviewed');

    submission.status = 'rejected';
    submission.reviewedBy = adminId as any;
    submission.reviewedAt = new Date();
    submission.rejectionFeedback = feedback;
    await submission.save();

    // Update matching task status to revision_required
    const task = await Task.findById(submission.taskId);
    if (task) {
      task.status = 'revision_required';
      await task.save();

      // Create AuditLog entry
      await AuditLog.create({
        actorId: adminId,
        hubId: task.hubId,
        action: 'TASK_SUBMISSION_REJECT',
        targetEntity: {
          type: 'Task',
          id: task._id,
        },
        metadata: {
          submissionId: submission._id,
          feedback,
        },
      });

      // Notify the member
      await notificationDispatchQueue.add({
        userId: task.assigneeId.toString(),
        type: 'SUBMISSION_REJECTED',
        title: 'Revision Required',
        message: `Your submission for "${task.title}" was rejected by the admin. Feedback: "${feedback}"`,
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

    return submission;
  }
}

export default new SubmissionService();
