import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { NotificationConfigService } from './config/notification-config.service';
import { WhatsAppTransportService } from './whatsapp-transport.service';

interface WhatsAppJob {
  to: string;
  template: string;
  payload: Record<string, string>;
}

@Injectable()
export class WhatsAppWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppWorkerService.name);
  private readonly queueKey = 'restaurantos:notifications:whatsapp';
  private readonly redis: Redis;
  private running = false;

  constructor(
    private readonly config: NotificationConfigService,
    private readonly whatsappTransport: WhatsAppTransportService,
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
    this.logger.log(
      this.config.whatsappConfigured
        ? 'WhatsApp worker started'
        : 'WhatsApp worker started (WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID not set — jobs will be logged, not sent)',
    );
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
        const job = JSON.parse(raw) as WhatsAppJob;
        await this.whatsappTransport.send(job);
      } catch (error) {
        this.logger.error(
          `WhatsApp worker failure: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
}
