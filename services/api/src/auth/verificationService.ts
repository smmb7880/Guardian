import { HashService } from './hashService';
import { AppError } from '../middleware/errorHandler';

export interface VerificationTokenRecord {
  tokenHash: string;
  email: string;
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
  expiresAt: number;
}

export class VerificationService {
  private static tokens: Map<string, VerificationTokenRecord> = new Map();

  public static createEmailVerificationToken(email: string): string {
    const rawToken = HashService.generateRandomToken(24);
    const tokenHash = HashService.hashToken(rawToken);
    const now = Math.floor(Date.now() / 1000);

    this.tokens.set(tokenHash, {
      tokenHash,
      email,
      type: 'EMAIL_VERIFICATION',
      expiresAt: now + 86400, // 24 hours
    });

    return rawToken;
  }

  public static verifyEmailToken(rawToken: string): string {
    const tokenHash = HashService.hashToken(rawToken);
    const record = this.tokens.get(tokenHash);

    if (!record || record.type !== 'EMAIL_VERIFICATION') {
      throw new AppError(400, 'INVALID_VERIFICATION_TOKEN', 'Email verification token is invalid or expired.');
    }

    const now = Math.floor(Date.now() / 1000);
    if (record.expiresAt < now) {
      this.tokens.delete(tokenHash);
      throw new AppError(400, 'EXPIRED_VERIFICATION_TOKEN', 'Email verification token has expired.');
    }

    this.tokens.delete(tokenHash);
    return record.email;
  }

  public static createPasswordResetToken(email: string): string {
    const rawToken = HashService.generateRandomToken(24);
    const tokenHash = HashService.hashToken(rawToken);
    const now = Math.floor(Date.now() / 1000);

    this.tokens.set(tokenHash, {
      tokenHash,
      email,
      type: 'PASSWORD_RESET',
      expiresAt: now + 3600, // 1 hour
    });

    return rawToken;
  }

  public static resetPasswordWithToken(rawToken: string, newPassword: string): { email: string; newPasswordHash: string } {
    const tokenHash = HashService.hashToken(rawToken);
    const record = this.tokens.get(tokenHash);

    if (!record || record.type !== 'PASSWORD_RESET') {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'Password reset token is invalid or expired.');
    }

    const now = Math.floor(Date.now() / 1000);
    if (record.expiresAt < now) {
      this.tokens.delete(tokenHash);
      throw new AppError(400, 'EXPIRED_RESET_TOKEN', 'Password reset token has expired.');
    }

    this.tokens.delete(tokenHash);
    const newPasswordHash = HashService.hashPassword(newPassword);
    return { email: record.email, newPasswordHash };
  }
}
