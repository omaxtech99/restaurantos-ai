import { Module } from '@nestjs/common';
import { AppConfigModule } from './modules/config/app-config.module';
import { DatabaseModule } from './modules/database/database.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { HealthModule } from './modules/health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { NotificationModule } from './modules/notification/notification.module';
import { LoggerModule } from './modules/logger/logger.module';
import { MenuModule } from './modules/menu/menu.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    DatabaseModule,
    RedisModule,
    AuditModule,
    RbacModule,
    TenantModule,
    AuthModule,
    HealthModule,
    GatewayModule,
    NotificationModule,
    MenuModule,
  ],
})
export class AppModule {}
