import mongoose, { Schema, Document } from 'mongoose';

export interface IMeetingParticipant extends Document {
  meetingId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  joinedAt?: Date;
  leftAt?: Date;
  duration: number; // in seconds
  role: 'host' | 'participant';
  absent: boolean;
}

const MeetingParticipantSchema = new Schema<IMeetingParticipant>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date },
    leftAt: { type: Date },
    duration: { type: Number, default: 0 },
    role: { type: String, enum: ['host', 'participant'], default: 'participant' },
    absent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MeetingParticipantSchema.index({ meetingId: 1, userId: 1 }, { unique: true });

export default mongoose.models.MeetingParticipant || mongoose.model<IMeetingParticipant>('MeetingParticipant', MeetingParticipantSchema);
