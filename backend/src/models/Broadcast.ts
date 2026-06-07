import mongoose, { Schema, Document } from 'mongoose';

export interface IBroadcast extends Document {
  hubId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  body: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  attachmentUrl?: string;
  sentAt: Date;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const BroadcastSchema = new Schema<IBroadcast>(
  {
    hubId: { type: Schema.Types.ObjectId, ref: 'Hub', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    attachmentUrl: { type: String },
    sentAt: { type: Date, default: Date.now },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.models.Broadcast || mongoose.model<IBroadcast>('Broadcast', BroadcastSchema);
