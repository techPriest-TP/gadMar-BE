import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const redirect = req.query.redirect ?? process.env.FRONTEND_URL;

    return {
      scope: ['email', 'profile'],
      state: encodeURIComponent(redirect),
    };
  }
}
