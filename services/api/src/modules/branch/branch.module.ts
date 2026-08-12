import { Module } from '@nestjs/common';
import { BranchController } from './presentation/branch.controller';
import { TableController } from './presentation/table.controller';
import { BranchService } from './application/branch.service';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [BranchController, TableController],
  providers: [BranchService],
  exports: [BranchService],
})
export class BranchModule {}
