import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  Branch,
  BranchWithTables,
  CreateBranchRequest,
  CreateTableRequest,
  Table,
  UpdateBranchRequest,
  UpdateTableRequest,
} from '@restaurantos/types';
import { PrismaService } from '../../database/prisma.service';

interface BranchRecord {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TableRecord {
  id: string;
  tenantId: string;
  branchId: string;
  label: string;
  capacity: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

function toBranch(record: BranchRecord): Branch {
  return {
    id: record.id,
    tenantId: record.tenantId,
    name: record.name,
    address: record.address,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toTable(record: TableRecord): Table {
  return {
    id: record.id,
    tenantId: record.tenantId,
    branchId: record.branchId,
    label: record.label,
    capacity: record.capacity,
    status: record.status as Table['status'],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

@Injectable()
export class BranchService {
  constructor(private readonly prismaService: PrismaService) {}

  async listBranches(tenantId: string): Promise<BranchWithTables[]> {
    const branches = await this.prismaService.prisma.branch.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        tables: {
          where: { deletedAt: null },
          orderBy: { label: 'asc' },
        },
      },
    });

    return branches.map((branch) => ({
      ...toBranch(branch),
      tables: branch.tables.map(toTable),
    }));
  }

  async createDefaultBranch(tenantId: string): Promise<Branch> {
    const branch = await this.prismaService.prisma.branch.create({
      data: {
        tenantId,
        name: 'Main',
      },
    });

    return toBranch(branch);
  }

  async createBranch(tenantId: string, input: CreateBranchRequest): Promise<Branch> {
    await this.assertBranchNameAvailable(tenantId, input.name);

    const branch = await this.prismaService.prisma.branch.create({
      data: {
        tenantId,
        name: input.name,
        address: input.address,
      },
    });

    return toBranch(branch);
  }

  async updateBranch(
    tenantId: string,
    branchId: string,
    input: UpdateBranchRequest,
  ): Promise<Branch> {
    await this.findBranchOrThrow(tenantId, branchId);

    if (input.name) {
      await this.assertBranchNameAvailable(tenantId, input.name, branchId);
    }

    const branch = await this.prismaService.prisma.branch.update({
      where: { id: branchId },
      data: {
        name: input.name,
        address: input.address,
      },
    });

    return toBranch(branch);
  }

  async deleteBranch(tenantId: string, branchId: string): Promise<{ success: true }> {
    await this.findBranchOrThrow(tenantId, branchId);

    const deletedAt = new Date();
    await this.prismaService.prisma.$transaction([
      this.prismaService.prisma.table.updateMany({
        where: { tenantId, branchId, deletedAt: null },
        data: { deletedAt },
      }),
      this.prismaService.prisma.branch.update({
        where: { id: branchId },
        data: { deletedAt },
      }),
    ]);

    return { success: true };
  }

  async createTable(
    tenantId: string,
    branchId: string,
    input: CreateTableRequest,
  ): Promise<Table> {
    await this.findBranchOrThrow(tenantId, branchId);
    await this.assertTableLabelAvailable(branchId, input.label);

    const table = await this.prismaService.prisma.table.create({
      data: {
        tenantId,
        branchId,
        label: input.label,
        capacity: input.capacity,
      },
    });

    return toTable(table);
  }

  async updateTable(
    tenantId: string,
    tableId: string,
    input: UpdateTableRequest,
  ): Promise<Table> {
    const existing = await this.findTableOrThrow(tenantId, tableId);

    if (input.label) {
      await this.assertTableLabelAvailable(existing.branchId, input.label, tableId);
    }

    const table = await this.prismaService.prisma.table.update({
      where: { id: tableId },
      data: {
        label: input.label,
        capacity: input.capacity,
        status: input.status,
      },
    });

    return toTable(table);
  }

  async deleteTable(tenantId: string, tableId: string): Promise<{ success: true }> {
    await this.findTableOrThrow(tenantId, tableId);

    await this.prismaService.prisma.table.update({
      where: { id: tableId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  async assertBranchExists(tenantId: string, branchId: string): Promise<BranchRecord> {
    return this.findBranchOrThrow(tenantId, branchId);
  }

  async assertTableExists(tenantId: string, tableId: string): Promise<TableRecord> {
    return this.findTableOrThrow(tenantId, tableId);
  }

  private async assertBranchNameAvailable(
    tenantId: string,
    name: string,
    excludeBranchId?: string,
  ): Promise<void> {
    const existing = await this.prismaService.prisma.branch.findFirst({
      where: {
        tenantId,
        name,
        deletedAt: null,
        ...(excludeBranchId ? { NOT: { id: excludeBranchId } } : {}),
      },
    });

    if (existing) {
      throw new ConflictException('A branch with this name already exists');
    }
  }

  private async assertTableLabelAvailable(
    branchId: string,
    label: string,
    excludeTableId?: string,
  ): Promise<void> {
    const existing = await this.prismaService.prisma.table.findFirst({
      where: {
        branchId,
        label,
        deletedAt: null,
        ...(excludeTableId ? { NOT: { id: excludeTableId } } : {}),
      },
    });

    if (existing) {
      throw new ConflictException('A table with this label already exists in this branch');
    }
  }

  private async findBranchOrThrow(tenantId: string, branchId: string): Promise<BranchRecord> {
    const branch = await this.prismaService.prisma.branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  private async findTableOrThrow(tenantId: string, tableId: string): Promise<TableRecord> {
    const table = await this.prismaService.prisma.table.findFirst({
      where: { id: tableId, tenantId, deletedAt: null },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }
}
