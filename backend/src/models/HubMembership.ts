import mongoose, { Schema, Document } from 'mongoose';

export interface IHubMembership extends Document {
  hubId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: 'admin' | 'member';
  joinedAt: Date;
  status: 'active' | 'removed' | 'pending' | 'invited' | 'revoked';
  inviteMethod: 'email' | 'link' | 'code' | 'direct';
}

const HubMembershipSchema = new Schema<IHubMembership>(
  {
    hubId: { type: Schema.Types.ObjectId, ref: 'Hub', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'removed', 'pending', 'invited', 'revoked'], default: 'active' },
    inviteMethod: { type: String, enum: ['email', 'link', 'code', 'direct'], default: 'direct' },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness of user membership per hub
HubMembershipSchema.index({ hubId: 1, userId: 1 }, { unique: true });

export default mongoose.models.HubMembership || mongoose.model<IHubMembership>('HubMembership', HubMembershipSchema);
