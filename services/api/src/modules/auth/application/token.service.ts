import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import type { AuthTokens, JwtAccessPayload, JwtRefreshPayload } from '@restaurantos/types';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async issueTokens(payload: Omit<JwtAccessPayload, 'type'>): Promise<AuthTokens> {
    const accessToken = await this.jwtService.signAsync(
      { ...payload, type: 'access' satisfies JwtAccessPayload['type'] },
      {
        secret: this.config.jwtAccessSecret,
        expiresIn: this.config.jwtAccessTtl,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: payload.sub,
        tenantId: payload.tenantId,
        sessionId: payload.sessionId,
        type: 'refresh',
      } satisfies JwtRefreshPayload,
      {
        secret: this.config.jwtRefreshSecret,
        expiresIn: this.config.jwtRefreshTtl,
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.jwtAccessTtl,
    };
  }

  async verifyAccessToken(token: string): Promise<JwtAccessPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtAccessPayload>(token, {
        secret: this.config.jwtAccessSecret,
      });
      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid access token');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<JwtRefreshPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(token, {
        secret: this.config.jwtRefreshSecret,
      });
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  createOpaqueToken(): string {
    return randomBytes(32).toString('hex');
  }

  getRefreshExpiryDate(): Date {
    return this.parseDurationToDate(this.config.jwtRefreshTtl);
  }

  private parseDurationToDate(ttl: string): Date {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match || !match[1] || !match[2]) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    const value = Number(match[1]);
    const unit = match[2] as 's' | 'm' | 'h' | 'd';
    const multipliers: Record<'s' | 'm' | 'h' | 'd', number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return new Date(Date.now() + value * multipliers[unit]);
  }
}
