import sgMail from '@sendgrid/mail';

const apiKey = process.env.SENDGRID_API_KEY || '';
const emailFrom = process.env.EMAIL_FROM || 'imonit.notifications@gmail.com';

if (apiKey && apiKey.startsWith('SG.')) {
  sgMail.setApiKey(apiKey);
} else {
  console.warn('[SendGridClient] SENDGRID_API_KEY is not defined or invalid. Emails will be logged to console instead.');
}

export class SendGridClient {
  async sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    const msg = {
      to,
      from: emailFrom,
      subject,
      html: htmlContent,
    };

    console.log(`[SendGridClient] Sending Email to ${to}: "${subject}"`);

    if (!apiKey || !apiKey.startsWith('SG.')) {
      console.log('--- HTML Email Content START ---');
      console.log(htmlContent);
      console.log('--- HTML Email Content END ---');
      return true;
    }

    try {
      await sgMail.send(msg);
      console.log(`[SendGridClient] Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error('[SendGridClient] SendGrid failed to send email:', error);
      return false;
    }
  }

  /**
   * Generates email template HTML.
   */
  getOtpTemplate(otp: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #E85D04; margin: 0;">I'm On It Bruh</h2>
        </div>
        <p>Hello,</p>
        <p>Use the following 6-digit One-Time Password (OTP) to log in to your account. This code is valid for 10 minutes:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1a202c; background-color: #f7fafc; padding: 10px 20px; border-radius: 4px; border: 1px solid #e2e8f0;">${otp}</span>
        </div>
        <p>If you did not request this, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #a0aec0; text-align: center;">I'm On It Bruh &copy; 2026. Execution & Accountability Platform.</p>
      </div>
    `;
  }

  getTaskAssignedTemplate(taskTitle: string, description: string, deadline: Date, priority: string, hubName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #E85D04; text-align: center;">New Task Assigned!</h2>
        <p>You have been assigned a new task in Hub: <strong>${hubName}</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; width: 30%;">Task Title:</td>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7;">${taskTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold;">Description:</td>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7;">${description || 'No description provided.'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold;">Priority:</td>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7;"><span style="text-transform: uppercase; font-size: 12px; font-weight: bold;">${priority}</span></td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold;">Deadline:</td>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #dd6b20; font-weight: bold;">${new Date(deadline).toLocaleString()}</td>
          </tr>
        </table>
        <div style="text-align: center; margin-top: 30px;">
          <a href="http://localhost:3000/dashboard" style="background-color: #E85D04; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Task in Dashboard</a>
        </div>
      </div>
    `;
  }

  getHackerEarthInviteTemplate(adminName: string, hubName: string, inviteLink: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #333333; border-radius: 16px; background-color: #0b0c10; color: #f5f5f5;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #ff4d00; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">I'm On It Bruh</h2>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #e2e8f0; margin-top: 0;">Hi there,</p>
        <p style="font-size: 15px; line-height: 1.6; color: #e2e8f0;">
          <strong>${adminName}</strong> has invited you to join the <strong>${hubName}</strong> team space on I'm On It Bruh.
        </p>
        <div style="background-color: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
          <p style="font-size: 14px; font-style: italic; color: #8b949e; margin-top: 0; margin-bottom: 20px;">
            "We would love to have you as a key part of our community. Join our team space to host live meeting rooms, track task dependencies, and collaborate on deliverables."
          </p>
          <a href="${inviteLink}" style="display: inline-block; background-color: #ff4d00; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(255, 77, 0, 0.25);">
            Join Team
          </a>
        </div>
        <p style="font-size: 13px; line-height: 1.5; color: #8b949e; margin-bottom: 0;">
          <em>Note:</em> After clicking the button, you will be prompted to log in or create an account. Once authenticated, your workspace request will be marked as pending until approved by the administrator.
        </p>
        <hr style="border: 0; border-top: 1px solid #21262d; margin: 24px 0;" />
        <p style="font-size: 11px; color: #8b949e; text-align: center; margin: 0;">
          I'm On It Bruh &copy; 2026. Execution & Accountability Platform.
        </p>
      </div>
    `;
  }
}
