import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { UpdateTableDto } from './branch.dto';

@ApiTags('tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'tables', version: '1' })
export class TableController {
  constructor(private readonly branchService: BranchService) {}

  @RequirePermissions(PERMISSIONS.BRANCH_MANAGE)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateTableDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.branchService.updateTable(req.user!.tenantId, id, body);
  }

  @RequirePermissions(PERMISSIONS.BRANCH_MANAGE)
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthenticatedRequest) {
    return this.branchService.deleteTable(req.user!.tenantId, id);
  }
}
