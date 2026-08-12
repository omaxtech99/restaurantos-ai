import { Injectable } from '@nestjs/common';
import type { AuditAction } from '@restaurantos/types';
import { PrismaService } from '../../database/prisma.service';

interface WriteAuditInput {
  action: AuditAction | string;
  tenantId?: string | null;
  userId?: string | null;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prismaService: PrismaService) {}

  async write(input: WriteAuditInput): Promise<void> {
    await this.prismaService.prisma.auditLog.create({
      data: {
        action: input.action,
        tenantId: input.tenantId ?? null,
        userId: input.userId ?? null,
        resource: input.resource,
        resourceId: input.resourceId,
        metadata: input.metadata as object | undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }
}
