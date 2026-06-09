import Broadcast from '../models/Broadcast';
import BroadcastReply from '../models/BroadcastReply';
import HubMembership from '../models/HubMembership';
import Hub from '../models/Hub';
import User from '../models/User';
import { notificationDispatchQueue } from '../jobs/queue';

export class BroadcastService {
  /**
   * Send a broadcast to all active members of a hub.
   */
  async sendBroadcast(
    hubId: string,
    title: string,
    body: string,
    urgency: 'low' | 'medium' | 'high' | 'critical',
    adminId: string,
    attachmentUrl?: string
  ) {
    const broadcast = await Broadcast.create({
      hubId,
      createdBy: adminId,
      title,
      body,
      urgency,
      attachmentUrl,
      sentAt: new Date(),
    });

    // Find all hub members
    const members = await HubMembership.find({ hubId, status: 'active' });

    // Fetch hub and admin details for email template
    const hub = await Hub.findById(hubId);
    const admin = await User.findById(adminId);
    const hubName = hub?.name || 'Your Hub';
    const adminName = admin?.profileName || 'Admin';

    // Send notifications to each member (except creator admin)
    for (const member of members) {
      if (member.userId.toString() === adminId) continue;

      await notificationDispatchQueue.add({
        userId: member.userId.toString(),
        type: 'BROADCAST_SENT',
        title: `Broadcast: ${title}`,
        message: body.length > 100 ? `${body.substring(0, 97)}...` : body,
        relatedEntity: { type: 'Broadcast', id: broadcast._id.toString() },
        channels: {
          platform: true,
          email: urgency === 'critical' || urgency === 'high',
          whatsapp: false,
        },
        metadata: {
          adminName,
          hubName,
          broadcastTitle: title,
          broadcastBody: body,
          urgency,
          hubId: hubId.toString(),
          broadcastId: broadcast._id.toString(),
        },
      });
    }

    return broadcast;
  }

  /**
   * Send a private reply to a broadcast.
   */
  async replyToBroadcast(broadcastId: string, memberId: string, message: string) {
    const broadcast = await Broadcast.findById(broadcastId);
    if (!broadcast) throw new Error('Broadcast not found');

    const reply = await BroadcastReply.create({
      broadcastId,
      memberId,
      adminId: broadcast.createdBy,
      message,
    });

    const replier = await User.findById(memberId);
    const hub = await Hub.findById(broadcast.hubId);

    // Notify the admin who created the broadcast
    await notificationDispatchQueue.add({
      userId: broadcast.createdBy.toString(),
      type: 'BROADCAST_REPLY',
      title: 'New Private Reply',
      message: `${replier?.profileName || 'A member'} replied: "${message.substring(0, 50)}"`,
      relatedEntity: { type: 'BroadcastReply', id: reply._id.toString() },
      channels: { platform: true, email: true, whatsapp: false },
      metadata: {
        memberName: replier?.profileName || 'A member',
        broadcastTitle: broadcast.title,
        replyMessage: message,
        hubId: broadcast.hubId.toString(),
        hubName: hub?.name || 'Your Hub',
      },
    });

    return reply;
  }

  /**
   * Get replies for a broadcast (visible to the admin who created the broadcast).
   */
  async getRepliesForAdmin(broadcastId: string, adminId: string) {
    const broadcast = await Broadcast.findById(broadcastId);
    if (!broadcast) throw new Error('Broadcast not found');
    if (broadcast.createdBy.toString() !== adminId) throw new Error('Unauthorized');

    return BroadcastReply.find({ broadcastId })
      .populate('memberId', 'profileName email avatarUrl')
      .sort({ createdAt: -1 });
  }

  /**
   * Get broadcasts for a hub member.
   */
  async getHubBroadcasts(hubId: string) {
    return Broadcast.find({ hubId })
      .populate('createdBy', 'profileName avatarUrl')
      .sort({ sentAt: -1 });
  }
}

export default new BroadcastService();
