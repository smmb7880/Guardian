import { Policy, UserRole, TemporaryAllowance } from '@guardian/shared-types';
import { ScheduleEvaluator } from '@guardian/shared-utils';
import { HashService } from '../auth/hashService';
import { AppError } from '../middleware/errorHandler';
import { verifyUserRole, verifyFamilyOwnership, RequestUserContext } from '../middleware/authMiddleware';
import { AuditService } from './auditService';

export interface PolicyDiffResult {
  versionA: number;
  versionB: number;
  changedFields: string[];
  diffSummary: Record<string, { from: unknown; to: unknown }>;
}

export class PolicyService {
  private static policies: Map<string, Policy> = new Map(); // childId -> Policy
  private static versions: Map<string, Policy[]> = new Map(); // childId -> Policy[]

  public static validatePolicy(policyData: Partial<Policy>): void {
    if (policyData.dailyLimitMinutes !== undefined && (policyData.dailyLimitMinutes < 0 || policyData.dailyLimitMinutes > 1440)) {
      throw new AppError(400, 'INVALID_POLICY_LIMIT', 'Daily limit minutes must be between 0 and 1440 (24 hours).');
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (policyData.bedtime) {
      if (!timeRegex.test(policyData.bedtime.startTime) || !timeRegex.test(policyData.bedtime.endTime)) {
        throw new AppError(400, 'INVALID_TIME_FORMAT', 'Bedtime start/end times must be in HH:mm 24-hour format.');
      }
    }

    if (policyData.schedules) {
      for (const sched of policyData.schedules) {
        if (!timeRegex.test(sched.startTime) || !timeRegex.test(sched.endTime)) {
          throw new AppError(400, 'INVALID_TIME_FORMAT', `Schedule '${sched.name}' start/end times must be in HH:mm 24-hour format.`);
        }
      }
    }
  }

  public static createDefaultPolicy(
    context: RequestUserContext,
    childId: string,
    familyId: string,
    timezone: string = 'UTC',
  ): Policy {
    verifyUserRole(context, [UserRole.PARENT]);
    verifyFamilyOwnership(context, familyId);

    const now = new Date().toISOString();
    const policy: Policy = {
      id: `policy-${HashService.generateRandomToken(8)}`,
      childId,
      version: 1,
      timezone,
      dailyLimitMinutes: 120, // 2 hours default
      bedtime: {
        enabled: true,
        startTime: '21:00',
        endTime: '07:00',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      },
      schedules: [],
      appRules: [],
      websiteRules: [],
      categoryRules: [],
      temporaryAllowances: [],
      updatedAt: now,
    };

    this.validatePolicy(policy);
    this.policies.set(childId, policy);
    this.versions.set(childId, [JSON.parse(JSON.stringify(policy))]);

    AuditService.logEvent('POLICY_CREATED', 'POLICY', {
      familyId,
      actorId: context.userId,
      entityId: policy.id,
      details: { childId, version: 1 },
    });

    return policy;
  }

  public static getPolicy(context: RequestUserContext, childId: string): Policy {
    const policy = this.policies.get(childId);
    if (!policy) {
      throw new AppError(404, 'POLICY_NOT_FOUND', 'Policy for requested child does not exist.');
    }
    // Access check requires child's family ownership context
    return policy;
  }

  public static updatePolicy(
    context: RequestUserContext,
    childId: string,
    familyId: string,
    updates: Partial<Policy>,
  ): Policy {
    verifyUserRole(context, [UserRole.PARENT]);
    verifyFamilyOwnership(context, familyId);

    let policy = this.policies.get(childId);
    if (!policy) {
      policy = this.createDefaultPolicy(context, childId, familyId, updates.timezone);
    }

    this.validatePolicy(updates);

    const newVersion = policy.version + 1;
    const now = new Date().toISOString();

    const updatedPolicy: Policy = {
      ...policy,
      ...updates,
      id: policy.id,
      childId,
      version: newVersion,
      updatedAt: now,
    };

    this.policies.set(childId, updatedPolicy);

    const history = this.versions.get(childId) || [];
    history.push(JSON.parse(JSON.stringify(updatedPolicy)));
    this.versions.set(childId, history);

    AuditService.logEvent('POLICY_UPDATED', 'POLICY', {
      familyId,
      actorId: context.userId,
      entityId: policy.id,
      details: { childId, newVersion },
    });

    return updatedPolicy;
  }

  public static getPolicyVersion(
    context: RequestUserContext,
    childId: string,
    versionNumber: number,
  ): Policy {
    const history = this.versions.get(childId) || [];
    const record = history.find((p) => p.version === versionNumber);
    if (!record) {
      throw new AppError(404, 'POLICY_VERSION_NOT_FOUND', `Version ${versionNumber} for policy does not exist.`);
    }
    return record;
  }

  public static calculatePolicyDiff(
    context: RequestUserContext,
    childId: string,
    versionA: number,
    versionB: number,
  ): PolicyDiffResult {
    const polA = this.getPolicyVersion(context, childId, versionA);
    const polB = this.getPolicyVersion(context, childId, versionB);

    const changedFields: string[] = [];
    const diffSummary: Record<string, { from: unknown; to: unknown }> = {};

    const keys: (keyof Policy)[] = [
      'dailyLimitMinutes',
      'timezone',
      'bedtime',
      'schedules',
      'appRules',
      'websiteRules',
      'categoryRules',
    ];

    for (const key of keys) {
      const valA = JSON.stringify(polA[key]);
      const valB = JSON.stringify(polB[key]);
      if (valA !== valB) {
        changedFields.push(key);
        diffSummary[key] = { from: polA[key], to: polB[key] };
      }
    }

    return {
      versionA,
      versionB,
      changedFields,
      diffSummary,
    };
  }

  public static grantTemporaryAllowance(
    context: RequestUserContext,
    childId: string,
    familyId: string,
    durationMinutes: number,
    reason?: string,
  ): TemporaryAllowance {
    verifyUserRole(context, [UserRole.PARENT]);
    verifyFamilyOwnership(context, familyId);

    if (durationMinutes <= 0 || durationMinutes > 240) {
      throw new AppError(400, 'INVALID_ALLOWANCE_DURATION', 'Temporary allowance duration must be between 1 and 240 minutes.');
    }

    const policy = this.getPolicy(context, childId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60000).toISOString();

    const allowance: TemporaryAllowance = {
      id: `allow-${HashService.generateRandomToken(8)}`,
      durationMinutes,
      grantedAt: now.toISOString(),
      expiresAt,
      reason,
    };

    policy.temporaryAllowances = policy.temporaryAllowances || [];
    policy.temporaryAllowances.push(allowance);

    AuditService.logEvent('TEMPORARY_ALLOWANCE_GRANTED', 'POLICY', {
      familyId,
      actorId: context.userId,
      entityId: policy.id,
      details: { childId, durationMinutes, reason },
    });

    return allowance;
  }

  public static evaluateChildPolicy(
    context: RequestUserContext,
    childId: string,
    currentTime: Date = new Date(),
    usedMinutesToday: number = 0,
  ) {
    const policy = this.getPolicy(context, childId);
    return ScheduleEvaluator.evaluate(policy, currentTime, usedMinutesToday);
  }

  public static clearForTest(): void {
    this.policies.clear();
    this.versions.clear();
  }
}
