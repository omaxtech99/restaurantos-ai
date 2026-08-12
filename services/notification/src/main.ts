import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NotificationConfigService } from './config/notification-config.service';

loadEnv({ path: resolve(process.cwd(), '../../.env') });
loadEnv();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(NotificationConfigService);
  await app.listen(config.port);
}

void bootstrap();
