import * as crypto from 'crypto';
import { UserRole } from '@guardian/shared-types';
import { AppError } from '../middleware/errorHandler';
import { verifyUserRole, verifyFamilyOwnership, RequestUserContext } from '../middleware/authMiddleware';
import { AuditService } from './auditService';

export interface PairingCodeRecord {
  code: string; // 6-character alphanumeric uppercase code
  childId: string;
  familyId: string;
  qrPayload: string;
  isUsed: boolean;
  expiresAt: number; // UTC timestamp in seconds
  createdAt: number;
}

export class PairingService {
  private static codes: Map<string, PairingCodeRecord> = new Map();

  /**
   * Generates a 6-character uppercase alphanumeric code using crypto.randomBytes.
   */
  private static generateSecureCodeString(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous chars (0, O, 1, I)
    const bytes = crypto.randomBytes(6);
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  }

  public static createPairingCode(
    context: RequestUserContext,
    childId: string,
    familyId: string,
    ttlSeconds: number = 600, // 10 minutes
  ): PairingCodeRecord {
    verifyUserRole(context, [UserRole.PARENT]);
    verifyFamilyOwnership(context, familyId);

    const code = this.generateSecureCodeString();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + ttlSeconds;

    const qrPayload = JSON.stringify({
      code,
      childId,
      familyId,
      expiresAt,
    });

    const record: PairingCodeRecord = {
      code,
      childId,
      familyId,
      qrPayload,
      isUsed: false,
      expiresAt,
      createdAt: now,
    };

    this.codes.set(code, record);

    AuditService.logEvent('PAIRING_CODE_GENERATED', 'DEVICE_PAIRING', {
      familyId,
      actorId: context.userId,
      entityId: childId,
      details: { code, expiresAt },
    });

    return record;
  }

  public static validateAndConsumeCode(
    code: string,
    platformDeviceId: string,
  ): { childId: string; familyId: string } {
    const record = this.codes.get(code.toUpperCase().trim());

    if (!record) {
      AuditService.logEvent('PAIRING_FAILED_INVALID_CODE', 'DEVICE_PAIRING', {
        details: { attemptedCode: code, platformDeviceId },
      });
      throw new AppError(400, 'INVALID_PAIRING_CODE', 'The entered pairing code is invalid.');
    }

    if (record.isUsed) {
      AuditService.logEvent('PAIRING_REPLAY_ATTEMPT', 'DEVICE_PAIRING', {
        familyId: record.familyId,
        entityId: record.childId,
        details: { attemptedCode: code, platformDeviceId },
      });
      throw new AppError(400, 'PAIRING_CODE_ALREADY_USED', 'This pairing code has already been used.');
    }

    const now = Math.floor(Date.now() / 1000);
    if (record.expiresAt < now) {
      AuditService.logEvent('PAIRING_CODE_EXPIRED', 'DEVICE_PAIRING', {
        familyId: record.familyId,
        entityId: record.childId,
        details: { attemptedCode: code, platformDeviceId },
      });
      throw new AppError(400, 'PAIRING_CODE_EXPIRED', 'The pairing code has expired. Please generate a new code.');
    }

    // Mark single-use code as consumed
    record.isUsed = true;

    return {
      childId: record.childId,
      familyId: record.familyId,
    };
  }

  public static clearForTest(): void {
    this.codes.clear();
  }
}
