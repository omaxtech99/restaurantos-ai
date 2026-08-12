import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@restaurantos/shared';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/presentation/permissions.guard';
import { RequirePermissions } from '../../rbac/presentation/permissions.decorator';
import type { AuthenticatedRequest } from '../../auth/domain/authenticated-request';
import { OrderService } from '../application/order.service';
import {
  AddOrderItemsDto,
  CreateOrderDto,
  ListOrdersQueryDto,
  UpdateOrderStatusDto,
} from './order.dto';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'orders', version: '1' })
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @RequirePermissions(PERMISSIONS.ORDER_READ)
  @Get()
  list(@Query() query: ListOrdersQueryDto, @Req() req: AuthenticatedRequest) {
    return this.orderService.listOrders(req.user!.tenantId, query);
  }

  @RequirePermissions(PERMISSIONS.ORDER_READ)
  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthenticatedRequest) {
    return this.orderService.getOrder(req.user!.tenantId, id);
  }

  @RequirePermissions(PERMISSIONS.ORDER_MANAGE)
  @Post()
  create(@Body() body: CreateOrderDto, @Req() req: AuthenticatedRequest) {
    return this.orderService.createOrder(req.user!.tenantId, body);
  }

  @RequirePermissions(PERMISSIONS.ORDER_MANAGE)
  @Post(':id/items')
  addItems(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AddOrderItemsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.orderService.addItems(req.user!.tenantId, id, body);
  }

  @RequirePermissions(PERMISSIONS.ORDER_MANAGE)
  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateOrderStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.orderService.updateStatus(req.user!.tenantId, id, body.status);
  }
}
