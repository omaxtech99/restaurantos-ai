import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { NotificationConfigService } from './config/notification-config.service';
import { MailTransportService } from './mail-transport.service';

interface EmailJob {
  to: string;
  subject: string;
  template: string;
  payload: Record<string, string>;
}

@Injectable()
export class EmailWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailWorkerService.name);
  private readonly queueKey = 'restaurantos:notifications:email';
  private readonly redis: Redis;
  private running = false;

  constructor(
    private readonly config: NotificationConfigService,
    private readonly mailTransport: MailTransportService,
  ) {
    this.redis = new Redis(this.config.redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.redis.connect();
    this.running = true;
    void this.poll();
    this.logger.log('Email worker started');
  }

  async onModuleDestroy(): Promise<void> {
    this.running = false;
    await this.redis.quit();
  }

  private async poll(): Promise<void> {
    while (this.running) {
      try {
        const result = await this.redis.brpop(this.queueKey, 5);
        if (!result) {
          continue;
        }
        const [, raw] = result;
        const job = JSON.parse(raw) as EmailJob;
        await this.mailTransport.send(job);
        this.logger.log(`Processed email template=${job.template} to=${job.to}`);
      } catch (error) {
        this.logger.error(
          `Email worker failure: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
}
