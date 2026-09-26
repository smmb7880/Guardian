import {
  handleGetPolicy,
  handleUpdatePolicy,
  handleGetPolicyVersion,
  handleGetPolicyDiff,
  handleGrantAllowance,
  handleEvaluatePolicy,
} from '@guardian/api-service/dist/routes/policies';
import { handleCreateFamily } from '@guardian/api-service/dist/routes/families';
import { handleCreateChild } from '@guardian/api-service/dist/routes/children';
import { FamilyService } from '@guardian/api-service/dist/services/familyService';
import { ChildService } from '@guardian/api-service/dist/services/childService';
import { PolicyService } from '@guardian/api-service/dist/services/policyService';
import { PolicyEvaluator } from '@guardian/api-service/dist/policy/policyEvaluator';
import { AuditService } from '@guardian/api-service/dist/services/auditService';
import { UserRole, RestrictionAction } from '@guardian/shared-types';
import { AppError } from '@guardian/api-service/dist/middleware/errorHandler';

export function runPolicyTestSuite(): boolean {
  console.info('[Test Suite] Starting Phase 6 Versioned Policy Engine Tests...');

  FamilyService.clearForTest();
  ChildService.clearForTest();
  PolicyService.clearForTest();
  AuditService.clearForTest();

  // Setup Parent Context & Family & Child
  const parentContext = {
    userId: 'user-parent-pol',
    email: 'polparent@guardian.local',
    role: UserRole.PARENT,
    familyId: undefined as string | undefined,
  };

  const fam = handleCreateFamily(parentContext, { name: 'Policy Test Family' }).data!.family;
  parentContext.familyId = fam.id;

  const child = handleCreateChild(parentContext, { familyId: fam.id, name: 'Timmy Policy', age: 10 }).data!;

  // Test 1: Policy Initialization & Default Policy Creation
  console.info(' - Test 1: Default Policy Creation & Initialization');
  const defaultPol = PolicyService.createDefaultPolicy(parentContext, child.id, fam.id, 'UTC');
  if (defaultPol.version !== 1 || defaultPol.dailyLimitMinutes !== 120) {
    throw new Error('Default policy initialization failed.');
  }

  // Test 2: Conflicting Rules Priority Resolution
  console.info(' - Test 2: Conflicting Rules Priority Resolution');
  handleUpdatePolicy(parentContext, child.id, fam.id, {
    appRules: [
      { appIdentifier: 'com.tiktok.app', appName: 'TikTok', action: RestrictionAction.BLOCK },
      { appIdentifier: 'com.learning.math', appName: 'Math Learning', action: RestrictionAction.ALLOW },
    ],
    categoryRules: [
      { category: 'Social Media', action: RestrictionAction.BLOCK },
    ],
  });

  // Explicit Block Rule (TikTok) must return BLOCK regardless of daily limit
  const evalTikTok = handleEvaluatePolicy(parentContext, child.id, {
    currentTimeUtc: '2026-09-13T14:00:00Z',
    timezone: 'UTC',
    appIdentifier: 'com.tiktok.app',
    usageMinutesToday: 10,
  }).data!;
  if (evalTikTok.action !== RestrictionAction.BLOCK) {
    throw new Error('Explicit app block rule priority failed.');
  }

  // Test 3: Midnight Window Crossing (Bedtime 21:00 -> 07:00)
  console.info(' - Test 3: Midnight Window Crossing Evaluation');
  // Evaluate at 22:30 UTC (inside bedtime)
  const evalBedtimeLate = PolicyEvaluator.evaluate(defaultPol, {
    currentTimeUtc: '2026-09-13T22:30:00Z',
    timezone: 'UTC',
  });
  if (evalBedtimeLate.action !== RestrictionAction.BLOCK) {
    throw new Error('Bedtime evaluation before midnight failed.');
  }

  // Evaluate at 03:15 UTC (inside bedtime after midnight)
  const evalBedtimeEarly = PolicyEvaluator.evaluate(defaultPol, {
    currentTimeUtc: '2026-09-13T03:15:00Z',
    timezone: 'UTC',
  });
  if (evalBedtimeEarly.action !== RestrictionAction.BLOCK) {
    throw new Error('Bedtime evaluation after midnight failed.');
  }

  // Evaluate at 14:00 UTC (outside bedtime)
  const evalDaytime = PolicyEvaluator.evaluate(defaultPol, {
    currentTimeUtc: '2026-09-13T14:00:00Z',
    timezone: 'UTC',
    usageMinutesToday: 30,
  });
  if (evalDaytime.action !== RestrictionAction.ALLOW) {
    throw new Error('Daytime evaluation failed.');
  }

  // Test 4: Expired Allowance Pruning & Active Allowance Extension
  console.info(' - Test 4: Expired Allowance Pruning & Active Allowance');
  // Daily limit = 120 minutes. Current usage = 130 minutes (Limit reached)
  const evalOverLimit = PolicyEvaluator.evaluate(defaultPol, {
    currentTimeUtc: '2026-09-13T14:00:00Z',
    timezone: 'UTC',
    usageMinutesToday: 130,
  });
  if (evalOverLimit.action !== RestrictionAction.BLOCK) {
    throw new Error('Daily limit reached evaluation failed.');
  }

  // Grant 30 minutes temporary allowance
  handleGrantAllowance(parentContext, child.id, fam.id, { durationMinutes: 30, reason: 'Homework complete' });
  const evalWithAllowance = handleEvaluatePolicy(parentContext, child.id, {
    currentTimeUtc: '2026-09-13T14:00:00Z',
    timezone: 'UTC',
    usageMinutesToday: 130,
  }).data!;
  if (evalWithAllowance.action !== RestrictionAction.ALLOW || evalWithAllowance.effectiveDailyLimitMinutes !== 150) {
    throw new Error('Temporary allowance extension failed.');
  }

  // Test 5: Multiple Overlapping Schedules
  console.info(' - Test 5: Multiple Overlapping Schedules');
  handleUpdatePolicy(parentContext, child.id, fam.id, {
    schedules: [
      { id: 'sched-1', name: 'School Hours', startTime: '08:00', endTime: '15:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], action: RestrictionAction.BLOCK },
      { id: 'sched-2', name: 'Homework Window', startTime: '14:00', endTime: '17:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], action: RestrictionAction.BLOCK },
    ],
  });
  const evalOverlap = handleEvaluatePolicy(parentContext, child.id, {
    currentTimeUtc: '2026-09-13T14:30:00Z',
    timezone: 'UTC',
  }).data!;
  if (evalOverlap.action !== RestrictionAction.BLOCK) {
    throw new Error('Overlapping schedule evaluation failed.');
  }

  // Test 6: Invalid Limits & Time Strings Validation
  console.info(' - Test 6: Invalid Limits & Time Strings Validation');
  try {
    handleUpdatePolicy(parentContext, child.id, fam.id, { dailyLimitMinutes: -50 });
    throw new Error('Negative daily limit should have failed.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'INVALID_POLICY_LIMIT') {
      throw new Error(`Expected INVALID_POLICY_LIMIT, got ${err}`);
    }
  }

  try {
    handleUpdatePolicy(parentContext, child.id, fam.id, {
      bedtime: { enabled: true, startTime: '25:99', endTime: '07:00', daysOfWeek: [1] },
    });
    throw new Error('Invalid HH:mm time string should have failed.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'INVALID_TIME_FORMAT') {
      throw new Error(`Expected INVALID_TIME_FORMAT, got ${err}`);
    }
  }

  // Test 7: Policy Versioning & Diff Calculation
  console.info(' - Test 7: Policy Versioning & Diff Calculation');
  const polV1 = handleGetPolicyVersion(parentContext, child.id, 1).data!;
  const polLatest = handleGetPolicy(parentContext, child.id).data!;
  if (polLatest.version < 2 || polV1.version !== 1) {
    throw new Error('Policy version history failed.');
  }

  const diffResult = handleGetPolicyDiff(parentContext, child.id, 1, polLatest.version).data!;
  if (!diffResult.changedFields.includes('dailyLimitMinutes') && !diffResult.changedFields.includes('schedules')) {
    throw new Error('Policy diff calculation failed.');
  }

  console.info('[Test Suite] All Phase 6 Versioned Policy Engine Tests PASSED SUCCESSFULLY!');
  return true;
}
