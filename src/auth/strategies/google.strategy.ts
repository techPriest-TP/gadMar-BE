import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy, Profile } from 'passport-google-oauth20';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: config.get<string>('GOOGLE_CLIENT_CALLBACK_URL'),
      scope: ['email', 'profile'],
      //   prompt: 'select_account',
      passReqToCallback: false,
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      throw new Error('Google account has no email');
    }

    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { authProviders: true },
    });
    const firstName = profile.name?.givenName ?? '';
    const lastName = profile.name?.familyName ?? '';

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: firstName + lastName,
          // isVerified: true,
          authProviders: {
            create: {
              provider: 'GOOGLE',
              providerId: profile.id,
            },
          },
        },
        include: { authProviders: true },
      });
    }

    return user;
  }
}
