import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // passport-jwt does not expose enough type information for this constructor.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      jwtFromRequest: (request: Request) => JwtStrategy.fromRequest(request),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    /**
     * This object becomes `req.user`
     * and is used by RolesGuarden
     */
    return {
      id: user.id,
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
    };
  }

  private static fromRequest(request: Request) {
    return (
      JwtStrategy.fromAuthorizationHeader(request) ??
      JwtStrategy.fromAccessTokenCookie(request)
    );
  }

  private static fromAuthorizationHeader(request: Request) {
    const authorization = request.headers.authorization;
    if (!authorization?.toLowerCase().startsWith('bearer ')) return null;
    return authorization.slice('bearer '.length).trim();
  }

  private static fromAccessTokenCookie(request: Request) {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) return null;

    return (
      cookieHeader
        .split(';')
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith('accessToken='))
        ?.split('=')
        .slice(1)
        .join('=') ?? null
    );
  }
}
