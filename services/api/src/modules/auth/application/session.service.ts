import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TokenService } from './token.service';

@Injectable()
export class SessionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async createSession(input: {
    tenantId: string;
    userId: string;
    refreshToken: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return this.prismaService.prisma.session.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        refreshTokenHash: this.tokenService.hashToken(input.refreshToken),
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        expiresAt: this.tokenService.getRefreshExpiryDate(),
      },
    });
  }

  async getActiveSession(sessionId: string) {
    return this.prismaService.prisma.session.findFirst({
      where: {
        id: sessionId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  async assertRefreshToken(sessionId: string, refreshToken: string) {
    const session = await this.getActiveSession(sessionId);
    if (!session) {
      throw new UnauthorizedException('Session expired');
    }

    const incomingHash = this.tokenService.hashToken(refreshToken);
    if (session.refreshTokenHash !== incomingHash) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    return session;
  }

  async replaceRefreshToken(sessionId: string, refreshToken: string) {
    return this.prismaService.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: this.tokenService.hashToken(refreshToken),
        expiresAt: this.tokenService.getRefreshExpiryDate(),
      },
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prismaService.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
