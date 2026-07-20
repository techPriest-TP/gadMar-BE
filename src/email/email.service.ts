import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private PostMarkUrl: string = '';
  private PostMarkToken: string = '';
  private PostMarkFromEmail: string;
  constructor(private readonly configService: ConfigService) {
    this.PostMarkUrl = this.configService.getOrThrow<string>('POSTMARK_URL');
    this.PostMarkToken =
      this.configService.getOrThrow<string>('POSTMARK_TOKEN');
    this.PostMarkFromEmail =
      this.configService.getOrThrow<string>('POSTMARK_FROM_EMAIL');
  }

  // private http = axios.create({
  //   baseURL: this.PostMarkUrl,
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Accept: 'application/json',
  //     'X-Postmark-Server-Token': this.PostMarkToken,
  //   },
  // });

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    tag?: string;
  }) {
    // console.log('PostMarkFromEmail: ', this.PostMarkFromEmail);
    // console.log('PostMarkUrl: ', this.PostMarkUrl);
    // console.log('PostMarkToken: ', this.PostMarkToken);
    try {
      // console.log('http: ', this.http);
      await axios
        .create({
          baseURL: this.PostMarkUrl,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Postmark-Server-Token': this.PostMarkToken,
          },
        })
        .post('/email', {
          To: params.to,
          From: `GadMar <${this.PostMarkFromEmail}>`,
          Subject: params.subject,
          HtmlBody: params.html,
          Tag: params.tag ?? 'transactional',
          TrackOpens: true,
          MessageStream: 'outbound',
        });
    } catch (error) {
      this.logger.error('Postmark send failed', error);
      throw error;
    }
  }
}
