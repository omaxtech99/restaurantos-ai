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
}
