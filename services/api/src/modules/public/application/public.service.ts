import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AddOrderItemsRequest,
  OrderWithItems,
  PublicTableContext,
} from '@restaurantos/types';
import { PrismaService } from '../../database/prisma.service';
import { MenuService } from '../../menu/application/menu.service';
import { OrderService } from '../../order/application/order.service';

@Injectable()
export class PublicService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly menuService: MenuService,
    private readonly orderService: OrderService,
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
}
