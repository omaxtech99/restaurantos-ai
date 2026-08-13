import { Module } from '@nestjs/common';
import { PublicController } from './presentation/public.controller';
import { PublicService } from './application/public.service';
import { MenuModule } from '../menu/menu.module';
import { OrderModule } from '../order/order.module';
import { GatewayModule } from '../gateway/gateway.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [MenuModule, OrderModule, GatewayModule, PaymentModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
