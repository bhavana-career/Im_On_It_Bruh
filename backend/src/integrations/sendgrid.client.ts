import sgMail from '@sendgrid/mail';

const apiKey = process.env.SENDGRID_API_KEY || '';
// EMAIL_FROM must be a verified sender in SendGrid (either domain or single sender)
// Gmail addresses won't work unless verified in SendGrid dashboard
const emailFrom = process.env.EMAIL_FROM || 'noreply@imonitbruh.app';

if (apiKey && apiKey.startsWith('SG.')) {
  sgMail.setApiKey(apiKey);
} else {
  console.warn('[SendGridClient] SENDGRID_API_KEY is not defined or invalid. Emails will be logged to console instead.');
}

interface EmailAttachment {
  content: string;
  filename: string;
  type: string;
  disposition: 'attachment';
}

interface MeetingInviteAttachmentInput {
  meetingTitle: string;
  description?: string;
  scheduledAtIso: string;
  estimatedDurationMinutes: number;
  location?: string;
}

export class SendGridClient {
  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    attachments?: EmailAttachment[]
  ): Promise<boolean> {
    const msg = {
      to,
      from: emailFrom,
      subject,
      html: htmlContent,
      attachments,
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
    } catch (error: any) {
      // Log the full SendGrid error body for debugging
      const errBody = error?.response?.body ? JSON.stringify(error.response.body) : error?.message;
      console.error('[SendGridClient] SendGrid failed to send email. Details:', errBody);
      return false;
    }
  }

  buildMeetingInviteAttachment(input: MeetingInviteAttachmentInput): EmailAttachment {
    const start = new Date(input.scheduledAtIso);
    const end = new Date(start.getTime() + input.estimatedDurationMinutes * 60 * 1000);
    const uid = `${start.getTime()}-${input.meetingTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}@imonitbruh`;
    const description = (input.description || '').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const location = (input.location || '').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const formatDate = (value: Date) => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ImOnItBruh//Meeting Invite//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:${input.meetingTitle}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    return {
      content: Buffer.from(ics, 'utf8').toString('base64'),
      filename: 'meeting-invite.ics',
      type: 'text/calendar',
      disposition: 'attachment',
    };
  }

  /**
   * Generates email template HTML.
   */
  getOtpTemplate(otp: string): string {
    // Professional, accessible, mobile-friendly OTP template
    return `
      <div style="font-family: Arial, sans-serif; max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
        <div style="text-align:center;margin-bottom:18px;">
          <h1 style="margin:0;color:#E85D04;font-size:20px;">I'm On It Bruh</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#475569;">Execution &amp; Accountability Platform</p>
        </div>

        <div style="background:#ffffff;border:1px solid #e6edf3;border-radius:8px;padding:18px;">
          <p style="font-size:14px;color:#0f172a;margin:0 0 12px;">Hello,</p>
          <p style="font-size:14px;color:#334155;margin:0 0 18px;">Use the verification code below to sign in to your I'm On It Bruh account. This code will expire in <strong>10 minutes</strong>.</p>

          <div style="text-align:center;margin:18px 0;">
            <span style="display:inline-block;font-size:28px;letter-spacing:6px;padding:12px 18px;border-radius:6px;background:#f8fafc;border:1px solid #e6edf3;font-weight:700;">${otp}</span>
          </div>

          <p style="font-size:13px;color:#6b7280;margin:0 0 10px;">If you did not request this code, please ignore this email or contact <a href="mailto:support@imonitbruh.app">support@imonitbruh.app</a>.</p>

          <hr style="border:0;border-top:1px solid #eef2f7;margin:16px 0;" />

          <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center;">I'm On It Bruh &copy; ${new Date().getFullYear()}. This message was sent to you for account verification.</p>
        </div>
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
          <a href="${inviteLink}" style="display: inline-block; background-color: #ff4d00; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
            Join Team
          </a>
        </div>
        <p style="font-size: 13px; line-height: 1.5; color: #8b949e; margin-bottom: 0;">
          <em>Note:</em> After clicking the button, you will be prompted to log in or create an account. Once authenticated, your workspace request will be marked as pending until approved by the workspace admin.
        </p>
        <hr style="border: 0; border-top: 1px solid #21262d; margin: 24px 0;" />
        <p style="font-size: 11px; color: #8b949e; text-align: center; margin: 0;">I'm On It Bruh &copy; ${new Date().getFullYear()}. Execution &amp; Accountability Platform.</p>
      </div>
    `;
  }

  getMeetingScheduledTemplate(
    meetingTitle: string,
    hubName: string,
    scheduledAt: string,
    description: string,
    dashboardUrl: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #E85D04; margin: 0;">I'm On It Bruh</h2>
        </div>
        <p style="color: #4a5568;">Hello,</p>
        <p style="color: #4a5568;">A new meeting has been scheduled in the <strong style="color: #1a202c;">${hubName}</strong> workspace.</p>
        <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; width: 30%; color: #718096; font-size: 13px;">Meeting</td>
              <td style="padding: 8px 12px; color: #1a202c; font-weight: bold; font-size: 14px;">${meetingTitle}</td>
            </tr>
            <tr style="border-top: 1px solid #e2e8f0;">
              <td style="padding: 8px 12px; font-weight: bold; color: #718096; font-size: 13px;">Workspace</td>
              <td style="padding: 8px 12px; color: #1a202c; font-size: 13px;">${hubName}</td>
            </tr>
            <tr style="border-top: 1px solid #e2e8f0;">
              <td style="padding: 8px 12px; font-weight: bold; color: #718096; font-size: 13px;">Scheduled At</td>
              <td style="padding: 8px 12px; color: #E85D04; font-weight: bold; font-size: 13px;">${scheduledAt}</td>
            </tr>
            ${description ? `
            <tr style="border-top: 1px solid #e2e8f0;">
              <td style="padding: 8px 12px; font-weight: bold; color: #718096; font-size: 13px; vertical-align: top;">Details</td>
              <td style="padding: 8px 12px; color: #4a5568; font-size: 13px; line-height: 1.5;">${description}</td>
            </tr>` : ''}
          </table>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${dashboardUrl}" style="background-color: #E85D04; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">View in Dashboard</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">I'm On It Bruh &copy; ${new Date().getFullYear()}. Execution &amp; Accountability Platform.</p>
      </div>
    `;
  }

  getMeetingReminderTemplate(
    meetingTitle: string,
    hubName: string,
    timeLabel: string,
    joinUrl: string,
    messageAdminUrl: string
  ): string {
    const isUrgent = timeLabel === '15 minutes';
    return `
      <div style="font-family: Arial, sans-serif; max-width:640px;margin:0 auto;padding:20px;">
        <div style="text-align:center;">
          <h2 style="margin:0;color:#0f172a;">Meeting Reminder</h2>
          <p style="margin:6px 0 14px;color:#475569;">${hubName}</p>
        </div>

        <div style="background:#fff;border:1px solid #e6edf3;border-radius:8px;padding:18px;">
          <h3 style="margin:0 0 10px;font-size:16px;color:#0f172a;">${meetingTitle}</h3>
          <p style="margin:0 0 12px;color:#334155;">This meeting is starting <strong>${timeLabel}</strong>.</p>
          <p style="margin:0 0 14px;color:#6b7280;">Click the button below to join the meeting or view details in the dashboard.</p>

          <div style="text-align:center;margin:16px 0;">
            <a href="${joinUrl}" style="display:inline-block;background:#E85D04;color:white;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600;">View Meeting / Join</a>
          </div>

          <p style="font-size:12px;color:#9ca3af;margin:0;">You may also add this to your calendar using the attached .ics file.</p>
        </div>

        <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:12px;">If you have any questions, contact <a href="mailto:support@imonitbruh.app">support@imonitbruh.app</a>.</p>
      </div>
    `;
  }

  getBroadcastTemplate(
    adminName: string,
    hubName: string,
    broadcastTitle: string,
    broadcastBody: string,
    urgency: string,
    replyUrl: string
  ): string {
    const urgencyConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
      critical: { color: '#DC2626', bg: '#fef2f2', border: '#fecaca', label: '🔴 CRITICAL' },
      high:     { color: '#E85D04', bg: '#fff7ed', border: '#fed7aa', label: '🟠 HIGH'     },
      medium:   { color: '#D97706', bg: '#fffbeb', border: '#fde68a', label: '🟡 MEDIUM'   },
      low:      { color: '#059669', bg: '#f0fdf4', border: '#a7f3d0', label: '🟢 LOW'      },
    };
    const u = urgencyConfig[urgency] || urgencyConfig.medium;
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #E85D04; margin: 0;">I'm On It Bruh</h2>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <span style="font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 20px; background-color: ${u.bg}; color: ${u.color}; border: 1px solid ${u.border}; text-transform: uppercase; font-size: 12px;">${u.label}</span>
          <span style="font-size: 12px; color: #718096;">from ${hubName}</span>
        </div>
        <p style="color: #4a5568; font-size: 14px; margin: 0 0 8px 0;">
          <strong style="color: #1a202c;">${adminName}</strong> sent an announcement to your workspace:
        </p>
        <div style="background-color: #f7fafc; border-left: 4px solid #E85D04; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 16px 0;">
          <h3 style="color: #1a202c; margin: 0 0 10px 0; font-size: 16px;">${broadcastTitle}</h3>
          <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0;">${broadcastBody}</p>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${replyUrl}" style="background-color: #E85D04; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Reply Privately</a>
        </div>
        <p style="color: #a0aec0; font-size: 12px; text-align: center; margin-top: 12px;">Your reply will only be visible to ${adminName}.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">I'm On It Bruh &copy; ${new Date().getFullYear()}. Execution &amp; Accountability Platform.</p>
      </div>
    `;
  }

  getBroadcastReplyTemplate(
    memberName: string,
    broadcastTitle: string,
    replyMessage: string,
    viewRepliesUrl: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #E85D04; margin: 0;">I'm On It Bruh</h2>
        </div>
        <p style="color: #4a5568;">Hello,</p>
        <p style="color: #4a5568;">
          <strong style="color: #1a202c;">${memberName}</strong> replied to your announcement: <strong style="color: #1a202c;">${broadcastTitle}</strong>
        </p>
        <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 16px 0; position: relative;">
          <div style="font-size: 28px; color: #e2e8f0; line-height: 1; margin-bottom: 4px;">&ldquo;</div>
          <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">${replyMessage}</p>
        </div>
        <p style="color: #718096; font-size: 13px;">This reply is private — only you can see it.</p>
        <div style="text-align: center; margin-top: 20px;">
          <a href="${viewRepliesUrl}" style="background-color: #E85D04; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">View All Replies</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">I'm On It Bruh &copy; ${new Date().getFullYear()}. Execution &amp; Accountability Platform.</p>
      </div>
    `;
  }
}
