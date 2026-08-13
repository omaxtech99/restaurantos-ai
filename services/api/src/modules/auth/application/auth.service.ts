import {
  ConflictException,
  Injectable,
  NotFoundException,
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
  StaffLoginOptionsResponse,
  StaffLoginRequest,
  VerifyEmailRequest,
} from '@restaurantos/types';
import { PrismaService } from '../../database/prisma.service';
import { TenantService } from '../../tenant/application/tenant.service';
import { RbacService } from '../../rbac/application/rbac.service';
import { AuditService } from '../../audit/application/audit.service';
import { NotificationService } from '../../notification/application/notification.service';
import { RedisService } from '../../redis/redis.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { AppConfigService } from '../../config/app-config.service';

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

/** Standalone staff login has no prior device session, so it's a public endpoint — lock it down against PIN brute-forcing. */
const STAFF_LOGIN_MAX_ATTEMPTS = 8;
const STAFF_LOGIN_LOCKOUT_WINDOW_SECONDS = 15 * 60;

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
    private readonly redisService: RedisService,
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
    return this.performPinLogin(callerTenantId, input, meta);
  }

  /**
   * Lets a fresh device with no prior session sign in directly as a PIN-only
   * staff account — the waiter/kitchen equivalent of email+password login.
   * The restaurant's tenant slug (shown to the owner on the Staff page)
   * stands in for "which tenant" the way email normally does; it's not
   * secret, so brute-force protection lives on the PIN attempt itself, via
   * a Redis-backed lockout keyed by tenant+user, mirroring the cooldown
   * pattern already used for `PublicService.callWaiter`.
   */
  async staffLogin(input: StaffLoginRequest, meta: RequestMeta = {}): Promise<AuthSessionResponse> {
    const tenant = await this.prismaService.prisma.tenant.findFirst({
      where: { slug: input.tenantSlug, deletedAt: null },
    });

    if (!tenant) {
      throw new UnauthorizedException('Invalid PIN');
    }

    await this.redisService.connect();
    const attemptsKey = `staff-login-attempts:${tenant.id}:${input.userId}`;
    const attempts = await this.redisService.redis.incr(attemptsKey);
    if (attempts === 1) {
      await this.redisService.redis.expire(attemptsKey, STAFF_LOGIN_LOCKOUT_WINDOW_SECONDS);
    }
    if (attempts > STAFF_LOGIN_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Too many attempts — wait a few minutes and try again');
    }

    const sessionResponse = await this.performPinLogin(tenant.id, input, meta);
    await this.redisService.redis.del(attemptsKey);
    return sessionResponse;
  }

  /** Public staff-picker for the standalone login page — names only, scoped strictly by the resolved tenant. */
  async getStaffLoginOptions(tenantSlug: string): Promise<StaffLoginOptionsResponse> {
    const tenant = await this.prismaService.prisma.tenant.findFirst({
      where: { slug: tenantSlug, deletedAt: null },
    });

    if (!tenant) {
      throw new NotFoundException('Restaurant not found — check the code and try again');
    }

    const staff = await this.prismaService.prisma.user.findMany({
      where: { tenantId: tenant.id, deletedAt: null, pinHash: { not: null } },
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return {
      tenantName: tenant.name,
      staff: staff.map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map((userRole) => userRole.role.name),
        createdAt: user.createdAt.toISOString(),
      })),
    };
  }

  private async performPinLogin(
    tenantId: string,
    input: PinLoginRequest,
    meta: RequestMeta = {},
  ): Promise<AuthSessionResponse> {
    const user = await this.prismaService.prisma.user.findFirst({
      where: { id: input.userId, tenantId, deletedAt: null },
    });

    if (!user || !user.pinHash) {
      throw new UnauthorizedException('Invalid PIN');
    }

    const valid = await this.passwordService.verify(user.pinHash, input.pin);
    if (!valid) {
      await this.auditService.write({
        action: 'auth.failed_pin_login',
        tenantId,
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
      include: { tenant: true },
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
      tenantSlug: user.tenant.slug,
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
