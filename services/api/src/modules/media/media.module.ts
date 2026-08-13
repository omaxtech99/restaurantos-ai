import { Module } from '@nestjs/common';
import { MediaService } from './application/media.service';

@Module({
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
