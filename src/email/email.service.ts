import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

type EmailProvider = 'postmark' | 'resend';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  tag?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly provider: EmailProvider;
  private readonly client: AxiosInstance;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService
      .get<string>('EMAIL_PROVIDER', 'postmark')
      .toLowerCase() as EmailProvider;

    if (this.provider === 'resend') {
      this.fromEmail =
        this.configService.getOrThrow<string>('RESEND_FROM_EMAIL');
      this.client = axios.create({
        baseURL: this.configService.get<string>(
          'RESEND_API_URL',
          'https://api.resend.com',
        ),
        headers: {
          Authorization: `Bearer ${this.configService.getOrThrow<string>('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
          'User-Agent': 'GadMar API',
        },
      });
      return;
    }

    this.fromEmail = this.configService.getOrThrow<string>(
      'POSTMARK_FROM_EMAIL',
    );
    this.client = axios.create({
      baseURL: this.configService.getOrThrow<string>('POSTMARK_URL'),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token':
          this.configService.getOrThrow<string>('POSTMARK_TOKEN'),
      },
    });
  }

  async sendEmail(params: SendEmailParams): Promise<void> {
    try {
      if (this.provider === 'resend') {
        await this.sendWithResend(params);
      } else {
        await this.sendWithPostmark(params);
      }
    } catch (error) {
      this.logger.error(`${this.provider} email delivery failed`, error);
      throw error;
    }
  }

  private async sendWithPostmark(params: SendEmailParams): Promise<void> {
    await this.client.post('/email', {
      To: params.to,
      From: `GadMar <${this.fromEmail}>`,
      Subject: params.subject,
      HtmlBody: params.html,
      Tag: params.tag ?? 'transactional',
      TrackOpens: true,
      MessageStream: 'outbound',
    });
  }

  private async sendWithResend(params: SendEmailParams): Promise<void> {
    await this.client.post('/emails', {
      from: `GadMar <${this.fromEmail}>`,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      tags: params.tag
        ? [{ name: 'category', value: this.normalizeTag(params.tag) }]
        : undefined,
    });
  }

  private normalizeTag(tag: string): string {
    return tag.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 256);
  }
}
