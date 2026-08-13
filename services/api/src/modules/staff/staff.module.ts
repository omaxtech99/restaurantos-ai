import { Module } from '@nestjs/common';
import { StaffController } from './presentation/staff.controller';
import { StaffService } from './application/staff.service';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
