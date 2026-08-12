import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isValidOrderStatusTransition, type OrderStatusValue } from '@restaurantos/shared';
import type {
  AddOrderItemsRequest,
  CreateOrderRequest,
  OrderItem,
  OrderWithItems,
} from '@restaurantos/types';
import { PrismaService } from '../../database/prisma.service';

interface OrderItemRecord {
  id: string;
  tenantId: string;
  orderId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderRecord {
  id: string;
  tenantId: string;
  branchId: string;
  tableId: string;
  status: string;
  totalCents: number;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemRecord[];
}

function toOrderItem(record: OrderItemRecord): OrderItem {
  return {
    id: record.id,
    tenantId: record.tenantId,
    orderId: record.orderId,
    menuItemId: record.menuItemId,
    name: record.name,
    quantity: record.quantity,
    unitPriceCents: record.unitPriceCents,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toOrderWithItems(record: OrderRecord): OrderWithItems {
  return {
    id: record.id,
    tenantId: record.tenantId,
    branchId: record.branchId,
    tableId: record.tableId,
    status: record.status as OrderWithItems['status'],
    totalCents: record.totalCents,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    items: record.items.map(toOrderItem),
  };
}

interface ListOrdersFilters {
  branchId?: string;
  tableId?: string;
  status?: OrderStatusValue;
}

@Injectable()
export class OrderService {
  constructor(private readonly prismaService: PrismaService) {}

  async listOrders(tenantId: string, filters: ListOrdersFilters = {}): Promise<OrderWithItems[]> {
    const orders = await this.prismaService.prisma.order.findMany({
      where: {
        tenantId,
        branchId: filters.branchId,
        tableId: filters.tableId,
        status: filters.status,
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    return orders.map(toOrderWithItems);
  }

  async getOrder(tenantId: string, orderId: string): Promise<OrderWithItems> {
    const order = await this.findOrderOrThrow(tenantId, orderId);
    return toOrderWithItems(order);
  }

  async createOrder(tenantId: string, input: CreateOrderRequest): Promise<OrderWithItems> {
    const table = await this.prismaService.prisma.table.findFirst({
      where: { id: input.tableId, tenantId, deletedAt: null },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    const menuItems = await this.loadOrderableMenuItems(
      tenantId,
      input.items.map((item) => item.menuItemId),
    );

    const order = await this.prismaService.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          tenantId,
          branchId: table.branchId,
          tableId: table.id,
          items: {
            create: input.items.map((item) => {
              const menuItem = menuItems.get(item.menuItemId)!;
              return {
                tenantId,
                menuItemId: menuItem.id,
                name: menuItem.name,
                quantity: item.quantity,
                unitPriceCents: menuItem.priceCents,
                notes: item.notes,
              };
            }),
          },
        },
        include: { items: true },
      });

      const totalCents = created.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPriceCents,
        0,
      );

      const updated = await tx.order.update({
        where: { id: created.id },
        data: { totalCents },
        include: { items: true },
      });

      await tx.table.update({
        where: { id: table.id },
        data: { status: 'occupied' },
      });

      return updated;
    });

    return toOrderWithItems(order);
  }

  async addItems(
    tenantId: string,
    orderId: string,
    input: AddOrderItemsRequest,
  ): Promise<OrderWithItems> {
    const order = await this.findOrderOrThrow(tenantId, orderId);

    if (order.status !== 'open' && order.status !== 'in_kitchen') {
      throw new ConflictException(
        'Items can only be added while the order is open or in the kitchen',
      );
    }

    const menuItems = await this.loadOrderableMenuItems(
      tenantId,
      input.items.map((item) => item.menuItemId),
    );

    const updated = await this.prismaService.prisma.$transaction(async (tx) => {
      await tx.orderItem.createMany({
        data: input.items.map((item) => {
          const menuItem = menuItems.get(item.menuItemId)!;
          return {
            tenantId,
            orderId,
            menuItemId: menuItem.id,
            name: menuItem.name,
            quantity: item.quantity,
            unitPriceCents: menuItem.priceCents,
            notes: item.notes,
          };
        }),
      });

      const items = await tx.orderItem.findMany({ where: { orderId } });
      const totalCents = items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);

      return tx.order.update({
        where: { id: orderId },
        data: { totalCents },
        include: { items: true },
      });
    });

    return toOrderWithItems(updated);
  }

  async updateStatus(
    tenantId: string,
    orderId: string,
    status: OrderStatusValue,
  ): Promise<OrderWithItems> {
    const order = await this.findOrderOrThrow(tenantId, orderId);

    if (!isValidOrderStatusTransition(order.status as OrderStatusValue, status)) {
      throw new ConflictException(`Cannot transition order from "${order.status}" to "${status}"`);
    }

    const updated = await this.prismaService.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id: orderId },
        data: { status },
        include: { items: true },
      });

      if (status === 'paid' || status === 'cancelled') {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: 'available' },
        });
      }

      return result;
    });

    return toOrderWithItems(updated);
  }

  private async loadOrderableMenuItems(
    tenantId: string,
    menuItemIds: string[],
  ): Promise<Map<string, { id: string; name: string; priceCents: number }>> {
    const uniqueIds = [...new Set(menuItemIds)];
    const items = await this.prismaService.prisma.menuItem.findMany({
      where: { id: { in: uniqueIds }, tenantId, deletedAt: null },
    });

    const map = new Map(items.map((item) => [item.id, item]));
    for (const id of uniqueIds) {
      const item = map.get(id);
      if (!item) {
        throw new NotFoundException(`Menu item ${id} not found`);
      }
      if (!item.isAvailable) {
        throw new ConflictException(`Menu item "${item.name}" is not available`);
      }
    }

    return map;
  }

  private async findOrderOrThrow(tenantId: string, orderId: string): Promise<OrderRecord> {
    const order = await this.prismaService.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }
}
