import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

export type UploadedImage = {
  url: string;
  publicId: string;
};

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);
  private ready = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME')?.trim();
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY')?.trim();
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET')?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        'Cloudinary credentials missing — image uploads will fail',
      );
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    this.ready = true;
    this.logger.log(`Cloudinary ready (${cloudName})`);
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadedImage> {
    this.ensureReady();

    try {
      const result = await this.uploadBuffer(file.buffer, folder, file.mimetype);
      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cloudinary upload failed: ${message}`);
      throw new InternalServerErrorException('Failed to upload image');
    }
  }

  async deleteImage(publicId: string | null | undefined): Promise<void> {
    if (!publicId || !this.ready) return;

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to delete Cloudinary asset ${publicId}: ${message}`);
    }
  }

  private ensureReady() {
    if (!this.ready) {
      throw new InternalServerErrorException(
        'Cloudinary is not configured. Set CLOUDINARY_* env vars.',
      );
    }
  }

  private uploadBuffer(
    buffer: Buffer,
    folder: string,
    mimetype: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `snap-task/${folder}`,
          resource_type: 'image',
          format: mimetype.includes('png') ? 'png' : undefined,
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Empty Cloudinary response'));
            return;
          }
          resolve(result);
        },
      );

      Readable.from(buffer).pipe(stream);
    });
  }
}
