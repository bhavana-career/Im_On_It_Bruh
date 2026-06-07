import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganizationalMemory extends Document {
  hubId: mongoose.Types.ObjectId;
  meetingId?: mongoose.Types.ObjectId;
  summaryContent: string;
  keyDecisions: string[];
  tags: string[];
  approvedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationalMemorySchema = new Schema<IOrganizationalMemory>(
  {
    hubId: { type: Schema.Types.ObjectId, ref: 'Hub', required: true },
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting' },
    summaryContent: { type: String, required: true },
    keyDecisions: [{ type: String }],
    tags: [{ type: String }],
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.models.OrganizationalMemory || mongoose.model<IOrganizationalMemory>('OrganizationalMemory', OrganizationalMemorySchema);
