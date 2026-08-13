import { Injectable, Logger } from '@nestjs/common';
import { NotificationConfigService } from './config/notification-config.service';

interface WhatsAppJob {
  to: string;
  template: string;
  payload: Record<string, string>;
}

const GRAPH_API_VERSION = 'v19.0';

/**
 * Meta requires business-initiated WhatsApp messages to use a pre-approved
 * template (free-form text only works inside a 24h customer-initiated
 * session window, which doesn't apply here — the restaurant is the one
 * starting the conversation). The template's approved body-variable count
 * and order must match what's configured in Meta Business Manager; this
 * sends the job payload's values, in insertion order, as those variables.
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

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${this.config.whatsappPhoneNumberId}/messages`;

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
          language: { code: 'en_US' },
          components: [
            {
              type: 'body',
              parameters: Object.values(job.payload).map((value) => ({ type: 'text', text: value })),
            },
          ],
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
