import { Module } from '@nestjs/common';
import { PaymentService } from './application/payment.service';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [OrderModule],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
