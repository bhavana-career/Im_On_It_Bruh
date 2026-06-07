import mongoose, { Schema, Document } from 'mongoose';

export interface IBroadcastReply extends Document {
  broadcastId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId; // The admin who received this private reply
  message: string;
  createdAt: Date;
}

const BroadcastReplySchema = new Schema<IBroadcastReply>(
  {
    broadcastId: { type: Schema.Types.ObjectId, ref: 'Broadcast', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.BroadcastReply || mongoose.model<IBroadcastReply>('BroadcastReply', BroadcastReplySchema);
