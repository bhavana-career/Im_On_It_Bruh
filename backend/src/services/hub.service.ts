import Hub from '../models/Hub';
import HubMembership from '../models/HubMembership';
import User from '../models/User';
import { notificationDispatchQueue } from '../jobs/queue';

/**
 * Generates a unique 6-character alphanumeric promo code.
 * Uses unambiguous characters (no 0/O, 1/I) for easy readability.
 */
const generatePromoCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

export class HubService {
  /**
   * Create a new hub. Creator is automatically admin.
   */
  async createHub(creatorId: string, name: string, description: string, visibility: 'public' | 'private', profileImageUrl?: string) {
    // Generate unique promo code with collision retry
    let promoCode = '';
    let attempts = 0;
    while (attempts < 10) {
      const candidate = generatePromoCode();
      const exists = await Hub.findOne({ promoCode: candidate });
      if (!exists) { promoCode = candidate; break; }
      attempts++;
    }

    const hub = await Hub.create({
      name,
      description,
      profileImageUrl,
      visibility,
      promoCode,
      createdBy: creatorId,
    });

    // Create HubMembership for creator as admin
    await HubMembership.create({
      hubId: hub._id,
      userId: creatorId,
      role: 'admin',
      inviteMethod: 'direct',
    });

    return hub;
  }

  /**
   * Get all public hubs not joined by user yet (Recommendations).
   */
  async getRecommendations(userId: string) {
    // Find hubs user is already member of
    const memberships = await HubMembership.find({ userId, status: 'active' });
    const joinedHubIds = memberships.map((m) => m.hubId);

    // Find public hubs not joined
    const publicHubs = await Hub.find({
      visibility: 'public',
      isDeleted: false,
      _id: { $nin: joinedHubIds },
    }).populate('createdBy', 'profileName email avatarUrl');

    // For each hub, get member count
    const recommendations = [];
    for (const hub of publicHubs) {
      const memberCount = await HubMembership.countDocuments({ hubId: hub._id, status: 'active' });
      recommendations.push({
        ...hub.toObject(),
        memberCount,
      });
    }

    return recommendations;
  }

  /**
   * Get all hubs where user has admin role.
   */
  async getAdminHubs(userId: string) {
    const memberships = await HubMembership.find({ userId, role: 'admin', status: 'active' }).populate('hubId');
    const activeMemberships = memberships.filter((m) => m.hubId && !(m.hubId as any).isDeleted);
    
    const hubs = [];
    for (const membership of activeMemberships) {
      const hub = membership.hubId as any;
      const memberCount = await HubMembership.countDocuments({ hubId: hub._id, status: 'active' });
      hubs.push({
        ...hub.toObject(),
        memberCount,
      });
    }
    return hubs;
  }

  /**
   * Get all hubs where user has member role.
   */
  async getMemberHubs(userId: string) {
    // Find hubs where user is admin so we can exclude them
    const adminMemberships = await HubMembership.find({ userId, role: 'admin', status: 'active' }).select('hubId');
    const adminHubIds = new Set(adminMemberships.map((m) => m.hubId.toString()));

    const memberships = await HubMembership.find({ userId, role: 'member', status: 'active' }).populate('hubId');
    const activeMemberships = memberships.filter(
      (m) => m.hubId && !(m.hubId as any).isDeleted && !adminHubIds.has((m.hubId as any)._id.toString())
    );

    const hubs = [];
    for (const membership of activeMemberships) {
      const hub = membership.hubId as any;
      const memberCount = await HubMembership.countDocuments({ hubId: hub._id, status: 'active' });
      hubs.push({
        ...hub.toObject(),
        memberCount,
      });
    }
    return hubs;
  }

