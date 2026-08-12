import { Module } from '@nestjs/common';
import { EventsGateway } from './presentation/events.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [EventsGateway],
})
export class GatewayModule {}
