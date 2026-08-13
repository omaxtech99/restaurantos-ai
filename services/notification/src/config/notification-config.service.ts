import { Injectable } from '@nestjs/common';
import { notificationEnvSchema, parseEnv, type NotificationEnv } from '@restaurantos/config';

@Injectable()
export class NotificationConfigService {
  private readonly env: NotificationEnv;

  constructor() {
    this.env = parseEnv(notificationEnvSchema);
  }

  get port(): number {
    return this.env.NOTIFICATION_PORT;
  }

  get redisUrl(): string {
    return this.env.REDIS_URL;
  }

  get smtpUrl(): string {
    return this.env.SMTP_URL;
  }

  get emailFrom(): string {
    return this.env.EMAIL_FROM;
  }

  get whatsappAccessToken(): string | undefined {
    return this.env.WHATSAPP_ACCESS_TOKEN;
  }

  get whatsappPhoneNumberId(): string | undefined {
    return this.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  get whatsappTemplateName(): string {
    return this.env.WHATSAPP_TEMPLATE_NAME ?? 'hello_world';
  }

  get whatsappTemplateLanguage(): string {
    return this.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'en_US';
  }

  get whatsappGraphVersion(): string {
    return this.env.WHATSAPP_GRAPH_VERSION ?? 'v20.0';
  }

  get whatsappConfigured(): boolean {
    return Boolean(this.env.WHATSAPP_ACCESS_TOKEN && this.env.WHATSAPP_PHONE_NUMBER_ID);
  }
}
