import { Module } from '@nestjs/common';
import { NotificationService } from './application/notification.service';

@Module({
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
