import mongoose, { Schema, Document } from 'mongoose';

export interface IMeeting extends Document {
  hubId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  scheduledAt: Date;
  estimatedDuration: number; // in minutes
  status: 'scheduled' | 'active' | 'ended' | 'processing' | 'completed';
  liveKitRoomId?: string;
  recordingUrl?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSchema = new Schema<IMeeting>(
  {
    hubId: { type: Schema.Types.ObjectId, ref: 'Hub', required: true },
    title: { type: String, required: true },
    description: { type: String },
    scheduledAt: { type: Date, required: true },
    estimatedDuration: { type: Number, default: 30 },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'ended', 'processing', 'completed'],
      default: 'scheduled',
    },
    liveKitRoomId: { type: String },
    recordingUrl: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Meeting || mongoose.model<IMeeting>('Meeting', MeetingSchema);
