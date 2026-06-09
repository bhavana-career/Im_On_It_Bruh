import express, { Response } from 'express';
import multer from 'multer';
import { AuthenticatedRequest, authMiddleware } from '../../middleware/auth.middleware';
import AuthService from '../../services/auth.service';
import HubService from '../../services/hub.service';
import MeetingService from '../../services/meeting.service';
import ReviewService from '../../services/review.service';
import TaskService from '../../services/task.service';
import SubmissionService from '../../services/submission.service';
import BroadcastService from '../../services/broadcast.service';
import NotificationService from '../../services/notification.service';
import CalendarService from '../../services/calendar.service';
import AnalyticsService from '../../services/analytics.service';
import AIArtifact from '../../models/AIArtifact';
import Task from '../../models/Task';
import User from '../../models/User';
import HubMembership from '../../models/HubMembership';
import Hub from '../../models/Hub';
import MeetingArchive from '../../models/MeetingArchive';
import { notificationDispatchQueue } from '../../jobs/queue';
import { getStorageProvider } from '../../providers';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// --------------------------------------------------------
// AUTH ENDPOINTS (/api/v1/auth)
// --------------------------------------------------------

router.post('/auth/otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const code = await AuthService.generateOTP(email);
    res.json({ message: 'OTP sent successfully', debugCode: code }); // debugCode helps testing
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/auth/verify', async (req, res) => {
  const { email, code, name } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and OTP code are required' });

  try {
    const isValid = await AuthService.verifyOTP(email, code);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' });
    }

    const user = await AuthService.loginOrRegisterEmail(email, name);
    const token = AuthService.issueToken(user);

    res.json({ user, token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/auth/google', async (req, res) => {
  const { googleId, email, name, avatarUrl } = req.body;
  if (!email || !googleId || !name) {
    return res.status(400).json({ error: 'Google details (googleId, email, name) are required' });
  }

  try {
    const user = await AuthService.loginOrRegisterGoogle({ googleId, email, name, avatarUrl });
    const token = AuthService.issueToken(user);
    res.json({ user, token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------------------------------------------
// USER ENDPOINTS (/api/v1/users)
// --------------------------------------------------------

router.get('/users/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await User.findById(req.user!.id);
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { profileName, phoneNumber, whatsappEnabled } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { profileName, phoneNumber, whatsappEnabled },
      { new: true }
    );
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------------------------------------------
// HUB ENDPOINTS (/api/v1/hubs)
// --------------------------------------------------------

router.post('/hubs', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { name, description, visibility, profileImageUrl } = req.body;
  if (!name || !description || !visibility) {
    return res.status(400).json({ error: 'Name, description, and visibility are required' });
  }

  try {
    const hub = await HubService.createHub(req.user!.id, name, description, visibility, profileImageUrl);
    res.json(hub);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/hubs/recommendations', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const hubs = await HubService.getRecommendations(req.user!.id);
    res.json(hubs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/hubs/admin', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const hubs = await HubService.getAdminHubs(req.user!.id);
    res.json(hubs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/hubs/member', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const hubs = await HubService.getMemberHubs(req.user!.id);
    res.json(hubs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Join hub by promo code — must be before /:hubId routes
router.post('/hubs/join-by-promo', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { promoCode } = req.body;
  if (!promoCode) return res.status(400).json({ error: 'Promo code is required' });
  try {
    const membership = await HubService.joinByPromoCode(req.user!.id, promoCode);
    res.json(membership);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/hubs/:hubId/join', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { inviteMethod } = req.body;
    const result = await HubService.joinHub(req.user!.id, req.params.hubId, inviteMethod);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/hubs/:hubId/invite', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await HubService.inviteUserByEmail(req.params.hubId, email, req.user!.id);
    res.json({ message: 'User invited successfully', user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/hubs/:hubId/promote/:userId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const membership = await HubService.promoteToAdmin(req.params.hubId, req.params.userId);
    res.json(membership);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/hubs/:hubId/remove/:userId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { hubId, userId } = req.params;
    const requesterId = req.user!.id;

    // Verify permission: requester must be admin of the hub OR the user itself (leaving)
    const isSelf = requesterId === userId;
    const isAdmin = await HubMembership.findOne({ hubId, userId: requesterId, role: 'admin', status: 'active' });

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to remove this member or leave the hub' });
    }

    const membership = await HubService.removeMember(hubId, userId);
    res.json(membership);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/hubs/:hubId/members-directory', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const memberships = await HubMembership.find({ hubId: req.params.hubId }).populate('userId', 'profileName email avatarUrl');
    
    // Categorize memberships by status
    const active = memberships.filter((m) => m.status === 'active');
    const pending = memberships.filter((m) => m.status === 'pending');
    const invited = memberships.filter((m) => m.status === 'invited');
    
    res.json({ active, pending, invited });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/hubs/:hubId/membership-status', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { hubId } = req.params;
    const userId = req.user!.id;

    const hub = await Hub.findById(hubId);
    if (!hub || hub.isDeleted) {
      return res.status(404).json({ error: 'Hub not found' });
    }

    let membership = await HubMembership.findOne({ hubId, userId });

    // Transition from invited to pending if they try to enter
    if (membership && membership.status === 'invited') {
      membership.status = 'pending';
      membership.joinedAt = new Date();
      await membership.save();

      // Notify admin of the transition to pending join request
      const adminMemberships = await HubMembership.find({ hubId, role: 'admin', status: 'active' });
      const user = await User.findById(userId);

      for (const admin of adminMemberships) {
        await notificationDispatchQueue.add({
          userId: admin.userId.toString(),
          type: 'JOIN_REQUEST',
          title: 'Join Request',
          message: `${user?.profileName || 'A user'} wants to join your private hub "${hub.name}".`,
          relatedEntity: {
            type: 'User',
            id: userId,
          },
          channels: {
            platform: true,
            email: true,
            whatsapp: false,
          },
        });
      }
    }

    res.json({
      status: membership ? membership.status : 'none',
      role: membership ? membership.role : null,
      visibility: hub.visibility,
      name: hub.name,
      profileImageUrl: hub.profileImageUrl,
      description: hub.description,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/hubs/:hubId/avatar', authMiddleware, upload.single('avatar'), async (req: AuthenticatedRequest, res) => {
  const { hubId } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'Avatar file is required' });
  }

  try {
    // Check if the user is an admin of the hub
    const membership = await HubMembership.findOne({ hubId, userId: req.user!.id, role: 'admin', status: 'active' });
    if (!membership) {
      return res.status(403).json({ error: 'Only administrators can change the hub avatar' });
    }

    const hub = await Hub.findById(hubId);
    if (!hub || hub.isDeleted) {
      return res.status(404).json({ error: 'Hub not found' });
    }

    // Upload to storage provider
    const storageProvider = getStorageProvider();
    const folderPath = `hubs/${hubId}`;
    const uploadDetails = await storageProvider.uploadFile(file, folderPath);

    // Save URL to database
    hub.profileImageUrl = uploadDetails.fileUrl;
    await hub.save();

    res.json(hub);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/hubs/:hubId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { hubId } = req.params;
  const { name, description } = req.body;

  try {
    const hub = await HubService.updateHub(hubId, req.user!.id, name, description);
    res.json(hub);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete hub (single admin: instant; multi-admin: returns MULTI_ADMIN signal)
router.delete('/hubs/:hubId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await HubService.deleteHub(req.params.hubId, req.user!.id);
    res.json(result);
  } catch (error: any) {
    if (error.message.startsWith('MULTI_ADMIN:')) {
      const adminCount = parseInt(error.message.split(':')[1]);
      return res.status(409).json({ error: 'MULTI_ADMIN', adminCount });
    }
    res.status(400).json({ error: error.message });
  }
});

// Update hub visibility
router.put('/hubs/:hubId/visibility', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { visibility } = req.body;
  if (!visibility || !['public', 'private'].includes(visibility)) {
    return res.status(400).json({ error: 'visibility must be "public" or "private"' });
  }
  try {
    const hub = await HubService.updateVisibility(req.params.hubId, req.user!.id, visibility);
    res.json(hub);
  } catch (error: any) {
    if (error.message.startsWith('MULTI_ADMIN:')) {
      const adminCount = parseInt(error.message.split(':')[1]);
      return res.status(409).json({ error: 'MULTI_ADMIN', adminCount });
    }
    res.status(400).json({ error: error.message });
  }
});

// Promote member to admin (replaces old promoteToAdmin route)
router.put('/hubs/:hubId/promote-member/:userId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const membership = await HubService.promoteMember(req.params.hubId, req.user!.id, req.params.userId);
    res.json(membership);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/hubs/:hubId/invite/revoke/:userId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await HubService.revokeInvitation(req.params.hubId, req.params.userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/hubs/:hubId/invite/resend/:userId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await HubService.resendInvitation(req.params.hubId, req.params.userId, req.user!.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/hubs/:hubId/requests/approve/:userId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const membership = await HubService.approveJoinRequest(req.params.hubId, req.params.userId);
    res.json(membership);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/hubs/:hubId/requests/reject/:userId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const membership = await HubService.rejectJoinRequest(req.params.hubId, req.params.userId);
    res.json(membership);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------------------------------------------
// MEETING ENDPOINTS (/api/v1/meetings)
// --------------------------------------------------------

router.get('/meetings', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const meetings = await MeetingService.getAllMeetings();
    res.json(meetings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/meetings', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { hubId, title, description, scheduledAt, estimatedDuration } = req.body;
  if (!hubId || !title || !scheduledAt) {
    return res.status(400).json({ error: 'HubId, title, and scheduledAt are required' });
  }

  try {
    const meeting = await MeetingService.scheduleMeeting(
      hubId,
      title,
      description,
      new Date(scheduledAt),
      estimatedDuration || 30,
      req.user!.id
    );
    res.json(meeting);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/meetings/:meetingId/join', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await MeetingService.startMeeting(req.params.meetingId, req.user!.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/meetings/:meetingId/end', authMiddleware, upload.single('audio'), async (req: AuthenticatedRequest, res) => {
  try {
    let recordingUrl = undefined;
    if (req.file) {
      console.log(`[Router] Received meeting audio recording file: ${req.file.originalname} (${req.file.size} bytes)`);
      const storageProvider = getStorageProvider();
      const folderPath = `meetings/${req.params.meetingId}`;
      const uploadDetails = await storageProvider.uploadFile(req.file, folderPath);
      recordingUrl = uploadDetails.fileUrl;
      console.log(`[Router] Uploaded meeting recording to: ${recordingUrl}`);
    }

    const meeting = await MeetingService.endMeeting(req.params.meetingId, recordingUrl);
    res.json(meeting);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------------------------------------------
// REVIEW ENDPOINTS (/api/v1/review)
// --------------------------------------------------------

router.get('/review/pending/:meetingId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const artifact = await AIArtifact.findOne({ meetingId: req.params.meetingId, status: 'pending' });
    if (!artifact) return res.status(404).json({ error: 'Pending review artifact not found' });
    res.json(artifact);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/review/:artifactId/approve', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await ReviewService.approveAndDistribute(req.params.artifactId, req.body, req.user!.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------------------------------------------
// TASK ENDPOINTS (/api/v1/tasks)
// --------------------------------------------------------

router.get('/tasks/hub/:hubId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const tasks = await TaskService.getHubTasks(req.params.hubId);
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tasks/user/:hubId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const tasks = await TaskService.getUserTasks(req.user!.id, req.params.hubId);
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update task deadline (admin only; deadline must be in the future)
router.patch('/tasks/:taskId/deadline', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { deadline } = req.body;
  if (!deadline) return res.status(400).json({ error: 'deadline is required' });

  try {
    const task = await (await import('../../models/Task')).default.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const now = new Date();
    const currentDeadline = task.deadline ? new Date(task.deadline) : null;
    const newDeadline = new Date(deadline);

    // Rule: if the existing deadline has already passed, it CANNOT be edited
    if (currentDeadline && currentDeadline < now) {
      return res.status(400).json({
        error: 'This deadline has already passed and cannot be changed.',
        code: 'DEADLINE_EXPIRED',
      });
    }

    // Rule: the new deadline must be in the future
    if (newDeadline <= now) {
      return res.status(400).json({
        error: 'New deadline must be in the future.',
        code: 'DEADLINE_MUST_BE_FUTURE',
      });
    }

    task.deadline = newDeadline;
    await task.save();
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------------------------------------------
// SUBMISSION ENDPOINTS (/api/v1/submissions)
// --------------------------------------------------------

router.post('/submissions/:taskId', authMiddleware, upload.array('attachments'), async (req: AuthenticatedRequest, res) => {
  const { note, driveLinks } = req.body;
  const files = req.files as Express.Multer.File[];

  try {
    const parsedDriveLinks = driveLinks ? (typeof driveLinks === 'string' ? JSON.parse(driveLinks) : driveLinks) : [];
    const submission = await SubmissionService.submitWork(
      req.params.taskId,
      req.user!.id,
      note || '',
      files || [],
      parsedDriveLinks
    );
    res.json(submission);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/submissions/:submissionId/approve', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const submission = await SubmissionService.approveSubmission(req.params.submissionId, req.user!.id);
    res.json(submission);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/submissions/:submissionId/reject', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { feedback } = req.body;
  try {
    const submission = await SubmissionService.rejectSubmission(req.params.submissionId, feedback, req.user!.id);
    res.json(submission);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------------------------------------------
// BROADCAST ENDPOINTS (/api/v1/broadcasts)
// --------------------------------------------------------

router.post('/broadcasts', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { hubId, title, body, urgency, attachmentUrl } = req.body;
  if (!hubId || !title || !body) {
    return res.status(400).json({ error: 'HubId, title, and body are required' });
  }

  try {
    const broadcast = await BroadcastService.sendBroadcast(
      hubId,
      title,
      body,
      urgency || 'medium',
      req.user!.id,
      attachmentUrl
    );
    res.json(broadcast);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/broadcasts/:broadcastId/reply', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message reply is required' });

  try {
    const reply = await BroadcastService.replyToBroadcast(req.params.broadcastId, req.user!.id, message);
    res.json(reply);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/broadcasts/:broadcastId/replies', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const replies = await BroadcastService.getRepliesForAdmin(req.params.broadcastId, req.user!.id);
    res.json(replies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/broadcasts/hub/:hubId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const broadcasts = await BroadcastService.getHubBroadcasts(req.params.hubId);
    res.json(broadcasts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------------------------------------------
// NOTIFICATION ENDPOINTS (/api/v1/notifications)
// --------------------------------------------------------

router.get('/notifications', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const notifications = await NotificationService.getUserNotifications(req.user!.id);
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/notifications/:notificationId/read', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.notificationId, req.user!.id);
    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/notifications/read-all', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    await NotificationService.markAllAsRead(req.user!.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------------------------------------------
// CALENDAR ENDPOINTS (/api/v1/calendar)
// --------------------------------------------------------

router.get('/calendar/:hubId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const events = await CalendarService.getHubCalendarEvents(req.params.hubId, req.user!.id);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------------------------------------------
// ANALYTICS ENDPOINTS (/api/v1/analytics)
// --------------------------------------------------------

router.get('/analytics/:hubId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const analytics = await AnalyticsService.getHubAnalytics(req.params.hubId);
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------------------------------------------
// MEETING ARCHIVE ENDPOINTS (/api/v1/hubs/:hubId/archive)
// --------------------------------------------------------

// Set or update the archive PIN for a hub (admin only)
router.post('/hubs/:hubId/archive/set-pin', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { pin } = req.body;
  if (!pin || !/^[0-9]{4,6}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be 4–6 digits.' });
  }
  try {
    const adminCheck = await HubMembership.findOne({ hubId: req.params.hubId, userId: req.user!.id, role: 'admin', status: 'active' });
    if (!adminCheck) return res.status(403).json({ error: 'Only admins can set the archive PIN.' });

    const hub = await Hub.findById(req.params.hubId).select('+archivePin');
    if (!hub) return res.status(404).json({ error: 'Hub not found' });

    hub.archivePin = await bcrypt.hash(pin, 12);
    await hub.save();
    res.json({ success: true, message: 'Archive PIN set successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify PIN and get a short-lived archive access token
router.post('/hubs/:hubId/archive/verify-pin', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN is required.' });
  try {
    const hub = await Hub.findById(req.params.hubId).select('+archivePin');
    if (!hub) return res.status(404).json({ error: 'Hub not found' });

    if (!hub.archivePin) {
      return res.status(400).json({ error: 'NO_PIN_SET', message: 'No archive PIN has been set yet. Please set one first.' });
    }

    const isMatch = await bcrypt.compare(pin.toString(), hub.archivePin);
    if (!isMatch) return res.status(401).json({ error: 'Incorrect PIN.' });

    // Issue a short-lived archive token (30 min)
    const archiveToken = jwt.sign(
      { hubId: req.params.hubId, userId: req.user!.id, purpose: 'archive' },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '30m' }
    );
    res.json({ archiveToken });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get archive entries for a hub (requires archive token)
router.get('/hubs/:hubId/archive', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const archiveToken = req.headers['x-archive-token'] as string;
  if (!archiveToken) return res.status(401).json({ error: 'Archive access token required.' });

  try {
    const decoded = jwt.verify(archiveToken, process.env.NEXTAUTH_SECRET || 'fallback-secret') as any;
    if (decoded.hubId !== req.params.hubId || decoded.purpose !== 'archive') {
      return res.status(401).json({ error: 'Invalid archive token.' });
    }

    const entries = await MeetingArchive.find({ hubId: req.params.hubId }).sort({ createdAt: -1 });
    res.json(entries);
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Archive session expired. Please verify PIN again.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Check if archive PIN is set for a hub
router.get('/hubs/:hubId/archive/status', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const hub = await Hub.findById(req.params.hubId).select('+archivePin');
    if (!hub) return res.status(404).json({ error: 'Hub not found' });
    res.json({ pinSet: !!hub.archivePin });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
