import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { AppLogger } from '../../logger/app-logger.service';

export interface EmailJob {
  to: string;
  subject: string;
  template: 'email-verification' | 'password-reset';
  payload: Record<string, string>;
}

@Injectable()
export class NotificationService {
  private readonly queueKey = 'restaurantos:notifications:email';

  constructor(
    private readonly redisService: RedisService,
    private readonly logger: AppLogger,
  ) {}

  async enqueueEmail(job: EmailJob): Promise<void> {
    await this.redisService.connect();
    await this.redisService.redis.lpush(this.queueKey, JSON.stringify(job));
    this.logger.log(`Queued email template=${job.template} to=${job.to}`, 'NotificationService');
  }
}
