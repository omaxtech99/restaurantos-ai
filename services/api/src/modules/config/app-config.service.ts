import { Injectable } from '@nestjs/common';
import { apiEnvSchema, parseCorsOrigins, parseEnv, type ApiEnv } from '@restaurantos/config';

@Injectable()
export class AppConfigService {
  private readonly env: ApiEnv;

  constructor() {
    this.env = parseEnv(apiEnvSchema);
  }

  get nodeEnv(): ApiEnv['NODE_ENV'] {
    return this.env.NODE_ENV;
  }

  get port(): number {
    return this.env.API_PORT;
  }

  get appUrl(): string {
    return this.env.APP_URL;
  }

  get apiUrl(): string {
    return this.env.API_URL;
  }

  get corsOrigins(): string[] {
    return parseCorsOrigins(this.env.CORS_ORIGINS);
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  get redisUrl(): string {
    return this.env.REDIS_URL;
  }

  get jwtAccessSecret(): string {
    return this.env.JWT_ACCESS_SECRET;
  }

  get jwtRefreshSecret(): string {
    return this.env.JWT_REFRESH_SECRET;
  }

  get jwtAccessTtl(): string {
    return this.env.JWT_ACCESS_TTL;
  }

  get jwtRefreshTtl(): string {
    return this.env.JWT_REFRESH_TTL;
  }

  get smtpUrl(): string {
    return this.env.SMTP_URL;
  }

  get emailFrom(): string {
    return this.env.EMAIL_FROM;
  }
}
