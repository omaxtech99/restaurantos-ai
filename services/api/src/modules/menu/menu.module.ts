import { Module } from '@nestjs/common';
import { MenuController } from './presentation/menu.controller';
import { MenuService } from './application/menu.service';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
