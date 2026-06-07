import User from '../models/User';
import OTPRecord from '../models/OTPRecord';
import jwt from 'jsonwebtoken';
import { SendGridClient } from '../integrations/sendgrid.client';

const sendgrid = new SendGridClient();
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key';
const JWT_EXPIRY = '7d';

export class AuthService {
  /**
   * Generates a 6-digit OTP and sends it via SendGrid.
   */
  async generateOTP(email: string): Promise<string> {
    // Generate a 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = otp; // For simplicity in local development, we keep it plain or simple hash
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save OTP record to database
    await OTPRecord.create({
      email,
      otp: hashedOtp,
      expiresAt,
      used: false,
    });

    // Send the OTP via Email
    const htmlContent = sendgrid.getOtpTemplate(otp);
    await sendgrid.sendEmail(email, "Your I'm On It Bruh Login Code", htmlContent);

    return otp;
  }

  /**
   * Verifies an OTP code.
   */
  async verifyOTP(email: string, code: string): Promise<boolean> {
    const record = await OTPRecord.findOne({
      email,
      otp: code,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return false;
    }

    record.used = true;
    await record.save();
    return true;
  }

  /**
   * Google OAuth login or registration.
   */
  async loginOrRegisterGoogle(payload: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    let user = await User.findOne({ email: payload.email });

    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = payload.googleId;
        if (payload.avatarUrl) user.avatarUrl = payload.avatarUrl;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        profileName: payload.name,
        email: payload.email,
        googleId: payload.googleId,
        avatarUrl: payload.avatarUrl,
        whatsappEnabled: false,
        notificationPreferences: {
          email: true,
          whatsapp: false,
        },
      });
    }

    return user;
  }

  /**
   * Login or register via Email (after OTP verified).
   */
  async loginOrRegisterEmail(email: string, name?: string) {
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        profileName: name || email.split('@')[0],
        email,
        whatsappEnabled: false,
        notificationPreferences: {
          email: true,
          whatsapp: false,
        },
      });
    }

    return user;
  }

  /**
   * Issue JWT token.
   */
  issueToken(user: any): string {
    return jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        name: user.profileName,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
  }

  /**
   * Verify JWT token.
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
}
export default new AuthService();
