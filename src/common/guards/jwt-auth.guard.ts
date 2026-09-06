import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable, lastValueFrom } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isPublic) return this.resolveGuardResult(super.canActivate(context));

    const request = context.switchToHttp().getRequest();
    const authorization = request.headers?.authorization;
    const hasBearerToken =
      typeof authorization === 'string' &&
      authorization.toLowerCase().startsWith('bearer ');

    if (!hasBearerToken) return true;

    try {
      return await this.resolveGuardResult(super.canActivate(context));
    } catch {
      return true;
    }
  }

  private async resolveGuardResult(
    result: boolean | Promise<boolean> | Observable<boolean>,
  ): Promise<boolean> {
    if (result instanceof Observable) return lastValueFrom(result);
    return result;
  }
}
