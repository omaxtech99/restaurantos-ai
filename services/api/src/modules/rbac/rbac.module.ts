import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from './application/rbac.service';
import { PermissionsGuard } from './presentation/permissions.guard';

@Module({
  providers: [RbacService, PermissionsGuard, Reflector],
  exports: [RbacService, PermissionsGuard],
})
export class RbacModule {}
