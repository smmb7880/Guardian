import assert from 'assert';
import { Policy, RestrictionAction } from '@guardian/shared-types';
import { ScheduleEvaluator, isTimeInWindow } from '../../packages/shared-utils/src/ScheduleEvaluator';

export function runScheduleEngineTestSuite(): void {
  console.info('Running Screen-Time Engine & Schedule Test Suite (Phase 10)...');

  // ── Test 1: Window Helper Logic (Same-Day & Midnight Crossing) ──
  assert.strictEqual(isTimeInWindow('07:59', '08:00', '14:00'), false);
  assert.strictEqual(isTimeInWindow('08:00', '08:00', '14:00'), true);
  assert.strictEqual(isTimeInWindow('12:30', '08:00', '14:00'), true);
  assert.strictEqual(isTimeInWindow('14:00', '08:00', '14:00'), false);

  // Midnight Crossing (22:00 to 07:00)
  assert.strictEqual(isTimeInWindow('21:59', '22:00', '07:00'), false);
  assert.strictEqual(isTimeInWindow('22:00', '22:00', '07:00'), true);
  assert.strictEqual(isTimeInWindow('23:59', '22:00', '07:00'), true);
  assert.strictEqual(isTimeInWindow('03:30', '22:00', '07:00'), true);
  assert.strictEqual(isTimeInWindow('06:59', '22:00', '07:00'), true);
  assert.strictEqual(isTimeInWindow('07:00', '22:00', '07:00'), false);
  console.info('  ✓ Midnight crossing and time window evaluation verified');

  // ── Test 2: Exact boundary: same start == end (24h window) ──
  assert.strictEqual(isTimeInWindow('12:00', '12:00', '12:00'), true, '00:00 == 00:00 should be all-day');
  console.info('  ✓ Equal start/end boundary (24h window) verified');

  // Policy Fixture
  const testPolicy: Policy = {
    id: 'pol-sched-1',
    childId: 'child-1',
    version: 1,
    timezone: 'UTC',
    dailyLimitMinutes: 120,
    bedtime: {
      enabled: true,
      startTime: '22:00',
      endTime: '07:00',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    },
    schedules: [
      { id: 's1', name: 'School Hours', startTime: '08:00', endTime: '14:00', daysOfWeek: [1, 2, 3, 4, 5], action: RestrictionAction.BLOCK },
      { id: 's2', name: 'Homework Time', startTime: '16:00', endTime: '18:00', daysOfWeek: [1, 2, 3, 4, 5], action: RestrictionAction.LIMIT },
    ],
    websiteRules: [],
    categoryRules: [],
    appRules: [],
    temporaryAllowances: [],
    updatedAt: new Date().toISOString(),
  };

  // ── Test 3: Bedtime evaluation ──
  const bedtimeTime = new Date('2026-09-13T23:30:00Z'); // 23:30 Sunday
  const evalBedtime = ScheduleEvaluator.evaluate(testPolicy, bedtimeTime, 30);
  assert.strictEqual(evalBedtime.isBlocked, true);
  assert.strictEqual(evalBedtime.activePeriodName, 'Bedtime');
  console.info('  ✓ Bedtime restriction evaluation verified');

  // ── Test 4: School schedule evaluation ──
  const schoolTime = new Date('2026-09-15T10:00:00Z'); // 10:00 Tuesday
  const evalSchool = ScheduleEvaluator.evaluate(testPolicy, schoolTime, 30);
  assert.strictEqual(evalSchool.isBlocked, true);
  assert.strictEqual(evalSchool.activePeriodName, 'School Hours');
  console.info('  ✓ School schedule restriction evaluation verified');

  // ── Test 5: Free time within daily limit ──
  const freeTime = new Date('2026-09-15T14:30:00Z'); // 14:30 Tuesday
  const evalFree = ScheduleEvaluator.evaluate(testPolicy, freeTime, 60);
  assert.strictEqual(evalFree.isBlocked, false);
  assert.strictEqual(evalFree.activePeriodName, 'Free Time');
  assert.strictEqual(evalFree.remainingMinutes, 60);
  console.info('  ✓ Free time evaluation verified');

  // ── Test 6: Daily limit reached ──
  const evalLimitReached = ScheduleEvaluator.evaluate(testPolicy, freeTime, 120);
  assert.strictEqual(evalLimitReached.isBlocked, true);
  assert.strictEqual(evalLimitReached.activePeriodName, 'Daily Limit Reached');
  console.info('  ✓ Daily limit reached evaluation verified');

  // ── Test 7: Temporary extra-time allowance extension ──
  const policyWithAllowance: Policy = {
    ...testPolicy,
    temporaryAllowances: [
      {
        id: 'allow-1',
        durationMinutes: 30,
        grantedAt: new Date(Date.now() - 300000).toISOString(),
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        reason: 'Extra homework time',
      },
    ],
  };
  const evalAllowance = ScheduleEvaluator.evaluate(policyWithAllowance, new Date(), 120);
  assert.strictEqual(evalAllowance.isBlocked, false);
  assert.strictEqual(evalAllowance.activePeriodName, 'Temporary Allowance');
  console.info('  ✓ Temporary extra-time allowance bypass verified');

  // ── Test 8: Clock Tampering Protection ──
  const serverTime = new Date();
  const tamperedDeviceTime = new Date(serverTime.getTime() - 120000); // Shifting clock back 2 minutes
  const evalTamper = ScheduleEvaluator.evaluate(testPolicy, tamperedDeviceTime, 0, serverTime);
  assert.strictEqual(evalTamper.isBlocked, true);
  assert.strictEqual(evalTamper.clockTamperingDetected, true);
  assert(evalTamper.reason.includes('tampering'));
  console.info('  ✓ Clock tampering detection verified');

  // ── Test 9: Clock within tolerance (< 60s) should NOT trigger tamper ──
  const closeServerTime = new Date();
  const slightlyOldTime = new Date(closeServerTime.getTime() - 30000); // 30s ago
  const evalNoTamper = ScheduleEvaluator.evaluate(testPolicy, slightlyOldTime, 0, closeServerTime);
  assert.strictEqual(evalNoTamper.clockTamperingDetected, false, '30s clock diff must not trigger tamper');
  console.info('  ✓ Small clock difference within tolerance (no tamper) verified');

  // ── Test 10: Overlapping schedules — BLOCK wins over LIMIT ──
  const overlappingPolicy: Policy = {
    ...testPolicy,
    schedules: [
      { id: 'o1', name: 'Homework Time', startTime: '16:00', endTime: '18:00', daysOfWeek: [1, 2, 3, 4, 5], action: RestrictionAction.LIMIT },
      { id: 'o2', name: 'Study Block', startTime: '16:30', endTime: '17:30', daysOfWeek: [1, 2, 3, 4, 5], action: RestrictionAction.BLOCK },
    ],
    bedtime: { ...testPolicy.bedtime, enabled: false },
    dailyLimitMinutes: 0,
  };
  const overlapTime = new Date('2026-09-15T17:00:00Z'); // 17:00 Tue — in both windows
  const evalOverlap = ScheduleEvaluator.evaluate(overlappingPolicy, overlapTime, 0);
  assert.strictEqual(evalOverlap.isBlocked, true, 'BLOCK must win over LIMIT when schedules overlap');
  assert.strictEqual(evalOverlap.activePeriodName, 'Study Block', 'Most restrictive schedule must be selected');
  console.info('  ✓ Overlapping schedule BLOCK > LIMIT priority verified');

  // ── Test 11: Weekend schedule does not apply on weekday ──
  const weekendPolicy: Policy = {
    ...testPolicy,
    schedules: [
      { id: 'wk', name: 'Weekend Block', startTime: '08:00', endTime: '20:00', daysOfWeek: [0, 6], action: RestrictionAction.BLOCK },
    ],
    bedtime: { ...testPolicy.bedtime, enabled: false },
    dailyLimitMinutes: 0,
  };
  const tueMorning = new Date('2026-09-15T10:00:00Z'); // Tuesday
  const evalWeekend = ScheduleEvaluator.evaluate(weekendPolicy, tueMorning, 0);
  assert.strictEqual(evalWeekend.isBlocked, false, 'Weekend schedule must not apply on weekday');
  assert.strictEqual(evalWeekend.activePeriodName, 'Free Time');
  console.info('  ✓ Weekend schedule not applied on weekday verified');

  // ── Test 12: Weekend schedule applies on Saturday ──
  const satMorning = new Date('2026-09-19T10:00:00Z'); // Saturday
  const evalSatBlock = ScheduleEvaluator.evaluate(weekendPolicy, satMorning, 0);
  assert.strictEqual(evalSatBlock.isBlocked, true, 'Weekend schedule must apply on Saturday');
  assert.strictEqual(evalSatBlock.activePeriodName, 'Weekend Block');
  console.info('  ✓ Weekend schedule applied on Saturday verified');

  // ── Test 13: No daily limit (0) → never blocks on daily limit ──
  const noLimitPolicy: Policy = { ...testPolicy, dailyLimitMinutes: 0, schedules: [], bedtime: { ...testPolicy.bedtime, enabled: false } };
  const evalNoLimit = ScheduleEvaluator.evaluate(noLimitPolicy, freeTime, 9999);
  assert.strictEqual(evalNoLimit.isBlocked, false, 'Zero daily limit must mean unlimited');
  assert.strictEqual(evalNoLimit.remainingMinutes, null);
  console.info('  ✓ Zero daily limit (unlimited) evaluation verified');

  // ── Test 14: Expired temporary allowance does not grant access ──
  const expiredAllowancePolicy: Policy = {
    ...testPolicy,
    temporaryAllowances: [
      {
        id: 'allow-expired',
        durationMinutes: 30,
        grantedAt: new Date(Date.now() - 7200000).toISOString(),
        expiresAt: new Date(Date.now() - 3600000).toISOString(), // expired 1 hour ago
      },
    ],
  };
  // Daily limit reached + expired allowance → still blocked
  const evalExpiredAllow = ScheduleEvaluator.evaluate(expiredAllowancePolicy, freeTime, 120);
  assert.strictEqual(evalExpiredAllow.isBlocked, true, 'Expired allowance must not override daily limit');
  assert.strictEqual(evalExpiredAllow.activePeriodName, 'Daily Limit Reached');
  console.info('  ✓ Expired allowance does not override daily limit verified');

  // ── Test 15: Bedtime disabled on specific days ──
  const partialBedtimePolicy: Policy = {
    ...testPolicy,
    bedtime: {
      enabled: true,
      startTime: '22:00',
      endTime: '07:00',
      daysOfWeek: [1, 2, 3, 4, 5], // Only weekdays; NOT Sunday (0)
    },
    schedules: [],
    dailyLimitMinutes: 0,
  };
  // Sunday 23:30 — bedtime disabled on Sundays
  const sunNight = new Date('2026-09-13T23:30:00Z'); // Sunday
  const evalSunBedtime = ScheduleEvaluator.evaluate(partialBedtimePolicy, sunNight, 0);
  assert.strictEqual(evalSunBedtime.isBlocked, false, 'Bedtime must not apply on days not in daysOfWeek');
  console.info('  ✓ Bedtime day-of-week restriction (not applied on Sunday) verified');

  // Monday 23:30 — bedtime active on weekdays
  const monNight = new Date('2026-09-14T23:30:00Z'); // Monday
  const evalMonBedtime = ScheduleEvaluator.evaluate(partialBedtimePolicy, monNight, 0);
  assert.strictEqual(evalMonBedtime.isBlocked, true, 'Bedtime must apply on Monday');
  console.info('  ✓ Bedtime correctly applied on Monday verified');

  console.info('=== SCREEN-TIME ENGINE & SCHEDULE TEST SUITE PASSED SUCCESSFULLY ===');
}
