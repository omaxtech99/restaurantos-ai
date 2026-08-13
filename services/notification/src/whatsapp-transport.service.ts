import { Injectable, Logger } from '@nestjs/common';
import { NotificationConfigService } from './config/notification-config.service';

interface WhatsAppJob {
  to: string;
  template: string;
  payload: Record<string, string>;
}

/**
 * Meta requires business-initiated WhatsApp messages to use a pre-approved
 * template (free-form text only works inside a 24h customer-initiated
 * session window, which doesn't apply here — the restaurant is the one
 * starting the conversation).
 *
 * The currently-approved template ("Welcome") has no body variables yet, so
 * this sends the template call without a `components` array. The job still
 * carries a full payload (customerName, restaurantName, branchName — see
 * WaitlistService.notifyNextInQueue) for when a variable-taking template is
 * approved: re-add a `components: [{ type: 'body', parameters: [...] }]`
 * block mapping those values in whatever order the new template expects.
 */
@Injectable()
export class WhatsAppTransportService {
  private readonly logger = new Logger(WhatsAppTransportService.name);

  constructor(private readonly config: NotificationConfigService) {}

  async send(job: WhatsAppJob): Promise<void> {
    if (!this.config.whatsappConfigured) {
      this.logger.warn(
        `WhatsApp not configured (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID missing) — ` +
          `skipping send to=${job.to} template=${job.template}. Job payload: ${JSON.stringify(job.payload)}`,
      );
      return;
    }

    const url = `https://graph.facebook.com/${this.config.whatsappGraphVersion}/${this.config.whatsappPhoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.whatsappAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: job.to,
        type: 'template',
        template: {
          name: this.config.whatsappTemplateName,
          language: { code: this.config.whatsappTemplateLanguage },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`WhatsApp send failed (${response.status}): ${body}`);
    }

    this.logger.log(`Sent WhatsApp to=${job.to} template=${job.template}`);
  }
}
