import { Injectable, NotFoundException } from '@nestjs/common';
import type { WaitlistEntry } from '@restaurantos/types';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../../notification/application/notification.service';
import { EventsGateway } from '../../gateway/presentation/events.gateway';

interface WaitlistEntryRecord {
  id: string;
  tenantId: string;
  branchId: string;
  customerName: string;
  phone: string;
  partySize: number;
  status: string;
  notifiedAt: Date | null;
  seatedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toWaitlistEntry(record: WaitlistEntryRecord): WaitlistEntry {
  return {
    id: record.id,
    tenantId: record.tenantId,
    branchId: record.branchId,
    customerName: record.customerName,
    phone: record.phone,
    partySize: record.partySize,
    status: record.status as WaitlistEntry['status'],
    notifiedAt: record.notifiedAt?.toISOString() ?? null,
    seatedAt: record.seatedAt?.toISOString() ?? null,
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

interface JoinWaitlistInput {
  branchId: string;
  customerName: string;
  phone: string;
  partySize: number;
}

@Injectable()
export class WaitlistService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async listWaitlist(tenantId: string, branchId?: string): Promise<WaitlistEntry[]> {
    const entries = await this.prismaService.prisma.waitlistEntry.findMany({
      where: {
        tenantId,
        branchId,
        status: { in: ['waiting', 'notified'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    return entries.map(toWaitlistEntry);
  }

  async joinWaitlist(tenantId: string, input: JoinWaitlistInput): Promise<WaitlistEntry> {
    const branch = await this.prismaService.prisma.branch.findFirst({
      where: { id: input.branchId, tenantId, deletedAt: null },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const entry = await this.prismaService.prisma.waitlistEntry.create({
      data: {
        tenantId,
        branchId: input.branchId,
        customerName: input.customerName,
        phone: input.phone,
        partySize: input.partySize,
      },
    });

    const result = toWaitlistEntry(entry);
    this.eventsGateway.emitWaitlistUpdate(tenantId, result);
    return result;
  }

  async markSeated(tenantId: string, id: string): Promise<WaitlistEntry> {
    await this.findOrThrow(tenantId, id);

    const updated = await this.prismaService.prisma.waitlistEntry.update({
      where: { id },
      data: { status: 'seated', seatedAt: new Date() },
    });

    const result = toWaitlistEntry(updated);
    this.eventsGateway.emitWaitlistUpdate(tenantId, result);
    return result;
  }

  async cancelEntry(tenantId: string, id: string): Promise<WaitlistEntry> {
    await this.findOrThrow(tenantId, id);

    const updated = await this.prismaService.prisma.waitlistEntry.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    const result = toWaitlistEntry(updated);
    this.eventsGateway.emitWaitlistUpdate(tenantId, result);
    return result;
  }

  /**
   * Called when a table actually frees up (order marked paid/cancelled — see
   * OrderService.updateStatus). Notifies whoever has been waiting longest
   * for that branch via WhatsApp. A no-op if nobody's waiting there.
   */
  async notifyNextInQueue(tenantId: string, branchId: string): Promise<void> {
    const next = await this.prismaService.prisma.waitlistEntry.findFirst({
      where: { tenantId, branchId, status: 'waiting' },
      orderBy: { createdAt: 'asc' },
    });

    if (!next) {
      return;
    }

    const [branch, tenant] = await Promise.all([
      this.prismaService.prisma.branch.findFirst({ where: { id: branchId } }),
      this.prismaService.prisma.tenant.findFirst({ where: { id: tenantId } }),
    ]);

    const updated = await this.prismaService.prisma.waitlistEntry.update({
      where: { id: next.id },
      data: { status: 'notified', notifiedAt: new Date() },
    });

    await this.notificationService.enqueueWhatsApp({
      to: next.phone,
      template: 'table-ready',
      payload: {
        customerName: next.customerName,
        restaurantName: tenant?.name ?? 'the restaurant',
        branchName: branch?.name ?? '',
      },
    });

    this.eventsGateway.emitWaitlistUpdate(tenantId, toWaitlistEntry(updated));
  }

  private async findOrThrow(tenantId: string, id: string): Promise<WaitlistEntryRecord> {
    const entry = await this.prismaService.prisma.waitlistEntry.findFirst({
      where: { id, tenantId },
    });

    if (!entry) {
      throw new NotFoundException('Waitlist entry not found');
    }

    return entry;
  }
}
