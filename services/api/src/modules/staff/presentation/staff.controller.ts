import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
import { StaffService } from '../application/staff.service';
import { CreateStaffDto } from './staff.dto';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'staff', version: '1' })
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @RequirePermissions(PERMISSIONS.STAFF_READ)
  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.staffService.listStaff(req.user!.tenantId);
  }

  @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  @Post()
  create(@Body() body: CreateStaffDto, @Req() req: AuthenticatedRequest) {
    return this.staffService.createStaff(req.user!.tenantId, body);
  }

  @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthenticatedRequest) {
    return this.staffService.deleteStaff(req.user!.tenantId, id);
  }
}
