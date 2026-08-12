import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateMenuCategoryRequest,
  CreateMenuItemRequest,
  MenuCategory,
  MenuCategoryWithItems,
  MenuItem,
  UpdateMenuCategoryRequest,
  UpdateMenuItemRequest,
} from '@restaurantos/types';
import { PrismaService } from '../../database/prisma.service';

interface CategoryRecord {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ItemRecord {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  priceCents: number;
  isAvailable: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

function toMenuCategory(record: CategoryRecord): MenuCategory {
  return {
    id: record.id,
    tenantId: record.tenantId,
    name: record.name,
    description: record.description,
    position: record.position,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toMenuItem(record: ItemRecord): MenuItem {
  return {
    id: record.id,
    tenantId: record.tenantId,
    categoryId: record.categoryId,
    name: record.name,
    description: record.description,
    priceCents: record.priceCents,
    isAvailable: record.isAvailable,
    position: record.position,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

@Injectable()
export class MenuService {
  constructor(private readonly prismaService: PrismaService) {}

  async listCategories(tenantId: string): Promise<MenuCategoryWithItems[]> {
    const categories = await this.prismaService.prisma.menuCategory.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { position: 'asc' },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
        },
      },
    });

    return categories.map((category) => ({
      ...toMenuCategory(category),
      items: category.items.map(toMenuItem),
    }));
  }

  async createCategory(
    tenantId: string,
    input: CreateMenuCategoryRequest,
  ): Promise<MenuCategory> {
    await this.assertCategoryNameAvailable(tenantId, input.name);

    const category = await this.prismaService.prisma.menuCategory.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description,
        position: input.position ?? 0,
      },
    });

    return toMenuCategory(category);
  }

  async updateCategory(
    tenantId: string,
    categoryId: string,
    input: UpdateMenuCategoryRequest,
  ): Promise<MenuCategory> {
    await this.findCategoryOrThrow(tenantId, categoryId);

    if (input.name) {
      await this.assertCategoryNameAvailable(tenantId, input.name, categoryId);
    }

    const category = await this.prismaService.prisma.menuCategory.update({
      where: { id: categoryId },
      data: {
        name: input.name,
        description: input.description,
        position: input.position,
      },
    });

    return toMenuCategory(category);
  }

  async deleteCategory(tenantId: string, categoryId: string): Promise<{ success: true }> {
    await this.findCategoryOrThrow(tenantId, categoryId);

    const deletedAt = new Date();
    await this.prismaService.prisma.$transaction([
      this.prismaService.prisma.menuItem.updateMany({
        where: { tenantId, categoryId, deletedAt: null },
        data: { deletedAt },
      }),
      this.prismaService.prisma.menuCategory.update({
        where: { id: categoryId },
        data: { deletedAt },
      }),
    ]);

    return { success: true };
  }

  async createItem(tenantId: string, input: CreateMenuItemRequest): Promise<MenuItem> {
    await this.findCategoryOrThrow(tenantId, input.categoryId);

    const item = await this.prismaService.prisma.menuItem.create({
      data: {
        tenantId,
        categoryId: input.categoryId,
        name: input.name,
        description: input.description,
        priceCents: input.priceCents,
        isAvailable: input.isAvailable ?? true,
        position: input.position ?? 0,
      },
    });

    return toMenuItem(item);
  }

  async updateItem(
    tenantId: string,
    itemId: string,
    input: UpdateMenuItemRequest,
  ): Promise<MenuItem> {
    await this.findItemOrThrow(tenantId, itemId);

    if (input.categoryId) {
      await this.findCategoryOrThrow(tenantId, input.categoryId);
    }

    const item = await this.prismaService.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        categoryId: input.categoryId,
        name: input.name,
        description: input.description,
        priceCents: input.priceCents,
        isAvailable: input.isAvailable,
        position: input.position,
      },
    });

    return toMenuItem(item);
  }

  async deleteItem(tenantId: string, itemId: string): Promise<{ success: true }> {
    await this.findItemOrThrow(tenantId, itemId);

    await this.prismaService.prisma.menuItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  private async assertCategoryNameAvailable(
    tenantId: string,
    name: string,
    excludeCategoryId?: string,
  ): Promise<void> {
    const existing = await this.prismaService.prisma.menuCategory.findFirst({
      where: {
        tenantId,
        name,
        deletedAt: null,
        ...(excludeCategoryId ? { NOT: { id: excludeCategoryId } } : {}),
      },
    });

    if (existing) {
      throw new ConflictException('A category with this name already exists');
    }
  }

  private async findCategoryOrThrow(tenantId: string, categoryId: string): Promise<CategoryRecord> {
    const category = await this.prismaService.prisma.menuCategory.findFirst({
      where: { id: categoryId, tenantId, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException('Menu category not found');
    }

    return category;
  }

  private async findItemOrThrow(tenantId: string, itemId: string): Promise<ItemRecord> {
    const item = await this.prismaService.prisma.menuItem.findFirst({
      where: { id: itemId, tenantId, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    return item;
  }
}
