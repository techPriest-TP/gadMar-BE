import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WhatsAppMessageData {
  phoneNumber: string;
  productName: string;
  productPrice: number;
  refCode: string;
  productUrl?: string;
  customMessage?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('WHATSAPP_API_URL', 'https://wa.me');
  }

  generateWhatsAppUrl(data: WhatsAppMessageData): string {
    const { phoneNumber, productName, productPrice, refCode, productUrl, customMessage } = data;

    // Clean phone number (remove non-numeric characters)
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    // Build message
    let message: string;
    if (customMessage) {
      message = customMessage;
    } else {
      message = this.buildDefaultMessage(productName, productPrice, refCode, productUrl);
    }

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    return `${this.baseUrl}/${cleanPhone}?text=${encodedMessage}`;
  }

  generatePreFilledMessage(
    productName: string,
    productPrice: number,
    refCode: string,
    productUrl?: string,
  ): string {
    return this.buildDefaultMessage(productName, productPrice, refCode, productUrl);
  }

  private buildDefaultMessage(
    productName: string,
    productPrice: number,
    refCode: string,
    productUrl?: string,
  ): string {
    let message = `Hi, I'm interested in the ${productName}`;
    
    if (productPrice > 0) {
      message += ` (₦${productPrice.toLocaleString()})`;
    }
    
    message += `.`;

    if (refCode) {
      message += `\n\nRefCode: ${refCode}`;
    }

    if (productUrl) {
      message += `\n\nProduct: ${productUrl}`;
    }

    return message;
  }

  parseWhatsAppLink(link: string): { phoneNumber: string; message?: string } {
    try {
      const url = new URL(link);
      const phoneNumber = url.pathname.replace('/', '');
      const message = url.searchParams.get('text') || undefined;

      return {
        phoneNumber,
        message: message ? decodeURIComponent(message) : undefined,
      };
    } catch (error) {
      // If not a valid URL, try to extract phone number directly
      const cleanPhone = link.replace(/\D/g, '');
      return { phoneNumber: cleanPhone };
    }
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    // Basic validation for Nigerian phone numbers
    // Supports formats: +2348012345678, 2348012345678, 08012345678
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Check if it starts with 234 (country code) or 0 (local)
    if (cleanPhone.startsWith('234')) {
      return cleanPhone.length === 13;
    } else if (cleanPhone.startsWith('0')) {
      return cleanPhone.length === 11;
    }
    
    return false;
  }

  formatPhoneNumber(phoneNumber: string): string {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Convert local format to international
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      return '234' + cleanPhone.substring(1);
    }
    
    return cleanPhone;
  }
}
