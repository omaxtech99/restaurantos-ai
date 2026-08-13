import { Module } from '@nestjs/common';
import { AiService } from './application/ai.service';

@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
