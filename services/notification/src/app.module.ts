import { Module } from '@nestjs/common';
import { NotificationConfigModule } from './config/notification-config.module';
import { HealthController } from './health.controller';
import { EmailWorkerService } from './email-worker.service';
import { MailTransportService } from './mail-transport.service';
import { WhatsAppWorkerService } from './whatsapp-worker.service';
import { WhatsAppTransportService } from './whatsapp-transport.service';

@Module({
  imports: [NotificationConfigModule],
  controllers: [HealthController],
  providers: [MailTransportService, EmailWorkerService, WhatsAppTransportService, WhatsAppWorkerService],
})
export class AppModule {}
