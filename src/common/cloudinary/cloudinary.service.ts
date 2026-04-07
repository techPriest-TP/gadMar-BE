import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiOptions,
} from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUD_KEY'),
      api_secret: this.configService.get<string>('CLOUD_SECRET'),
      secure: true,
    });
  }

  private async uploadImageBuffer(
    file: Express.Multer.File,
    options: UploadApiOptions = {},
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: options.folder || 'lwc/img/uploads',
          overwrite: true,
          use_filename: true,
          unique_filename: true,
          ...options,
        },
        (error, result) => {
          if (error) {
            this.logger.error('Cloudinary upload failed', error as any);
            return reject(error);
          }
          if (!result) return reject(new Error('Empty Cloudinary result'));
          resolve(result);
        },
      );

      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<{
    url: string;
    publicId: string;
    // width?: number;
    // height?: number;
    // format?: string;
  }> {
    const result = await this.uploadImageBuffer(file);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      //   width: result.width,
      //   height: result.height,
      //   format: result.format,
    };
  }

  //   async uploadBrandImage(
  //     brandCode: string,
  //     imageBuffer: Buffer,
  //     folder: string = "brand-images"
  //   ): Promise<string> {
  //     return new Promise((resolve, reject) => {
  //       const uploadStream = cloudinary.uploader.upload_stream(
  //         {
  //           folder,
  //           public_id: brandCode,
  //           overwrite: true,
  //           format: "jpg",
  //           transformation: [{ width: 600, height: 400, crop: "fill" }],
  //         },
  //         (error, result) => {
  //           if (error) reject(error);
  //           else if (result) resolve(result.secure_url);
  //           else reject(new Error("Empty Cloudinary result"));
  //         }
  //       );

  //       uploadStream.end(imageBuffer);
  //     });
  //   }
}
