import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { RequestUser } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  CreateUploadSignatureDto,
  UploadSignatureResponseDto,
} from './dto/create-upload-signature.dto';
import { MediaService } from './media.service';

@ApiTags('Media')
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
}
