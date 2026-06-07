import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actorId: mongoose.Types.ObjectId;
  hubId?: mongoose.Types.ObjectId;
  action: string;
  targetEntity: {
    type: string;
    id: mongoose.Types.ObjectId;
  };
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hubId: { type: Schema.Types.ObjectId, ref: 'Hub' },
    action: { type: String, required: true },
    targetEntity: {
      type: { type: String, required: true },
      id: { type: Schema.Types.ObjectId, required: true },
    },
    metadata: { type: Schema.Types.Map, of: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
