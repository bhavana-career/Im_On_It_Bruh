import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  profileName: string;
  username?: string;
  email: string;
  googleId?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  whatsappEnabled: boolean;
  notificationPreferences: {
    email: boolean;
    whatsapp: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    profileName: { 
      type: String, 
      required: true,
      get: function(val: string) {
        return val || (this as any).username || '';
      }
    },
    username: { type: String },
    email: { type: String, required: true, unique: true, index: true },
    googleId: { type: String },
    avatarUrl: { type: String },
    phoneNumber: { type: String },
    whatsappEnabled: { type: Boolean, default: false },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
    },
  },
  { 
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
