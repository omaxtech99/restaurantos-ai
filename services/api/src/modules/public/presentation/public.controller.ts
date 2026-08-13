import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicService } from '../application/public.service';
import { AddOrderItemsDto } from '../../order/presentation/order.dto';

@ApiTags('public')
@Controller({ path: 'public', version: '1' })
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('tables/:tableId')
  getTable(@Param('tableId', new ParseUUIDPipe()) tableId: string) {
    return this.publicService.getTableContext(tableId);
  }

  @Post('tables/:tableId/orders')
  createOrder(
    @Param('tableId', new ParseUUIDPipe()) tableId: string,
    @Body() body: AddOrderItemsDto,
  ) {
    return this.publicService.createOrder(tableId, body);
  }

  @Get('orders/:orderId')
  getOrder(@Param('orderId', new ParseUUIDPipe()) orderId: string) {
    return this.publicService.getOrder(orderId);
  }

  @Post('tables/:tableId/call-waiter')
  callWaiter(@Param('tableId', new ParseUUIDPipe()) tableId: string) {
    return this.publicService.callWaiter(tableId);
  }
}
