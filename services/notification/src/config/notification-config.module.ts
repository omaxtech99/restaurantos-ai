import { Module } from '@nestjs/common';
import { NotificationConfigService } from './notification-config.service';

@Module({
  providers: [NotificationConfigService],
  exports: [NotificationConfigService],
})
export class NotificationConfigModule {}
