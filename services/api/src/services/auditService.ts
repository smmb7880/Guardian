import { AuditLogEntity } from '../db/schema';
import { HashService } from '../auth/hashService';
import { ConsoleLogger } from '@guardian/shared-utils';

const logger = new ConsoleLogger();

export class AuditService {
  private static auditLogs: AuditLogEntity[] = [];

  public static logEvent(
    action: string,
    entityType: string,
    options: {
      familyId?: string;
      actorId?: string;
      entityId?: string;
      details?: Record<string, unknown>;
      ipAddress?: string;
    } = {},
  ): AuditLogEntity {
    const entry: AuditLogEntity = {
      id: `audit-${HashService.generateRandomToken(8)}`,
      familyId: options.familyId,
      actorId: options.actorId,
      action,
      entityType,
      entityId: options.entityId,
      details: options.details,
      ipAddress: options.ipAddress || '127.0.0.1',
      createdAt: new Date(),
    };

    this.auditLogs.push(entry);
    logger.info(`[AUDIT] Action: ${action} | Entity: ${entityType}:${options.entityId || 'N/A'} | Family: ${options.familyId || 'N/A'}`);
    return entry;
  }

  public static getFamilyAuditLogs(familyId: string): AuditLogEntity[] {
    return this.auditLogs.filter((log) => log.familyId === familyId);
  }

  public static clearForTest(): void {
    this.auditLogs = [];
  }
}
