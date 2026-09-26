import { TokenService, RefreshTokenPayload } from './tokenService';
import { HashService } from './hashService';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@guardian/shared-types';

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  isRevoked: boolean;
  expiresAt: number; // UTC seconds
  createdAt: number;
  lastUsedAt: number;
}

export class SessionService {
  private static sessions: Map<string, SessionRecord> = new Map();

  public static createSession(
    userId: string,
    email: string,
    role: UserRole,
    familyId?: string,
  ): { sessionId: string; accessToken: string; refreshToken: string } {
    const sessionId = HashService.generateRandomToken(16);
    const refreshToken = TokenService.signRefreshToken(sessionId, userId);
    const accessToken = TokenService.signAccessToken(userId, email, role, familyId);
    const tokenHash = HashService.hashToken(refreshToken);

    const now = Math.floor(Date.now() / 1000);
    const record: SessionRecord = {
      id: sessionId,
      userId,
      tokenHash,
      isRevoked: false,
      expiresAt: now + 604800, // 7 days
      createdAt: now,
      lastUsedAt: now,
    };

    this.sessions.set(sessionId, record);
    return { sessionId, accessToken, refreshToken };
  }

  public static rotateRefreshToken(
    oldRefreshToken: string,
    email: string,
    role: UserRole,
    familyId?: string,
  ): { accessToken: string; refreshToken: string } {
    const payload = TokenService.verifyToken<RefreshTokenPayload>(oldRefreshToken);
    const session = this.sessions.get(payload.sessionId);

    if (!session) {
      throw new AppError(401, 'INVALID_SESSION', 'Session does not exist or has expired.');
    }

    if (session.isRevoked) {
      // Security breach detection: Revoked token reused -> Revoke ALL sessions for this user
      this.revokeAllUserSessions(payload.userId);
      throw new AppError(401, 'SESSION_REVOKED', 'Session has been revoked due to security policy.');
    }

    // Revoke old session
    session.isRevoked = true;

    // Issue new session and token pair
    const newSession = this.createSession(payload.userId, email, role, familyId);
    return {
      accessToken: newSession.accessToken,
      refreshToken: newSession.refreshToken,
    };
  }

  public static revokeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isRevoked = true;
    }
  }

  public static revokeAllUserSessions(userId: string): void {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        session.isRevoked = true;
      }
    }
  }

  public static isSessionActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.isRevoked) {
      return false;
    }
    const now = Math.floor(Date.now() / 1000);
    return session.expiresAt > now;
  }

  public static clearAllForTest(): void {
    this.sessions.clear();
  }
}
