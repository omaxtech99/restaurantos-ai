import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@restaurantos/shared';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/presentation/permissions.guard';
import { RequirePermissions } from '../../rbac/presentation/permissions.decorator';
import type { AuthenticatedRequest } from '../../auth/domain/authenticated-request';
import { WaitlistService } from '../application/waitlist.service';
import { JoinWaitlistDto, ListWaitlistQueryDto } from './waitlist.dto';

@ApiTags('waitlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'waitlist', version: '1' })
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @RequirePermissions(PERMISSIONS.WAITLIST_READ)
  @Get()
  list(@Query() query: ListWaitlistQueryDto, @Req() req: AuthenticatedRequest) {
    return this.waitlistService.listWaitlist(req.user!.tenantId, query.branchId);
  }

  @RequirePermissions(PERMISSIONS.WAITLIST_MANAGE)
  @Post()
  join(@Body() body: JoinWaitlistDto, @Req() req: AuthenticatedRequest) {
    return this.waitlistService.joinWaitlist(req.user!.tenantId, body);
  }

  @RequirePermissions(PERMISSIONS.WAITLIST_MANAGE)
  @Patch(':id/seated')
  markSeated(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthenticatedRequest) {
    return this.waitlistService.markSeated(req.user!.tenantId, id);
  }

  @RequirePermissions(PERMISSIONS.WAITLIST_MANAGE)
  @Patch(':id/cancel')
  cancel(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthenticatedRequest) {
    return this.waitlistService.cancelEntry(req.user!.tenantId, id);
  }
}
