import { Module } from '@nestjs/common';
import { OrderController } from './presentation/order.controller';
import { OrderService } from './application/order.service';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [AuthModule, RbacModule, GatewayModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
