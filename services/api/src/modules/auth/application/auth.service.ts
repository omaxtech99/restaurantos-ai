import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  AuthSessionResponse,
  AuthUser,
  ForgotPasswordRequest,
  LoginRequest,
  PinLoginRequest,
  RefreshRequest,
  ResetPasswordRequest,
  SignupRequest,
  VerifyEmailRequest,
} from '@restaurantos/types';
import { PrismaService } from '../../database/prisma.service';
import { TenantService } from '../../tenant/application/tenant.service';
import { RbacService } from '../../rbac/application/rbac.service';
import { AuditService } from '../../audit/application/audit.service';
import { NotificationService } from '../../notification/application/notification.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { AppConfigService } from '../../config/app-config.service';

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tenantService: TenantService,
    private readonly rbacService: RbacService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly config: AppConfigService,
  ) {}

  async signup(input: SignupRequest, meta: RequestMeta = {}): Promise<AuthSessionResponse> {
    const existing = await this.prismaService.prisma.user.findFirst({
      where: {
        email: input.email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const tenant = await this.tenantService.createTenant(input.tenantName);
    const passwordHash = await this.passwordService.hash(input.password);
    const emailVerificationToken = this.tokenService.createOpaqueToken();

    const user = await this.prismaService.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        emailVerificationTokenHash: this.tokenService.hashToken(emailVerificationToken),
        emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await this.rbacService.ensureOwnerRole(tenant.id, user.id);

    await this.prismaService.prisma.branch.create({
      data: { tenantId: tenant.id, name: 'Main' },
    });

    await this.notificationService.enqueueEmail({
      to: input.email.toLowerCase(),
      subject: 'Verify your RestaurantOS email',
      template: 'email-verification',
      payload: {
        verifyUrl: `${this.config.appUrl}/verify-email?token=${emailVerificationToken}`,
        firstName: user.firstName,
      },
    });

    const sessionResponse = await this.issueSession(user.id, meta);

    await this.auditService.write({
      action: 'auth.signup',
      tenantId: tenant.id,
      userId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await this.auditService.write({
      action: 'auth.email_verification_requested',
      tenantId: tenant.id,
      userId: user.id,
    });

    return sessionResponse;
  }

  async login(input: LoginRequest, meta: RequestMeta = {}): Promise<AuthSessionResponse> {
    const user = await this.findUserForAuth(input.email, input.tenantSlug);

    if (!user || !user.passwordHash) {
      await this.auditService.write({
        action: 'auth.failed_login',
        metadata: { email: input.email.toLowerCase() },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await this.passwordService.verify(user.passwordHash, input.password);
    if (!valid) {
      await this.auditService.write({
        action: 'auth.failed_login',
        tenantId: user.tenantId,
        userId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prismaService.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const sessionResponse = await this.issueSession(user.id, meta);

    await this.auditService.write({
      action: 'auth.login',
      tenantId: user.tenantId,
      userId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return sessionResponse;
  }

  /**
   * Lets an already-authenticated device (an owner or another staff member
   * logged in on a shared tablet) "switch user" to a PIN-only staff account
   * without re-entering an email/password. The caller's own tenant scopes
   * the lookup, so this can never be used to reach across tenants even if
   * a userId were guessed.
   */
  async pinLogin(
    callerTenantId: string,
    input: PinLoginRequest,
    meta: RequestMeta = {},
  ): Promise<AuthSessionResponse> {
    const user = await this.prismaService.prisma.user.findFirst({
      where: { id: input.userId, tenantId: callerTenantId, deletedAt: null },
    });

    if (!user || !user.pinHash) {
      throw new UnauthorizedException('Invalid PIN');
    }

    const valid = await this.passwordService.verify(user.pinHash, input.pin);
    if (!valid) {
      await this.auditService.write({
        action: 'auth.failed_pin_login',
        tenantId: callerTenantId,
        userId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Invalid PIN');
    }

    await this.prismaService.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const sessionResponse = await this.issueSession(user.id, meta);

    await this.auditService.write({
      action: 'auth.pin_login',
      tenantId: user.tenantId,
      userId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return sessionResponse;
  }

  async refresh(input: RefreshRequest, meta: RequestMeta = {}): Promise<AuthSessionResponse> {
    const payload = await this.tokenService.verifyRefreshToken(input.refreshToken);
    await this.sessionService.assertRefreshToken(payload.sessionId, input.refreshToken);

    const sessionResponse = await this.issueSession(payload.sub, meta, payload.sessionId);

    await this.auditService.write({
      action: 'auth.refresh',
      tenantId: payload.tenantId,
      userId: payload.sub,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return sessionResponse;
  }

  async logout(sessionId: string, userId: string, tenantId: string): Promise<{ success: true }> {
    await this.sessionService.revokeSession(sessionId);
    await this.auditService.write({
      action: 'auth.logout',
      tenantId,
      userId,
    });
    return { success: true };
  }

  async forgotPassword(input: ForgotPasswordRequest, meta: RequestMeta = {}): Promise<{ accepted: true }> {
    const user = await this.findUserForAuth(input.email, input.tenantSlug);
    if (user) {
      const resetToken = this.tokenService.createOpaqueToken();
      await this.prismaService.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetTokenHash: this.tokenService.hashToken(resetToken),
          passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      await this.notificationService.enqueueEmail({
        to: input.email.toLowerCase(),
        subject: 'Reset your RestaurantOS password',
        template: 'password-reset',
        payload: {
          resetUrl: `${this.config.appUrl}/reset-password?token=${resetToken}`,
          firstName: user.firstName,
        },
      });

      await this.auditService.write({
        action: 'auth.password_reset_requested',
        tenantId: user.tenantId,
        userId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
    }

    return { accepted: true };
  }

  async resetPassword(input: ResetPasswordRequest, meta: RequestMeta = {}): Promise<{ success: true }> {
    const tokenHash = this.tokenService.hashToken(input.token);
    const user = await this.prismaService.prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: {
          gt: new Date(),
        },
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await this.passwordService.hash(input.password);
    await this.prismaService.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    await this.prismaService.prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditService.write({
      action: 'auth.password_reset_completed',
      tenantId: user.tenantId,
      userId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { success: true };
  }

  async verifyEmail(input: VerifyEmailRequest): Promise<{ success: true }> {
    const tokenHash = this.tokenService.hashToken(input.token);
    const user = await this.prismaService.prisma.user.findFirst({
      where: {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: {
          gt: new Date(),
        },
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    await this.prismaService.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
    });

    await this.auditService.write({
      action: 'auth.email_verified',
      tenantId: user.tenantId,
      userId: user.id,
    });

    return { success: true };
  }

  async me(userId: string): Promise<AuthUser> {
    return this.buildAuthUser(userId);
  }

  private async issueSession(
    userId: string,
    meta: RequestMeta,
    existingSessionId?: string,
  ): Promise<AuthSessionResponse> {
    const authUser = await this.buildAuthUser(userId);

    let sessionId = existingSessionId;
    if (!sessionId) {
      const temporary = await this.sessionService.createSession({
        tenantId: authUser.tenantId,
        userId: authUser.id,
        refreshToken: this.tokenService.createOpaqueToken(),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      });
      sessionId = temporary.id;
    }

    const tokens = await this.tokenService.issueTokens({
      sub: authUser.id,
      email: authUser.email,
      tenantId: authUser.tenantId,
      roles: authUser.roles,
      permissions: authUser.permissions,
      sessionId,
    });

    await this.sessionService.replaceRefreshToken(sessionId, tokens.refreshToken);

    return {
      user: authUser,
      tokens,
    };
  }

  private async buildAuthUser(userId: string): Promise<AuthUser> {
    const user = await this.prismaService.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const access = await this.rbacService.getUserAccess(user.id);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      roles: access.roles,
      permissions: access.permissions,
    };
  }

  private async findUserForAuth(email: string, tenantSlug?: string) {
    if (tenantSlug) {
      const tenant = await this.prismaService.prisma.tenant.findFirst({
        where: { slug: tenantSlug, deletedAt: null },
      });
      if (!tenant) {
        return null;
      }
      return this.prismaService.prisma.user.findFirst({
        where: {
          tenantId: tenant.id,
          email: email.toLowerCase(),
          deletedAt: null,
        },
      });
    }

    return this.prismaService.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
