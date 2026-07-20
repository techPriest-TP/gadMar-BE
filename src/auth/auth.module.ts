import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
// import { VirtualAccountService } from "@/ninepsb-virtual-account/virtual-account.service";
// import { HttpModule } from "@nestjs/axios";
import { JwtModuleOptions } from '@nestjs/jwt';
// import { NinepsbService } from "@/ninepsb-virtual-account/ninepsb.service";
import { PrismaService } from 'src/prisma/prisma.service';
import ms from 'ms';
import { OtpService } from './otp.service';
import { AgendaModule } from 'src/queue/agenda.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { NotificationService } from 'src/notification/service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],

      useFactory: async (
        configService: ConfigService,
      ): Promise<JwtModuleOptions> => {
        return {
          secret: configService.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: (configService.get<string>('JWT_EXPIRE') ||
              '1h') as ms.StringValue,
          },
        };
      },
      inject: [ConfigService],
    }),
    AgendaModule,
    // HttpModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    // VirtualAccountService,
    PrismaService,
    OtpService,
    GoogleStrategy,
    NotificationService,
    // NinepsbService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
