import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { PresignMediaUploadResponse } from '@restaurantos/types';
import { AppConfigService } from '../../config/app-config.service';

/**
 * Staff upload photos/video straight to R2 from the browser using a
 * short-lived presigned PUT URL — the file never passes through this API
 * server, so there's no size limit imposed by our own request handling.
 */
@Injectable()
export class MediaService {
  constructor(private readonly config: AppConfigService) {}

  async presignUpload(kind: 'photo' | 'video', contentType: string): Promise<PresignMediaUploadResponse> {
    if (!this.config.r2Configured) {
      return { configured: false, uploadUrl: null, publicUrl: null };
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${this.config.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.r2AccessKeyId!,
        secretAccessKey: this.config.r2SecretAccessKey!,
      },
    });

    const extension = contentType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'bin';
    const key = `menu-items/${kind}/${randomUUID()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.config.r2Bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    const publicUrl = `${this.config.r2PublicUrl}/${key}`;

    return { configured: true, uploadUrl, publicUrl };
  }
}
