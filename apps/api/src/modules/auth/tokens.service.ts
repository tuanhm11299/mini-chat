import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import type { Env } from '../../config/env.validation';
import { RefreshToken } from './entities/refresh-token.entity';

/**
 * A rotated refresh token keeps working for this long. Two browser tabs often refresh at the
 * same moment with the same cookie; without a grace period the slower tab would be logged out.
 */
const ROTATION_GRACE_MS = 30_000;

export interface IssuedRefreshToken {
  /** Cookie value: `<row id>.<secret>`. */
  token: string;
  expiresAt: Date;
}

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    @InjectRepository(RefreshToken) private readonly refreshTokens: Repository<RefreshToken>,
  ) {}

  signAccessToken(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId });
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      return { id: payload.sub };
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  async issueRefreshToken(userId: string): Promise<IssuedRefreshToken> {
    // Housekeeping: drop this user's tokens that can no longer be used.
    await this.refreshTokens.delete({ userId, expiresAt: LessThan(new Date()) });

    const secret = randomBytes(32).toString('base64url');
    const days = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const row = await this.refreshTokens.save(
      this.refreshTokens.create({ userId, tokenHash: hash(secret), expiresAt, revokedAt: null }),
    );
    return { token: `${row.id}.${secret}`, expiresAt };
  }

  /** Swaps a valid refresh token for a new one. Returns the owner's id. */
  async rotateRefreshToken(
    token: string,
  ): Promise<{ userId: string; refreshToken: IssuedRefreshToken }> {
    const row = await this.findValidRow(token);
    if (!row) throw new UnauthorizedException('Invalid or expired session');

    // Only the first rotation marks it; tabs inside the grace period don't extend it.
    await this.refreshTokens.update({ id: row.id, revokedAt: IsNull() }, { revokedAt: new Date() });
    return { userId: row.userId, refreshToken: await this.issueRefreshToken(row.userId) };
  }

  /** Logout: the token stops working immediately (no grace period). */
  async deleteRefreshToken(token: string): Promise<void> {
    const row = await this.findValidRow(token);
    if (row) await this.refreshTokens.delete({ id: row.id });
  }

  private async findValidRow(token: string): Promise<RefreshToken | null> {
    const [id, secret] = token.split('.');
    if (!id || !secret || !isUuid(id)) return null;

    const row = await this.refreshTokens.findOneBy({ id });
    if (!row || !safeEqual(row.tokenHash, hash(secret))) return null;
    if (row.expiresAt.getTime() <= Date.now()) return null;
    if (row.revokedAt && Date.now() - row.revokedAt.getTime() > ROTATION_GRACE_MS) return null;
    return row;
  }
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
