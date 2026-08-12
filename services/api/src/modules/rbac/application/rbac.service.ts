import { Injectable } from '@nestjs/common';
import { PERMISSIONS, SYSTEM_ROLES } from '@restaurantos/shared';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RbacService {
  constructor(private readonly prismaService: PrismaService) {}

  async seedPermissions(): Promise<void> {
    const entries = Object.values(PERMISSIONS).map((code) => ({
      code,
      description: code,
    }));

    for (const entry of entries) {
      await this.prismaService.prisma.permission.upsert({
        where: { code: entry.code },
        update: { description: entry.description },
        create: entry,
      });
    }
  }

  async ensureOwnerRole(tenantId: string, userId: string): Promise<void> {
    await this.seedPermissions();

    const permissions = await this.prismaService.prisma.permission.findMany();
    const role = await this.prismaService.prisma.role.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: SYSTEM_ROLES.OWNER,
        },
      },
      update: {},
      create: {
        tenantId,
        name: SYSTEM_ROLES.OWNER,
        description: 'Tenant owner',
        isSystem: true,
      },
    });

    for (const permission of permissions) {
      await this.prismaService.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }

    await this.prismaService.prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        tenantId,
        userId,
        roleId: role.id,
      },
    });
  }

  async getUserAccess(userId: string): Promise<{ roles: string[]; permissions: string[] }> {
    const userRoles = await this.prismaService.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const roles = [...new Set(userRoles.map((item) => item.role.name))];
    const permissions = [
      ...new Set(
        userRoles.flatMap((item) =>
          item.role.permissions.map((rolePermission) => rolePermission.permission.code),
        ),
      ),
    ];

    return { roles, permissions };
  }
}
