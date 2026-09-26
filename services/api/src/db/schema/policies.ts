import { Policy } from '@guardian/shared-types';

export interface PolicyEntity {
  id: string;
  childId: string;
  familyId: string;
  currentVersion: number;
  timezone: string;
  dailyLimitMinutes: number;
  bedtime: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyVersionEntity {
  id: string;
  policyId: string;
  version: number;
  policySnapshot: Policy;
  createdBy?: string;
  createdAt: Date;
}

export interface TemporaryAllowanceEntity {
  id: string;
  policyId: string;
  durationMinutes: number;
  grantedAt: Date;
  expiresAt: Date;
  reason?: string;
}
