import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  hubId: mongoose.Types.ObjectId;
  meetingId?: mongoose.Types.ObjectId;
  aiReviewId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  assigneeId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  deadline: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'assigned' | 'blocked' | 'in_progress' | 'pending_review' | 'revision_required' | 'approved' | 'completed' | 'overdue' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    hubId: { type: Schema.Types.ObjectId, ref: 'Hub', required: true },
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting' },
    aiReviewId: { type: Schema.Types.ObjectId, ref: 'AIArtifact' },
    title: { type: String, required: true },
    description: { type: String },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deadline: { type: Date, required: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: [
        'assigned',
        'blocked',
        'in_progress',
        'pending_review',
        'revision_required',
        'approved',
        'completed',
        'overdue',
        'archived',
      ],
      default: 'assigned',
    },
  },
  { timestamps: true }
);

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
