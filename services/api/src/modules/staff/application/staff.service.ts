import { Injectable, NotFoundException } from '@nestjs/common';
import type { StaffRoleValue } from '@restaurantos/shared';
import type { StaffMember } from '@restaurantos/types';
import { PrismaService } from '../../database/prisma.service';
import { PasswordService } from '../../auth/application/password.service';
import { RbacService } from '../../rbac/application/rbac.service';

interface CreateStaffInput {
  firstName: string;
  lastName: string;
  role: StaffRoleValue;
  pin: string;
}

@Injectable()
export class StaffService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly rbacService: RbacService,
  ) {}

  async listStaff(tenantId: string): Promise<StaffMember[]> {
    const users = await this.prismaService.prisma.user.findMany({
      where: { tenantId, deletedAt: null, pinHash: { not: null } },
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map((userRole) => userRole.role.name),
      createdAt: user.createdAt.toISOString(),
    }));
  }

  async createStaff(tenantId: string, input: CreateStaffInput): Promise<StaffMember> {
    const pinHash = await this.passwordService.hash(input.pin);

    const user = await this.prismaService.prisma.user.create({
      data: {
        tenantId,
        firstName: input.firstName,
        lastName: input.lastName,
        pinHash,
      },
    });

    await this.rbacService.ensureStaffRole(tenantId, user.id, input.role);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: [input.role],
      createdAt: user.createdAt.toISOString(),
    };
  }

  async deleteStaff(tenantId: string, staffId: string): Promise<{ success: true }> {
    const user = await this.prismaService.prisma.user.findFirst({
      where: { id: staffId, tenantId, deletedAt: null, pinHash: { not: null } },
    });

    if (!user) {
      throw new NotFoundException('Staff member not found');
    }

    await this.prismaService.prisma.user.update({
      where: { id: staffId },
      data: { deletedAt: new Date() },
    });

    await this.prismaService.prisma.session.updateMany({
      where: { userId: staffId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }
}
