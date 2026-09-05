import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WhatsAppService, WhatsAppCartItem } from './whatsapp.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';

class GenerateWhatsAppUrlDto {
  @ApiProperty({ example: '+2348012345678' })
  phoneNumber: string;

  @ApiProperty({ example: 'Apple Gadgets NG' })
  brandName: string;

  @ApiProperty({
    example: [{ productName: 'iPhone 15 Pro', unitPrice: 1250000, quantity: 1 }],
  })
  items: WhatsAppCartItem[];

  @ApiProperty({ example: 'GAD-1A2B3C4D' })
  refCode: string;

  @ApiProperty({ required: false, example: 'Hello, I want to buy this item.' })
  customMessage?: string;
}

class ValidatePhoneDto {
  @ApiProperty({ example: '+2348012345678' })
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
  @ApiBody({ type: GenerateWhatsAppUrlDto })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp URL generated successfully',
    schema: {
      example: {
        url: 'https://wa.me/2348012345678?text=Hello...',
      },
    },
  })
  async generateUrl(@Body() data: GenerateWhatsAppUrlDto) {
    const url = this.whatsappService.generateWhatsAppUrl(data);
    return { url };
  }

  @Get('generate-message')
  @Public()
  @ApiOperation({ summary: 'Generate pre-filled WhatsApp message' })
  @ApiQuery({
    name: 'productName',
    required: true,
    type: String,
    example: 'iPhone 15 Pro',
    description: 'Product name to include in the WhatsApp message.',
  })
  @ApiQuery({
    name: 'productPrice',
    required: true,
    type: Number,
    example: 1250000,
    description: 'Product price to include in the WhatsApp message.',
  })
  @ApiQuery({
    name: 'refCode',
    required: true,
    type: String,
    example: 'GAD-1A2B3C4D',
    description: 'Purchase intent reference code.',
  })
  @ApiResponse({
    status: 200,
    description: 'Message generated successfully',
    schema: {
      example: {
        message:
          'Hello Seller, I am interested in buying iPhone 15 Pro. Reference: GAD-1A2B3C4D',
      },
    },
  })
  async generateMessage(
    @Query('productName') productName: string,
    @Query('productPrice') productPrice: string,
    @Query('refCode') refCode: string,
  ) {
    const message = this.whatsappService.generatePreFilledMessage(
      {
        brandName: 'Seller',
        refCode,
        items: [{ productName, unitPrice: parseFloat(productPrice) || 0, quantity: 1 }],
      },
    );
    return { message };
  }

  @Post('validate-phone')
  @Public()
  @ApiOperation({ summary: 'Validate phone number format' })
  @ApiBody({ type: ValidatePhoneDto })
  @ApiResponse({
    status: 200,
    description: 'Phone validation result',
    schema: {
      example: {
        isValid: true,
        formatted: '+2348012345678',
      },
    },
  })
  async validatePhone(@Body() data: ValidatePhoneDto) {
    const isValid = this.whatsappService.validatePhoneNumber(data.phoneNumber);
    const formatted = this.whatsappService.formatPhoneNumber(data.phoneNumber);
    return { isValid, formatted };
  }

  @Post('parse-link')
  @Public()
  @ApiOperation({ summary: 'Parse WhatsApp link to extract phone and message' })
  @ApiBody({
    schema: {
      properties: {
        link: {
          type: 'string',
          example:
            'https://wa.me/2348012345678?text=Hello%2C%20I%20want%20to%20buy%20this%20item',
        },
      },
      required: ['link'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Parsed WhatsApp link data',
    schema: {
      example: {
        phoneNumber: '+2348012345678',
        message: 'Hello, I want to buy this item',
      },
    },
  })
  async parseLink(@Body('link') link: string) {
    const parsed = this.whatsappService.parseWhatsAppLink(link);
    return parsed;
  }
}
