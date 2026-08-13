import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { AppLogger } from '../../logger/app-logger.service';

export interface EmailJob {
  to: string;
  subject: string;
  template: 'email-verification' | 'password-reset';
  payload: Record<string, string>;
}

export interface WhatsAppJob {
  to: string;
  template: 'table-ready';
  payload: Record<string, string>;
}

@Injectable()
export class NotificationService {
  private readonly emailQueueKey = 'restaurantos:notifications:email';
  private readonly whatsappQueueKey = 'restaurantos:notifications:whatsapp';

  constructor(
    private readonly redisService: RedisService,
    private readonly logger: AppLogger,
  ) {}

  async enqueueEmail(job: EmailJob): Promise<void> {
    await this.redisService.connect();
    await this.redisService.redis.lpush(this.emailQueueKey, JSON.stringify(job));
    this.logger.log(`Queued email template=${job.template} to=${job.to}`, 'NotificationService');
  }

  async enqueueWhatsApp(job: WhatsAppJob): Promise<void> {
    await this.redisService.connect();
    await this.redisService.redis.lpush(this.whatsappQueueKey, JSON.stringify(job));
    this.logger.log(`Queued WhatsApp template=${job.template} to=${job.to}`, 'NotificationService');
  }
}
