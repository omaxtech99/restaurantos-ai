import { Module } from '@nestjs/common';
import { PublicController } from './presentation/public.controller';
import { PublicService } from './application/public.service';
import { MenuModule } from '../menu/menu.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [MenuModule, OrderModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
