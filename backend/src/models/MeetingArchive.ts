import mongoose, { Schema, Document } from 'mongoose';

export interface IMeetingArchive extends Document {
  hubId: mongoose.Types.ObjectId;
  meetingId: mongoose.Types.ObjectId;
  meetingTitle: string;
  scheduledAt: Date;
  summary: string;
  discussionTopics: string[];
  decisions: string[];
  approvedAssignments: {
    title: string;
    assigneeName: string;
    deadline: Date;
    priority: string;
  }[];
  approvedBy: mongoose.Types.ObjectId; // admin who approved
  createdAt: Date;
}

const MeetingArchiveSchema = new Schema<IMeetingArchive>({
  hubId: { type: Schema.Types.ObjectId, ref: 'Hub', required: true, index: true },
  meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true },
  meetingTitle: { type: String, required: true },
  scheduledAt: { type: Date },
  summary: { type: String, required: true },
  discussionTopics: [{ type: String }],
  decisions: [{ type: String }],
  approvedAssignments: [{
    title: { type: String },
    assigneeName: { type: String },
    deadline: { type: Date },
    priority: { type: String },
  }],
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model<IMeetingArchive>('MeetingArchive', MeetingArchiveSchema);
