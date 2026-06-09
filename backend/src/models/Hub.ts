import mongoose, { Schema, Document } from 'mongoose';

export interface IHub extends Document {
  name: string;
  description: string;
  profileImageUrl?: string;
  visibility: 'public' | 'private';
  promoCode: string;
  createdBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HubSchema = new Schema<IHub>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    profileImageUrl: { type: String },
    visibility: { type: String, enum: ['public', 'private'], default: 'public' },
    promoCode: { type: String, unique: true, sparse: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Hub || mongoose.model<IHub>('Hub', HubSchema);
