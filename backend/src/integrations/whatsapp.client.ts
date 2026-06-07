export class WhatsAppClient {
  private isActive = false;

  constructor() {
    this.isActive = process.env.WHATSAPP_INTEGRATION_ACTIVE === 'true';
  }

  async sendNotification(toPhoneNumber: string, message: string): Promise<boolean> {
    if (!this.isActive) {
      console.log(`[WhatsAppClient] (DISABLED) Notification message intended for ${toPhoneNumber}: "${message}"`);
      return true; // Return true as if handled successfully (skipped)
    }

    try {
      console.log(`[WhatsAppClient] (ACTIVE) Sending WhatsApp message to ${toPhoneNumber}: "${message}"`);
      // Future Twilio or WhatsApp Cloud API implementation here
      return true;
    } catch (error) {
      console.error('[WhatsAppClient] Failed to send WhatsApp message:', error);
      return false;
    }
  }
}
