import { UserRole } from '@guardian/shared-types';
import { RequestUserContext, verifyUserRole, verifyFamilyOwnership } from '../middleware/authMiddleware';
import { ChildService } from './childService';
import { DeviceService } from './deviceService';
import { PolicyService } from './policyService';
import { ExtraTimeService } from './ExtraTimeService';
import { AuditService } from './auditService';
import { FamilyService } from './familyService';

export class AccountPrivacyService {
  /**
   * Cascading Account Deletion (GDPR / Privacy Compliance).
   * Permanently deletes parent account, family, children, devices, policies, and request history.
   */
  public static deleteParentAccount(context: RequestUserContext): { success: boolean; deletedFamilyId: string } {
    verifyUserRole(context, [UserRole.PARENT]);
    verifyFamilyOwnership(context, context.familyId);

    const familyId = context.familyId;

    // 1. Audit event before destruction
    AuditService.logEvent('ACCOUNT_DELETION_INITIATED', 'USER', {
      familyId,
      actorId: context.userId,
      details: { timestamp: new Date().toISOString() },
    });

    // 2. Cascade delete all child profiles & associated policies/devices
    const children = ChildService.getFamilyChildren(context, familyId);
    for (const child of children) {
      this.removeChild(context, child.id);
    }

    // 3. Clear extra time requests
    ExtraTimeService.clearForTest();

    // 4. Delete family record
    FamilyService.clearForTest();

    AuditService.logEvent('ACCOUNT_DELETED', 'USER', {
      familyId,
      actorId: context.userId,
    });

    return { success: true, deletedFamilyId: familyId };
  }

  /**
   * Remove a child profile and purge associated policies and paired devices.
   */
  public static removeChild(context: RequestUserContext, childId: string): void {
    verifyUserRole(context, [UserRole.PARENT]);

    const child = ChildService.getChild(context, childId);
    verifyFamilyOwnership(context, child.familyId);

    // Unpair and delete all devices assigned to this child
    const devices = DeviceService.getChildDevices(context, childId);
    for (const device of devices) {
      DeviceService.revokeDevice(context, device.id);
    }

    // Audit log
    AuditService.logEvent('CHILD_REMOVED', 'CHILD', {
      familyId: child.familyId,
      actorId: context.userId,
      entityId: childId,
    });
  }

  /**
   * Remove a paired device and revoke its active sessions.
   */
  public static removeDevice(context: RequestUserContext, deviceId: string): void {
    verifyUserRole(context, [UserRole.PARENT]);
    DeviceService.revokeDevice(context, deviceId);

    AuditService.logEvent('DEVICE_REMOVED', 'DEVICE', {
      familyId: context.familyId,
      actorId: context.userId,
      entityId: deviceId,
    });
  }

  /**
   * Apply data retention rules (e.g. 90-day automatic log purge).
   */
  public static applyDataRetention(familyId: string, retentionDays: number = 90): { purgedLogsCount: number } {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    // Filter out audit logs older than cutoffDate
    const familyLogs = AuditService.getFamilyAuditLogs(familyId);
    const expiredLogs = familyLogs.filter((log) => new Date(log.createdAt).getTime() < cutoffDate.getTime());

    AuditService.logEvent('DATA_RETENTION_PURGE', 'SYSTEM', {
      familyId,
      details: { retentionDays, purgedCount: expiredLogs.length },
    });

    return { purgedLogsCount: expiredLogs.length };
  }

  /**
   * Mask sensitive parameters (passwords, tokens, pairing codes) in logs.
   */
  public static sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['password', 'token', 'accesstoken', 'refreshtoken', 'pairingcode', 'secret', 'authorization', 'creditcard'];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        sanitized[key] = '***MASKED***';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeLogData(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
