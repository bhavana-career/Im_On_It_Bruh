import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  relatedEntity?: {
    type: string;
    id: mongoose.Types.ObjectId;
  };
  channels: {
    platform: boolean;
    email: boolean;
    whatsapp: boolean;
  };
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedEntity: {
      type: { type: String },
      id: { type: Schema.Types.ObjectId },
    },
    channels: {
      platform: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
