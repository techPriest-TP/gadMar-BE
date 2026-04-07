/** @format */

import { ConfigService } from '@nestjs/config';
import axios from 'axios';
// import { configs } from 'src/utils/config';

class Postmark {
  private PostMarkUrl: string = '';
  private PostMarkToken: string = '';
  private PostMarkFromEmail: string;
  constructor(private readonly configService: ConfigService) {
    this.PostMarkUrl = this.configService.get<string>('POSTMARK_URL') || '';
    this.PostMarkToken = this.configService.get<string>('POSTMARK_TOKEN') || '';
    this.PostMarkFromEmail =
      this.configService.get<string>('POSTMARK_FROM_EMAIL') || ' ';
  }
  private http = axios.create({
    baseURL: this.PostMarkUrl,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Postmark-Server-Token': this.PostMarkToken,
    },
  });

  public async send(email: string, tag: string, subject: string, body: string) {
    console.log('url: ', this.PostMarkUrl);
    console.log('token: ', this.PostMarkToken);
    const data = {
      Tag: tag,
      To: email,
      HtmlBody: body,
      Subject: subject,
      TrackOpens: true,
      TrackLinks: 'HtmlOnly',
      MessageStream: 'outbound',
      From: `Isuna ${this.PostMarkFromEmail}`,
    };
    const resData = await this.http.post('/email', data);
    return resData;
  }
}

export default Postmark;
