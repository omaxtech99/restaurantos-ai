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
import { MenuService } from '../application/menu.service';
import {
  CreateMenuCategoryDto,
  CreateMenuItemDto,
  UpdateMenuCategoryDto,
  UpdateMenuItemDto,
} from './menu.dto';

@ApiTags('menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'menu', version: '1' })
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @RequirePermissions(PERMISSIONS.MENU_READ)
  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.menuService.listCategories(req.user!.tenantId);
  }

  @RequirePermissions(PERMISSIONS.MENU_MANAGE)
  @Post('categories')
  createCategory(@Body() body: CreateMenuCategoryDto, @Req() req: AuthenticatedRequest) {
    return this.menuService.createCategory(req.user!.tenantId, body);
  }

  @RequirePermissions(PERMISSIONS.MENU_MANAGE)
  @Patch('categories/:id')
  updateCategory(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateMenuCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.menuService.updateCategory(req.user!.tenantId, id, body);
  }

  @RequirePermissions(PERMISSIONS.MENU_MANAGE)
  @Delete('categories/:id')
  deleteCategory(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthenticatedRequest) {
    return this.menuService.deleteCategory(req.user!.tenantId, id);
  }

  @RequirePermissions(PERMISSIONS.MENU_MANAGE)
  @Post('items')
  createItem(@Body() body: CreateMenuItemDto, @Req() req: AuthenticatedRequest) {
    return this.menuService.createItem(req.user!.tenantId, body);
  }

  @RequirePermissions(PERMISSIONS.MENU_MANAGE)
  @Patch('items/:id')
  updateItem(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateMenuItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.menuService.updateItem(req.user!.tenantId, id, body);
  }

  @RequirePermissions(PERMISSIONS.MENU_MANAGE)
  @Delete('items/:id')
  deleteItem(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthenticatedRequest) {
    return this.menuService.deleteItem(req.user!.tenantId, id);
  }
}
