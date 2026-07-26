import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WhatsAppCartItem { productName: string; unitPrice: number; quantity: number }
export interface WhatsAppMessageData {
  phoneNumber: string;
  refCode: string;
  brandName: string;
  items: WhatsAppCartItem[];
  customMessage?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly baseUrl: string;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.get<string>('WHATSAPP_API_URL', 'https://wa.me');
  }

  generatePreFilledMessage(data: Omit<WhatsAppMessageData, 'phoneNumber'>): string {
    if (data.customMessage) return data.customMessage;
    const lines = data.items.map(
      (item) => `- ${item.productName} x${item.quantity} (₦${(item.unitPrice * item.quantity).toLocaleString()})`,
    );
    const total = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    return `Hi ${data.brandName}, I'd like to buy:\n${lines.join('\n')}\n\nTotal: ₦${total.toLocaleString()}\nReference: ${data.refCode}`;
  }

  generateWhatsAppUrl(data: WhatsAppMessageData): string {
    const phone = this.formatPhoneNumber(this.parseWhatsAppLink(data.phoneNumber).phoneNumber);
    const message = this.generatePreFilledMessage(data);
    return `${this.baseUrl}/${phone}?text=${encodeURIComponent(message)}`;
  }

  parseWhatsAppLink(link: string): { phoneNumber: string; message?: string } {
    try {
      const url = new URL(link.startsWith('http') ? link : `https://wa.me/${link}`);
      return { phoneNumber: url.pathname.replace(/\//g, ''), message: url.searchParams.get('text') || undefined };
    } catch {
      return { phoneNumber: link.replace(/\D/g, '') };
    }
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    const phone = phoneNumber.replace(/\D/g, '');
    return (phone.startsWith('234') && phone.length === 13) || (phone.startsWith('0') && phone.length === 11);
  }

  formatPhoneNumber(phoneNumber: string): string {
    const phone = phoneNumber.replace(/\D/g, '');
    return phone.startsWith('0') && phone.length === 11 ? `234${phone.slice(1)}` : phone;
  }
}
