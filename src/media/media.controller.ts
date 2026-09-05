import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { RequestUser } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  CreateUploadSignatureDto,
  UploadSignatureResponseDto,
} from './dto/create-upload-signature.dto';
import { MediaService } from './media.service';
import { CloudinaryWebhookDto } from './dto/cloudinary-webhook.dto';
import type { Request } from 'express';

@ApiTags('Media Uploads')
@ApiBearerAuth()
@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('product-upload-signature')
  @Roles(UserRole.ADMIN, UserRole.BRAND_OWNER)
  @ApiOperation({
    summary: 'Authorize direct product-image uploads to Cloudinary',
    description:
      'Upload the file directly to Cloudinary with the returned signature, then submit its response metadata when creating or updating a product.',
  })
  @ApiResponse({ status: 201, type: UploadSignatureResponseDto })
  @ApiResponse({
    status: 403,
    description: 'The brand does not belong to this user',
  })
  createProductUploadSignature(
    @Body() dto: CreateUploadSignatureDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.mediaService.createProductUploadSignature(dto.brandId, {
      userId: user.userId,
      role: user.role as UserRole,
    });
  }

  @Post('cloudinary/webhook')
  @Public()
  @ApiOperation({
    summary: 'Receive and verify Cloudinary upload notifications',
    description:
      'This endpoint is public for Cloudinary delivery, but every request must have a valid Cloudinary signature.',
  })
  @ApiBody({ type: CloudinaryWebhookDto })
  @ApiResponse({ status: 201, schema: { example: { received: true } } })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired Cloudinary signature',
  })
  async cloudinaryWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Body() body: Record<string, unknown>,
    @Headers('x-cld-signature') signature?: string,
    @Headers('x-cld-timestamp') timestamp?: string,
  ) {
    await this.mediaService.handleCloudinaryWebhook(
      request.rawBody?.toString('utf8') || '',
      body,
      signature,
      timestamp,
    );
    return { received: true };
  }
}
