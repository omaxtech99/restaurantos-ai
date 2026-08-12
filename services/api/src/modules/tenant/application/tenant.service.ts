import { ConflictException, Injectable } from '@nestjs/common';
import { slugify } from '@restaurantos/shared';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TenantService {
  constructor(private readonly prismaService: PrismaService) {}

  async createTenant(name: string) {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let attempt = 1;

    while (await this.prismaService.prisma.tenant.findUnique({ where: { slug } })) {
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
    }

    return this.prismaService.prisma.tenant.create({
      data: {
        name,
        slug,
        subscriptions: {
          create: {
            planCode: 'trial',
            status: 'trialing',
          },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    const tenant = await this.prismaService.prisma.tenant.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
    });

    if (!tenant) {
      throw new ConflictException('Tenant not found');
    }

    return tenant;
  }
}
