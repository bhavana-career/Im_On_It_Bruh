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
        <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">I'm On It Bruh &copy; 2026. Execution &amp; Accountability Platform.</p>
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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #E85D04; margin: 0;">I'm On It Bruh</h2>
        </div>
        <div style="text-align: center; background-color: ${isUrgent ? '#fff7ed' : '#f7fafc'}; border: 1px solid ${isUrgent ? '#fed7aa' : '#e2e8f0'}; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <div style="font-size: 36px; margin-bottom: 8px;">${isUrgent ? '⏰' : '📅'}</div>
          <h3 style="color: #1a202c; margin: 0 0 8px 0; font-size: 18px;">${meetingTitle}</h3>
          <p style="color: ${isUrgent ? '#c2410c' : '#4a5568'}; font-weight: bold; font-size: 15px; margin: 0;">
            Starts in <strong>${timeLabel}</strong>
          </p>
          <p style="color: #718096; font-size: 13px; margin: 8px 0 0 0;">Workspace: ${hubName}</p>
        </div>
        <table style="width: 100%; border-collapse: separate; border-spacing: 12px;">
          <tr>
            <td style="width: 50%; text-align: center;">
              <a href="${joinUrl}" style="display: block; background-color: #E85D04; color: white; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
                🚀 Join Meeting
              </a>
            </td>
            <td style="width: 50%; text-align: center;">
              <a href="${messageAdminUrl}" style="display: block; background-color: #f7fafc; color: #4a5568; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; border: 1px solid #e2e8f0;">
                💬 Message Admin
              </a>
            </td>
          </tr>
        </table>
        <p style="color: #a0aec0; font-size: 12px; text-align: center; margin-top: 16px;">
          Can't attend? Click "Message Admin" to notify the meeting host privately.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">I'm On It Bruh &copy; 2026. Execution &amp; Accountability Platform.</p>
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
          <span style="font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 20px; background-color: ${u.bg}; color: ${u.color}; border: 1px solid ${u.border}; text-transform: uppercase; letter-spacing: 0.5px;">${u.label}</span>
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
          <a href="${replyUrl}" style="background-color: #E85D04; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Reply Privately to Admin</a>
        </div>
        <p style="color: #a0aec0; font-size: 12px; text-align: center; margin-top: 12px;">
          Your reply will only be visible to ${adminName}.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">I'm On It Bruh &copy; 2026. Execution &amp; Accountability Platform.</p>
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
        <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">I'm On It Bruh &copy; 2026. Execution &amp; Accountability Platform.</p>
      </div>
    `;
  }
}
