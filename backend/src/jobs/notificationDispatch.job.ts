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
  };
}

notificationDispatchQueue.process(async (job) => {
  const { userId, type, title, message, relatedEntity, channels, metadata } = job.data as NotificationJobData;

  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // 1. In-Platform
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

      // Emit real-time notification via Socket.io (handled globally in server.io context)
      if ((global as any).io) {
        (global as any).io.to(userId).emit('notification', { title, message, type, relatedEntity });
      }
    }

    // 2. Email (SendGrid)
    if (channels.email && user.notificationPreferences?.email) {
      let emailSubject = title;
      let bodyHtml = `<div style="font-family: Arial; padding: 20px;"><h3>${title}</h3><p>${message}</p></div>`;

      if (type === 'TASK_ASSIGNED') {
        bodyHtml = sendgrid.getTaskAssignedTemplate(title, message, new Date(), 'medium', 'I\'m On It Bruh');
      } else if (type === 'HUB_INVITATION' && metadata) {
        bodyHtml = sendgrid.getHackerEarthInviteTemplate(
          metadata.adminName || 'Admin',
          metadata.hubName || 'Workspace',
          metadata.inviteLink || 'http://localhost:3000/dashboard'
        );
      }

      await sendgrid.sendEmail(user.email, emailSubject, bodyHtml);
    }

    // 3. WhatsApp (Mock / Feature-gated)
    if (channels.whatsapp && user.notificationPreferences?.whatsapp && user.whatsappEnabled && user.phoneNumber) {
      await whatsappClient.sendNotification(user.phoneNumber, `${title}: ${message}`);
    }

    return { status: 'success' };
  } catch (error: any) {
    console.error(`[NotificationDispatchJob] Error processing job ${job.id}:`, error);
    throw error;
  }
});
