import mongoose, { Schema, Document } from 'mongoose';

export interface IOTPRecord extends Document {
  email: string;
  otp: string; // Hashed OTP
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const OTPRecordSchema = new Schema<IOTPRecord>(
  {
    email: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL index to automatically expire records after expiresAt
OTPRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.OTPRecord || mongoose.model<IOTPRecord>('OTPRecord', OTPRecordSchema);
