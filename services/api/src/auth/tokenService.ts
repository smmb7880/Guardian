import * as crypto from 'crypto';
import { getEnv } from '../config/env';
import { UserRole } from '@guardian/shared-types';
import { AppError } from '../middleware/errorHandler';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  familyId?: string;
  exp: number; // UTC timestamp in seconds
  iat: number;
}

export interface RefreshTokenPayload {
  sessionId: string;
  userId: string;
  tokenVersion: number;
  exp: number;
  iat: number;
}

export class TokenService {
  private static base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  private static base64UrlDecode(str: string): string {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    return Buffer.from(str, 'base64').toString('utf8');
  }

  /**
   * Signs a JWT payload with HMAC-SHA256 signature using JWT_SECRET.
   */
  private static signJwt(payload: Record<string, unknown>): string {
    const env = getEnv();
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

    const signature = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  public static signAccessToken(
    userId: string,
    email: string,
    role: UserRole,
    familyId?: string,
    ttlSeconds: number = 900, // 15 minutes
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: AccessTokenPayload = {
      userId,
      email,
      role,
      familyId,
      iat: now,
      exp: now + ttlSeconds,
    };
    return this.signJwt(payload as unknown as Record<string, unknown>);
  }

  public static signRefreshToken(
    sessionId: string,
    userId: string,
    tokenVersion: number = 1,
    ttlSeconds: number = 604800, // 7 days
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: RefreshTokenPayload = {
      sessionId,
      userId,
      tokenVersion,
      iat: now,
      exp: now + ttlSeconds,
    };
    return this.signJwt(payload as unknown as Record<string, unknown>);
  }

  /**
   * Verifies signature and expiration of JWT token string.
   */
  public static verifyToken<T extends { exp: number }>(token: string): T {
    const env = getEnv();
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new AppError(401, 'INVALID_TOKEN', 'Authentication token format is invalid.');
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      throw new AppError(401, 'INVALID_TOKEN_SIGNATURE', 'Authentication token signature mismatch.');
    }

    const payload = JSON.parse(this.base64UrlDecode(encodedPayload)) as T;
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Authentication token has expired.');
    }

    return payload;
  }
}
