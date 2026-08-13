import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AddOrderItemsRequest,
  CallWaiterResponse,
  OrderWithItems,
  PublicTableContext,
} from '@restaurantos/types';
import { PrismaService } from '../../database/prisma.service';
import { MenuService } from '../../menu/application/menu.service';
import { OrderService } from '../../order/application/order.service';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../gateway/presentation/events.gateway';

const WAITER_CALL_COOLDOWN_SECONDS = 300;

@Injectable()
export class PublicService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly menuService: MenuService,
    private readonly orderService: OrderService,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async getTableContext(tableId: string): Promise<PublicTableContext> {
    const table = await this.prismaService.prisma.table.findFirst({
      where: { id: tableId, deletedAt: null },
      include: { branch: true, tenant: true },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    const categories = await this.menuService.listCategories(table.tenantId);
    const availableCategories = categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => item.isAvailable),
      }))
      .filter((category) => category.items.length > 0);

    return {
      table: {
        id: table.id,
        label: table.label,
        branchName: table.branch.name,
        restaurantName: table.tenant.name,
      },
      categories: availableCategories,
    };
  }

  async createOrder(tableId: string, input: AddOrderItemsRequest): Promise<OrderWithItems> {
    const table = await this.prismaService.prisma.table.findFirst({
      where: { id: tableId, deletedAt: null },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return this.orderService.createOrder(table.tenantId, {
      tableId,
      items: input.items,
    });
  }

  async getOrder(orderId: string): Promise<OrderWithItems> {
    return this.orderService.getOrderForCustomer(orderId);
  }

  /**
   * Unauthenticated, table-scoped "call waiter" ping. Rate limited via Redis
   * (not just client-side) so the button can't be spammed even by someone
   * calling the endpoint directly instead of clicking through the UI.
   */
  async callWaiter(tableId: string): Promise<CallWaiterResponse> {
    const table = await this.prismaService.prisma.table.findFirst({
      where: { id: tableId, deletedAt: null },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    await this.redisService.connect();
    const cooldownKey = `waiter-call:${tableId}`;
    const acquired = await this.redisService.redis.set(
      cooldownKey,
      '1',
      'EX',
      WAITER_CALL_COOLDOWN_SECONDS,
      'NX',
    );

    if (!acquired) {
      const remainingSeconds = await this.redisService.redis.ttl(cooldownKey);
      throw new ConflictException(
        `Waiter already called — please wait ${Math.max(remainingSeconds, 1)}s before calling again`,
      );
    }

    this.eventsGateway.emitWaiterCall(table.tenantId, {
      tableId: table.id,
      calledAt: new Date().toISOString(),
    });

    return {
      nextAvailableAt: new Date(Date.now() + WAITER_CALL_COOLDOWN_SECONDS * 1000).toISOString(),
    };
  }
}
