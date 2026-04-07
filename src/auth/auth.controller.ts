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
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import type { Request as req } from 'express';
import { GoogleAuthGuard } from 'src/common/guards/google-auth.guard';
// import { getClientUrl } from 'src/utils/helpers';
import type { RequestUser } from '../common/decorators/user.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
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
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @UseGuards(AuthGuard('local'))
  @ApiQuery({
    enum: Platform,
    required: false,
    name: 'platform',
  })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
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
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
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
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(@CurrentUser() user: RequestUser) {
    return this.authService.logout(user.id);
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshTokens(@Body() payload: { refreshToken: string }) {
    console.log({ payload });
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
  async forgot(@Body() dto: ForgotPasswordDto, @Req() request: req) {
    console.log({ dto });
    // console.log('request headers: ', request);
    // const origin = getClientUrl(request) ?? 'http://localhost:3000';
    console.log('origin: ', origin);
    return await this.authService.requestReset(dto.email);
    // return { message: 'If account exists, email sent', success: true };
  }

  @Post('reset-password')
  async reset(@Body() dto: ResetPasswordDto) {
    console.log({ dto });
    await this.authService.resetPassword(dto.otp, dto.newPassword, dto.email);
    return { message: 'Password reset successful', success: true };
  }

  @Post('/otp/request')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.otpService.requestOtp(dto.email);
  }

  @Post('/otp/verify')
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
  @ApiQuery({
    name: 'redirect',
    required: false,
    type: String,
    example: 'https://app.yoursite.com/dashboard',
    description:
      'Frontend redirect URL after successful Google authentication. Must be a valid, allowed frontend URL.',
  })
  async googleAuth(@Req() req: Request) {
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

  @ApiTags('Web Authentication')
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
