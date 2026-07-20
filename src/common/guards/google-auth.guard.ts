import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const configured = [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_CLIENT_CALLBACK_URL',
    ].every((key) => Boolean(this.configService.get<string>(key)));

    if (!configured) {
      throw new ServiceUnavailableException('Google OAuth is not configured');
    }

    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const redirect =
      request.query.redirect ??
      this.configService.getOrThrow<string>('FRONTEND_URL');

    return {
      scope: ['email', 'profile'],
      state: encodeURIComponent(redirect),
    };
  }
}
