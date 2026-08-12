import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@restaurantos/shared';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/presentation/permissions.guard';
import { RequirePermissions } from '../../rbac/presentation/permissions.decorator';
import type { AuthenticatedRequest } from '../../auth/domain/authenticated-request';
import { BranchService } from '../application/branch.service';
import { CreateBranchDto, CreateTableDto, UpdateBranchDto } from './branch.dto';

@ApiTags('branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'branches', version: '1' })
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @RequirePermissions(PERMISSIONS.BRANCH_READ)
  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.branchService.listBranches(req.user!.tenantId);
  }

  @RequirePermissions(PERMISSIONS.BRANCH_MANAGE)
  @Post()
  create(@Body() body: CreateBranchDto, @Req() req: AuthenticatedRequest) {
    return this.branchService.createBranch(req.user!.tenantId, body);
  }

  @RequirePermissions(PERMISSIONS.BRANCH_MANAGE)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateBranchDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.branchService.updateBranch(req.user!.tenantId, id, body);
  }

  @RequirePermissions(PERMISSIONS.BRANCH_MANAGE)
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthenticatedRequest) {
    return this.branchService.deleteBranch(req.user!.tenantId, id);
  }

  @RequirePermissions(PERMISSIONS.BRANCH_MANAGE)
  @Post(':branchId/tables')
  createTable(
    @Param('branchId', new ParseUUIDPipe()) branchId: string,
    @Body() body: CreateTableDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.branchService.createTable(req.user!.tenantId, branchId, body);
  }
}
