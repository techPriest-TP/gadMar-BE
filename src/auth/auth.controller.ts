import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  // Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { GoogleAuthGuard } from 'src/common/guards/google-auth.guard';
// import { getClientUrl } from 'src/utils/helpers';
import type { RequestUser } from '../common/decorators/user.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './otp.service';
// import { NotificationService } from 'src/notification/service';

export enum Platform {
  MOBILE = 'mobile',
  WEB = 'dashboard',
}
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    // private readonly service: NotificationService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      example: {
        message: 'Account created successfully',
        user: {
          id: 'user-id',
          firstName: 'Ada',
          lastName: 'Okafor',
          email: 'ada@example.com',
          phone: '+2348012345678',
          role: 'USER',
          createdAt: '2026-09-05T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @UseGuards(AuthGuard('local'))
  @ApiBody({ type: LoginDto })
  @ApiQuery({
    enum: Platform,
    required: false,
    name: 'platform',
    description: 'Client platform requesting the session.',
  })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged in',
    schema: {
      example: {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'user-id',
            email: 'ada@example.com',
            role: 'USER',
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Req() req, @Query('platform') platform: Platform) {
    return this.authService.login(req.user, platform);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        message: 'Profile retrieved successfully',
        user: {
          userId: 'user-id',
          email: 'ada@example.com',
          role: 'USER',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: RequestUser) {
    return {
      message: 'Profile retrieved successfully',
      user,
    };
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      example: {
        message: 'Password changed successfully',
        success: true,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  async logout(@CurrentUser() user: RequestUser) {
    return this.authService.logout(user.id);
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    schema: {
      properties: {
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tokens refreshed successfully',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        message: 'Tokens refreshed successfully',
        success: true,
      },
    },
  })
  async refreshTokens(@Body() payload: { refreshToken: string }) {
    const tokens = await this.authService.refreshTokens(payload.refreshToken);
    return {
      ...tokens,
      message: 'Tokens refreshed successfully',
      success: true,
    };
  }

  // @Post('forgot-password')
  // async forgot(@Body() dto: ForgotPasswordDto, @Req() request: req) {
  //   console.log({ dto });
  //   // console.log('request headers: ', request);
  //   const origin = getClientUrl(request) ?? 'http://localhost:3000';
  //   console.log('origin: ', origin);
  //   await this.authService.requestReset(dto.email, origin);
  //   return { message: 'If account exists, email sent', success: true };
  // }
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset OTP' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 201,
    description: 'Password reset OTP request accepted',
    schema: {
      example: {
        message: 'If account exists, email sent',
        success: true,
      },
    },
  })
  async forgot(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestReset(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 201,
    description: 'Password reset successfully',
    schema: {
      example: {
        message: 'Password reset successful',
        success: true,
      },
    },
  })
  async reset(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.otp, dto.newPassword, dto.email);
    return { message: 'Password reset successful', success: true };
  }

  @Post('/otp/request')
  @ApiOperation({ summary: 'Request an email OTP' })
  @ApiBody({ type: RequestOtpDto })
  @ApiResponse({
    status: 201,
    description: 'OTP request accepted',
    schema: {
      example: {
        message: 'OTP sent successfully',
        success: true,
      },
    },
  })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.otpService.requestOtp(dto.email);
  }

  @Post('/otp/verify')
  @ApiOperation({ summary: 'Verify an email OTP' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 201,
    description: 'OTP verification result',
    schema: {
      example: {
        message: 'OTP verified successfully',
        success: true,
      },
    },
  })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto.email, dto.otp);
  }

  // @ApiTags('Authentication')
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Google OAuth signup / login',
    description:
      'Initiates Google OAuth flow. Optionally accepts a redirect URL that the user will be sent to after successful authentication.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects the user to Google OAuth.',
  })
  @ApiQuery({
    name: 'redirect',
    required: false,
    type: String,
    example: 'https://app.yoursite.com/dashboard',
    description:
      'Frontend redirect URL after successful Google authentication. Must be a valid, allowed frontend URL.',
  })
  async googleAuth() {
    // Handled entirely by Passport (redirects to Google)
  }

  // @ApiTags('Mobile Authentication with Firebase')
  // @Post('firebase-login')
  // async firebaseLogin(@Body('token') token: string) {
  //   const { authProviders, ...userData } =
  //     await this.service.authenticateWithFirebase(token);
  //   const { accessToken, refreshToken } =
  //     await this.authService.generateTokens(userData);
  //   return {
  //     message: 'Successfully authenticated with Firebase',
  //     data: {
  //       user: userData,
  //       accessToken,
  //       refreshToken,
  //     },
  //   };
  // }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Google OAuth callback',
    description:
      'Handles Google OAuth callback, generates application auth tokens, and returns the frontend redirect URL with access token attached.',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    type: String,
    example: 'https://app.yoursite.com/dashboard',
    description:
      'Encoded redirect URL originally passed from the frontend during Google OAuth initiation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful Google authentication',
    schema: {
      example: {
        redirect:
          'https://app.yoursite.com/dashboard?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  async googleCallback(@Req() req, @Res() res) {
    const token = await this.authService.login(req.user);

    const state = req.query.state
      ? decodeURIComponent(req.query.state as string)
      : process.env.FRONTEND_URL;

    res.redirect(`${state}?token=${token.data.accessToken}`);
  }
}