  /**
   * Join a hub immediately if public, or create request if private.
   */
  async joinHub(userId: string, hubId: string, inviteMethod: 'link' | 'code' | 'direct' | 'email' = 'direct') {
    const hub = await Hub.findById(hubId);
    if (!hub || hub.isDeleted) {
      throw new Error('Hub not found');
    }

    const isApprovalRequired = hub.visibility === 'private';

    // Check if membership already exists
    const existingMembership = await HubMembership.findOne({ hubId, userId });
    if (existingMembership) {
      if (existingMembership.status === 'active') {
        return existingMembership;
      }
      // If it was removed or invited/pending, we handle reactivation based on approval requirements
      if (!isApprovalRequired) {
        existingMembership.status = 'active';
        existingMembership.joinedAt = new Date();
        existingMembership.inviteMethod = inviteMethod;
        await existingMembership.save();
        return existingMembership;
      } else {
        // Needs approval: set to pending and wait for admin approval
        existingMembership.status = 'pending';
        existingMembership.joinedAt = new Date();
        existingMembership.inviteMethod = inviteMethod;
        await existingMembership.save();
        return existingMembership;
      }
    }

    if (!isApprovalRequired) {
      const membership = await HubMembership.create({
        hubId,
        userId,
        role: 'member',
        status: 'active',
        inviteMethod,
      });

      // Notify admin of new join
      const adminMemberships = await HubMembership.find({ hubId, role: 'admin', status: 'active' });
      const user = await User.findById(userId);
      
      for (const admin of adminMemberships) {
        await notificationDispatchQueue.add({
          userId: admin.userId.toString(),
          type: 'MEMBER_JOINED',
          title: 'New Member Joined',
          message: `${user?.profileName || 'A user'} joined your hub "${hub.name}".`,
          relatedEntity: {
            type: 'Hub',
            id: hub._id.toString(),
          },
          channels: {
            platform: true,
            email: false,
            whatsapp: false,
          },
        });
      }

      return membership;
    } else {
      // Approval required: Create a membership record in 'pending' status
      const user = await User.findById(userId);
      const adminMemberships = await HubMembership.find({ hubId, role: 'admin', status: 'active' });

      const pendingMembership = await HubMembership.create({
        hubId,
        userId,
        role: 'member',
        status: 'pending',
        inviteMethod,
      });

      for (const admin of adminMemberships) {
        await notificationDispatchQueue.add({
          userId: admin.userId.toString(),
          type: 'JOIN_REQUEST',
          title: 'Join Request',
          message: `${user?.profileName || 'A user'} wants to join your hub "${hub.name}".`,
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

      return pendingMembership;
    }
  }

  /**
   * Invite user via Email.
   */
  async inviteUserByEmail(hubId: string, email: string, adminId: string) {
    const hub = await Hub.findById(hubId);
    if (!hub) throw new Error('Hub not found');

    let user = await User.findOne({ email });
    if (!user) {
      // Create user placeholder
      user = await User.create({
        profileName: email.split('@')[0],
        email,
        whatsappEnabled: false,
        notificationPreferences: { email: true, whatsapp: false },
      });
    }

    // Add to membership
    const existingMembership = await HubMembership.findOne({ hubId, userId: user._id });
    if (existingMembership && existingMembership.status === 'active') {
      throw new Error('User is already a member');
    }

    if (existingMembership) {
      existingMembership.status = 'invited';
      existingMembership.inviteMethod = 'email';
      await existingMembership.save();
    } else {
      await HubMembership.create({
        hubId,
        userId: user._id,
        role: 'member',
        status: 'invited',
        inviteMethod: 'email',
      });
    }

    // Fetch admin details for custom email naming
    const admin = await User.findById(adminId);
    const adminName = admin?.profileName || 'An Administrator';
    const frontendUrl = process.env.NEXTAUTH_URL || 'https://im-on-it-bruh.vercel.app';
    const inviteLink = `${frontendUrl}/auth?redirect=/dashboard/member/${hub._id}`;

    // Send invitation email with HackerEarth custom templates
    await notificationDispatchQueue.add({
      userId: user._id.toString(),
      type: 'HUB_INVITATION',
      title: 'Hub Invitation',
      message: `${adminName} has invited you to join their team "${hub.name}" on I'm On It Bruh! Click here to enter your dashboard: ${inviteLink}`,
      relatedEntity: {
        type: 'Hub',
        id: hub._id.toString(),
      },
      channels: {
        platform: true,
        email: true,
        whatsapp: false,
      },
      metadata: {
        adminName,
        hubName: hub.name,
        inviteLink,
      },
    });

    return user;
  }

  /**
   * Revoke invitation or request.
   */
  async revokeInvitation(hubId: string, userId: string) {
    const result = await HubMembership.deleteOne({ hubId, userId, status: { $in: ['invited', 'pending'] } });
    if (result.deletedCount === 0) {
      throw new Error('Invitation or request not found');
    }
    return { success: true };
  }

  /**
   * Resend invitation.
   */
  async resendInvitation(hubId: string, userId: string, adminId: string) {
    const hub = await Hub.findById(hubId);
    if (!hub) throw new Error('Hub not found');

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const membership = await HubMembership.findOne({ hubId, userId, status: 'invited' });
    if (!membership) throw new Error('No active invitation found for this user');

    const admin = await User.findById(adminId);
    const adminName = admin?.profileName || 'An Administrator';
    const frontendUrl = process.env.NEXTAUTH_URL || 'https://im-on-it-bruh.vercel.app';
    const inviteLink = `${frontendUrl}/auth?redirect=/dashboard/member/${hub._id}`;

    await notificationDispatchQueue.add({
      userId: user._id.toString(),
      type: 'HUB_INVITATION',
      title: 'Hub Invitation Reminder',
      message: `Reminder: ${adminName} has invited you to join their team "${hub.name}" on I'm On It Bruh! Click here to enter your dashboard: ${inviteLink}`,
      relatedEntity: {
        type: 'Hub',
        id: hub._id.toString(),
      },
      channels: {
        platform: true,
        email: true,
        whatsapp: false,
      },
      metadata: {
        adminName,
        hubName: hub.name,
        inviteLink,
      },
    });

    return { success: true };
  }

  /**
   * Approve pending join request or invitation click.
   */
  async approveJoinRequest(hubId: string, userId: string) {
    const membership = await HubMembership.findOne({ hubId, userId, status: { $in: ['pending', 'invited'] } });
    if (!membership) throw new Error('Pending request or invitation not found');

    membership.status = 'active';
    membership.joinedAt = new Date();
    await membership.save();

    // Notify user of approval
    await notificationDispatchQueue.add({
      userId: userId.toString(),
      type: 'REQUEST_APPROVED',
      title: 'Join Request Approved',
      message: `Your request to join the hub has been approved. You now have full access!`,
      relatedEntity: {
        type: 'Hub',
        id: hubId,
      },
      channels: {
        platform: true,
        email: true,
        whatsapp: false,
      },
    });

    return membership;
  }

  /**
   * Reject pending join request.
   */
  async rejectJoinRequest(hubId: string, userId: string) {
    const membership = await HubMembership.findOne({ hubId, userId, status: { $in: ['pending', 'invited'] } });
    if (!membership) throw new Error('Pending request or invitation not found');

    membership.status = 'removed';
    await membership.save();

    return membership;
  }

  /**
   * Promote member to Admin.
   */
  async promoteToAdmin(hubId: string, userId: string) {
    const membership = await HubMembership.findOne({ hubId, userId });
    if (!membership) throw new Error('Membership not found');

    membership.role = 'admin';
    await membership.save();

    await notificationDispatchQueue.add({
      userId,
      type: 'ROLE_PROMOTED',
      title: 'Promoted to Admin',
      message: `You have been promoted to Admin in hub.`,
      relatedEntity: {
        type: 'Hub',
        id: hubId,
      },
      channels: {
        platform: true,
        email: true,
        whatsapp: false,
      },
    });

    return membership;
  }

  /**
   * Remove member (silently — no notification to keep feelings intact).
   */
  async removeMember(hubId: string, userId: string) {
    const membership = await HubMembership.findOne({ hubId, userId });
    if (!membership) throw new Error('Membership not found');

    membership.status = 'removed';
    await membership.save();

    return membership;
  }

  /**
   * Update hub name and description.
   */
  async updateHub(hubId: string, adminId: string, name?: string, description?: string) {
    const membership = await HubMembership.findOne({ hubId, userId: adminId, role: 'admin', status: 'active' });
    if (!membership) {
      throw new Error('Only administrators can update the hub details');
    }

    const hub = await Hub.findById(hubId);
    if (!hub || hub.isDeleted) {
      throw new Error('Hub not found');
    }

    if (name) hub.name = name;
    if (description !== undefined) hub.description = description;

    await hub.save();
    return hub;
  }
  /**
   * Find a hub by promo code and join it.
   * Public hubs: auto-join immediately.
   * Private hubs: creates a pending request for admin approval.
   */
  async joinByPromoCode(userId: string, promoCode: string) {
    const hub = await Hub.findOne({ promoCode: promoCode.toUpperCase().trim() });
    if (!hub || hub.isDeleted) {
      throw new Error('Invalid promo code. Please check and try again.');
    }

    return this.joinHub(userId, hub._id.toString(), 'code');
  }

  /**
   * Delete a hub.
   * If there is only 1 admin: deletes immediately.
   * If there are 2+ admins: throws an error with admin count so the
   * frontend can start a 2-of-3 voting flow via HubActionRequest.
   */
  async deleteHub(hubId: string, requesterId: string) {
    const requesterMembership = await HubMembership.findOne({ hubId, userId: requesterId, role: 'admin', status: 'active' });
    if (!requesterMembership) throw new Error('Only admins can delete a hub');

    const adminCount = await HubMembership.countDocuments({ hubId, role: 'admin', status: 'active' });
    if (adminCount > 1) {
      throw new Error(`MULTI_ADMIN:${adminCount}`);
    }

    const hub = await Hub.findById(hubId);
    if (!hub || hub.isDeleted) throw new Error('Hub not found');
    hub.isDeleted = true;
    await hub.save();
    return { deleted: true };
  }

  /**
   * Toggle hub visibility (public <-> private).
   * Single admin: changes immediately.
   * Multiple admins: throws MULTI_ADMIN error so frontend starts voting.
   */
  async updateVisibility(hubId: string, requesterId: string, visibility: 'public' | 'private') {
    const requesterMembership = await HubMembership.findOne({ hubId, userId: requesterId, role: 'admin', status: 'active' });
    if (!requesterMembership) throw new Error('Only admins can change visibility');

    const adminCount = await HubMembership.countDocuments({ hubId, role: 'admin', status: 'active' });
    if (adminCount > 1) {
      throw new Error(`MULTI_ADMIN:${adminCount}`);
    }

    const hub = await Hub.findById(hubId);
    if (!hub || hub.isDeleted) throw new Error('Hub not found');
    hub.visibility = visibility;
    await hub.save();
    return hub;
  }

  /**
   * Promote a member to admin within a hub.
   * Only existing admins of the same hub can promote members.
   */
  async promoteMember(hubId: string, promoterId: string, targetUserId: string) {
    const promoterMembership = await HubMembership.findOne({ hubId, userId: promoterId, role: 'admin', status: 'active' });
    if (!promoterMembership) throw new Error('Only admins can promote members');

    const targetMembership = await HubMembership.findOne({ hubId, userId: targetUserId, status: 'active' });
    if (!targetMembership) throw new Error('User is not an active member of this hub');

    targetMembership.role = 'admin';
    await targetMembership.save();
    return targetMembership;
  }
}

export default new HubService();
