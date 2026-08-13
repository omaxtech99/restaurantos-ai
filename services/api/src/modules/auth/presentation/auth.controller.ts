import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from '../application/auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  PinLoginDto,
  RefreshDto,
  ResetPasswordDto,
  SignupDto,
  StaffLoginDto,
  VerifyEmailDto,
} from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedRequest } from '../domain/authenticated-request';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() body: SignupDto, @Req() req: Request) {
    return this.authService.signup(body, this.meta(req));
  }

  @Post('login')
  login(@Body() body: LoginDto, @Req() req: Request) {
    return this.authService.login(body, this.meta(req));
  }

  @Post('refresh')
  refresh(@Body() body: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(body, this.meta(req));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('pin-login')
  pinLogin(@Body() body: PinLoginDto, @Req() req: AuthenticatedRequest) {
    return this.authService.pinLogin(req.user!.tenantId, body, this.meta(req));
  }

  @Get('staff-login/:tenantSlug')
  staffLoginOptions(@Param('tenantSlug') tenantSlug: string) {
    return this.authService.getStaffLoginOptions(tenantSlug);
  }

  @Post('staff-login')
  staffLogin(@Body() body: StaffLoginDto, @Req() req: Request) {
    return this.authService.staffLogin(body, this.meta(req));
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(body, this.meta(req));
  }

  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto, @Req() req: Request) {
    return this.authService.resetPassword(body, this.meta(req));
  }

  @Post('verify-email')
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: AuthenticatedRequest) {
    const user = req.user;
    if (!user) {
      return { success: true };
    }
    return this.authService.logout(user.sessionId, user.sub, user.tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return this.authService.me(req.user!.sub);
  }

  private meta(req: Request) {
    return {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }
}
