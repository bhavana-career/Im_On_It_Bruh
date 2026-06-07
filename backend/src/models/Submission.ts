import mongoose, { Schema, Document } from 'mongoose';

export interface IAttachment {
  driveFileId?: string;
  fileName: string;
  mimeType: string;
  url: string; // View link or download URL
}

export interface ISubmission extends Document {
  taskId: mongoose.Types.ObjectId;
  submittedBy: mongoose.Types.ObjectId;
  version: number;
  note: string;
  attachments: IAttachment[];
  driveLinks: string[];
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionFeedback?: string;
  submittedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    version: { type: Number, default: 1 },
    note: { type: String, default: '' },
    attachments: [
      {
        driveFileId: { type: String },
        fileName: { type: String, required: true },
        mimeType: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    driveLinks: [{ type: String }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionFeedback: { type: String },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Submission || mongoose.model<ISubmission>('Submission', SubmissionSchema);
