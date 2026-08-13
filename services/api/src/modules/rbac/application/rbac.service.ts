import { Injectable } from '@nestjs/common';
import { PERMISSIONS, SYSTEM_ROLES, type StaffRoleValue } from '@restaurantos/shared';
import { PrismaService } from '../../database/prisma.service';

/**
 * STAFF_READ is included so a waiter/kitchen account can hand the shared
 * device off to the next staff member's PIN (see /auth/pin-login) without
 * needing the owner to do it — but neither role gets STAFF_MANAGE, so
 * neither can create accounts or escalate their own permissions.
 */
const STAFF_ROLE_PERMISSIONS: Record<StaffRoleValue, string[]> = {
  waiter: [
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.ORDER_SERVE,
    PERMISSIONS.BRANCH_READ,
    PERMISSIONS.STAFF_READ,
  ],
  kitchen: [
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.ORDER_KITCHEN,
    PERMISSIONS.BRANCH_READ,
    PERMISSIONS.STAFF_READ,
  ],
};

const STAFF_ROLE_SYSTEM_NAME: Record<StaffRoleValue, string> = {
  waiter: SYSTEM_ROLES.WAITER,
  kitchen: SYSTEM_ROLES.KITCHEN,
};

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

    await this.syncOwnerRolePermissions();
  }

  /**
   * New permission codes only reach a tenant's owner role at signup time
   * (ensureOwnerRole). This backfills every existing owner role so
   * already-created tenants pick up newly added permissions too, without
   * needing a fresh signup.
   */
  private async syncOwnerRolePermissions(): Promise<void> {
    const [ownerRoles, permissions] = await Promise.all([
      this.prismaService.prisma.role.findMany({
        where: { isSystem: true, name: SYSTEM_ROLES.OWNER },
      }),
      this.prismaService.prisma.permission.findMany(),
    ]);

    for (const role of ownerRoles) {
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

  /**
   * PIN-login staff accounts (waiter/kitchen) get a fixed, narrow permission
   * set — deliberately never `order:manage` — so the restriction holds at
   * the API layer, not just in which buttons the frontend happens to show.
   * See STAFF_ROLE_PERMISSIONS above for exactly what each role can do.
   */
  async ensureStaffRole(
    tenantId: string,
    userId: string,
    staffRole: StaffRoleValue,
  ): Promise<void> {
    const roleName = STAFF_ROLE_SYSTEM_NAME[staffRole];
    const permissionCodes = STAFF_ROLE_PERMISSIONS[staffRole];

    const role = await this.prismaService.prisma.role.upsert({
      where: { tenantId_name: { tenantId, name: roleName } },
      update: {},
      create: {
        tenantId,
        name: roleName,
        description: `Tenant ${roleName}`,
        isSystem: true,
      },
    });

    const permissions = await this.prismaService.prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
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
