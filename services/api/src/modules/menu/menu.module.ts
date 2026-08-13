import { Module } from '@nestjs/common';
import { MenuController } from './presentation/menu.controller';
import { MenuService } from './application/menu.service';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { AiModule } from '../ai/ai.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [AuthModule, RbacModule, AiModule, MediaModule],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
