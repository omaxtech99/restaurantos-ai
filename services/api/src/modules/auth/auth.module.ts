import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './presentation/auth.controller';
import { AuthService } from './application/auth.service';
import { PasswordService } from './application/password.service';
import { TokenService } from './application/token.service';
import { SessionService } from './application/session.service';
import { JwtAuthGuard } from './presentation/jwt-auth.guard';
import { TenantModule } from '../tenant/tenant.module';
import { RbacModule } from '../rbac/rbac.module';
import { NotificationModule } from '../notification/notification.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [JwtModule.register({}), TenantModule, RbacModule, NotificationModule, AuditModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, SessionService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, TokenService, PasswordService],
})
export class AuthModule {}
