import { Module } from '@nestjs/common';
import { WaitlistController } from './presentation/waitlist.controller';
import { WaitlistService } from './application/waitlist.service';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { NotificationModule } from '../notification/notification.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [AuthModule, RbacModule, NotificationModule, GatewayModule],
  controllers: [WaitlistController],
  providers: [WaitlistService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
