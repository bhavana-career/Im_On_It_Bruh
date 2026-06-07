import Notification from '../models/Notification';

export class NotificationService {
  async getUserNotifications(userId: string) {
    return Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
  }

  async markAsRead(notificationId: string, userId: string) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );
  }

  async markAllAsRead(userId: string) {
    return Notification.updateMany({ userId, isRead: false }, { isRead: true });
  }
}

export default new NotificationService();
