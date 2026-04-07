import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WhatsAppService, WhatsAppMessageData } from './whatsapp.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';

class GenerateWhatsAppUrlDto {
  phoneNumber: string;
  productName: string;
  productPrice: number;
  refCode: string;
  productUrl?: string;
  customMessage?: string;
}

class ValidatePhoneDto {
  phoneNumber: string;
}

@ApiTags('WhatsApp')
@ApiBearerAuth()
@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('generate-url')
  @Public()
  @ApiOperation({ summary: 'Generate WhatsApp URL with pre-filled message' })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp URL generated successfully',
  })
  async generateUrl(@Body() data: GenerateWhatsAppUrlDto) {
    const url = this.whatsappService.generateWhatsAppUrl(data);
    return { url };
  }

  @Get('generate-message')
  @Public()
  @ApiOperation({ summary: 'Generate pre-filled WhatsApp message' })
  @ApiResponse({
    status: 200,
    description: 'Message generated successfully',
  })
  async generateMessage(
    @Query('productName') productName: string,
    @Query('productPrice') productPrice: string,
    @Query('refCode') refCode: string,
    @Query('productUrl') productUrl?: string,
  ) {
    const message = this.whatsappService.generatePreFilledMessage(
      productName,
      parseFloat(productPrice) || 0,
      refCode,
      productUrl,
    );
    return { message };
  }

  @Post('validate-phone')
  @Public()
  @ApiOperation({ summary: 'Validate phone number format' })
  @ApiResponse({
    status: 200,
    description: 'Phone validation result',
  })
  async validatePhone(@Body() data: ValidatePhoneDto) {
    const isValid = this.whatsappService.validatePhoneNumber(data.phoneNumber);
    const formatted = this.whatsappService.formatPhoneNumber(data.phoneNumber);
    return { isValid, formatted };
  }

  @Post('parse-link')
  @Public()
  @ApiOperation({ summary: 'Parse WhatsApp link to extract phone and message' })
  @ApiResponse({
    status: 200,
    description: 'Parsed WhatsApp link data',
  })
  async parseLink(@Body('link') link: string) {
    const parsed = this.whatsappService.parseWhatsAppLink(link);
    return parsed;
  }
}
