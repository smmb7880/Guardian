import assert from 'assert';
import { Policy, RestrictionAction } from '@guardian/shared-types';
import { AndroidAdapter } from '../../apps/child-mobile/src/adapters/AndroidAdapter';
import { IOSAdapter } from '../../apps/child-mobile/src/adapters/IOSAdapter';
import { PolicySyncService } from '../../apps/child-mobile/src/services/PolicySyncService';
import { ScreenTimeEngine } from '../../apps/child-mobile/src/services/ScreenTimeEngine';
import {
  ParentScheduleService,
  SCHEDULE_TEMPLATES,
  CAPABILITY_WARNINGS,
} from '../../apps/parent-mobile/src/services/ParentScheduleService';

// ─────────────────────────────────────────────
// Shared test policy fixture
// ─────────────────────────────────────────────
const BASE_POLICY: Policy = {
  id: 'pol-engine-1',
  childId: 'child-engine-1',
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
    {
      id: 's1',
      name: 'School Hours',
      startTime: '08:00',
      endTime: '14:00',
      daysOfWeek: [1, 2, 3, 4, 5],
      action: RestrictionAction.BLOCK,
    },
    {
      id: 's2',
      name: 'Homework Time',
      startTime: '16:00',
      endTime: '18:00',
      daysOfWeek: [1, 2, 3, 4, 5],
      action: RestrictionAction.LIMIT,
    },
  ],
  appRules: [],
  websiteRules: [],
  categoryRules: [],
  temporaryAllowances: [],
  updatedAt: new Date().toISOString(),
};

export function runScreenTimeEngineTestSuite(): void {
  console.info('Running Screen-Time Engine Integration Test Suite (Phase 10)...');

  // ── 1. ScreenTimeEngine: basic free-time allow ──
  {
    const sync = new PolicySyncService();
    const adapter = new AndroidAdapter();
    const engine = new ScreenTimeEngine(adapter, sync);
    engine.applyPolicy({ ...BASE_POLICY, dailyLimitMinutes: 180 });

    // Tuesday 15:00 UTC — between school (08-14) and homework (16-18) → free time
    const tueFreeTime = new Date('2026-09-15T15:00:00Z');
    const result = engine.evaluate(60, tueFreeTime);
    assert.strictEqual(result.shouldBlock, false, 'Expected free-time allow between schedules');
    assert.strictEqual(result.activeMode, 'FREE');
    assert.strictEqual(result.remainingMinutesToday, 120); // 180 - 60
    console.info('  ✓ Free-time allow between schedules verified');
  }

  // ── 2. ScreenTimeEngine: school-hours block ──
  {
    const sync = new PolicySyncService();
    const adapter = new AndroidAdapter();
    const engine = new ScreenTimeEngine(adapter, sync);
    engine.applyPolicy(BASE_POLICY);

    const tuSchool = new Date('2026-09-15T10:00:00Z'); // Tuesday 10:00
    const result = engine.evaluate(30, tuSchool);
    assert.strictEqual(result.shouldBlock, true, 'Expected block during school hours');
    assert.strictEqual(result.activeMode, 'SCHOOL');
    console.info('  ✓ School-hours block verified');
  }

  // ── 3. ScreenTimeEngine: bedtime block (midnight-crossing) ──
  {
    const sync = new PolicySyncService();
    const adapter = new AndroidAdapter();
    const engine = new ScreenTimeEngine(adapter, sync);
    engine.applyPolicy(BASE_POLICY);

    const midnight = new Date('2026-09-14T01:30:00Z'); // 01:30 — inside 22:00-07:00
    const result = engine.evaluate(0, midnight);
    assert.strictEqual(result.shouldBlock, true, 'Expected bedtime block at 01:30');
    assert.strictEqual(result.activeMode, 'BEDTIME');
    console.info('  ✓ Bedtime midnight-crossing block verified');
  }

  // ── 4. ScreenTimeEngine: daily limit exhausted ──
  {
    const sync = new PolicySyncService();
    const adapter = new AndroidAdapter();
    const engine = new ScreenTimeEngine(adapter, sync);
    engine.applyPolicy(BASE_POLICY);

    const afternoon = new Date('2026-09-15T14:30:00Z'); // free time slot
    const result = engine.evaluate(120, afternoon); // exactly at limit
    assert.strictEqual(result.shouldBlock, true, 'Expected block when daily limit reached');
    assert.strictEqual(result.activeMode, 'DAILY_LIMIT');
    console.info('  ✓ Daily limit exhaustion block verified');
  }

  // ── 5. ScreenTimeEngine: temporary allowance overrides daily limit ──
  {
    const sync = new PolicySyncService();
    const adapter = new AndroidAdapter();
    const engine = new ScreenTimeEngine(adapter, sync);
    const policyWithAllowance: Policy = {
      ...BASE_POLICY,
      temporaryAllowances: [
        {
          id: 'allow-test-1',
          durationMinutes: 30,
          grantedAt: new Date(Date.now() - 300000).toISOString(),
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
        },
      ],
    };
    engine.applyPolicy(policyWithAllowance);

    const afternoon = new Date('2026-09-15T14:30:00Z');
    const result = engine.evaluate(120, afternoon);
    assert.strictEqual(result.shouldBlock, false, 'Expected allowance to override daily limit');
    assert.strictEqual(result.activeMode, 'FREE');
    console.info('  ✓ Temporary allowance overrides daily limit verified');
  }

  // ── 6. ScreenTimeEngine: expired allowance is pruned ──
  {
    const sync = new PolicySyncService();
    const adapter = new AndroidAdapter();
    const engine = new ScreenTimeEngine(adapter, sync);
    const expiredAllowance: Policy = {
      ...BASE_POLICY,
      temporaryAllowances: [
        {
          id: 'allow-expired',
          durationMinutes: 30,
          grantedAt: new Date(Date.now() - 7200000).toISOString(),
          expiresAt: new Date(Date.now() - 3600000).toISOString(), // expired 1h ago
        },
      ],
    };
    sync.savePolicyToCache(expiredAllowance);
    adapter.applyPolicy(expiredAllowance);

    const afternoon = new Date('2026-09-15T14:30:00Z');
    const result = engine.evaluate(120, afternoon); // limit reached, expired allowance should be stripped
    assert.strictEqual(result.shouldBlock, true, 'Expired allowance must not block daily limit enforcement');
    // Also verify allowance was pruned from cache
    const pruned = sync.getCachedPolicy()!;
    assert.strictEqual(pruned.temporaryAllowances.length, 0, 'Expired allowance must be pruned from cache');
    console.info('  ✓ Expired allowance pruning verified');
  }

  // ── 7. ScreenTimeEngine: offline mode — valid cached policy still enforces ──
  {
    const sync = new PolicySyncService();
    const adapter = new AndroidAdapter();
    const engine = new ScreenTimeEngine(adapter, sync);
    engine.applyPolicy(BASE_POLICY);
    sync.markDeviceOffline();

    const tuSchool = new Date('2026-09-15T10:00:00Z');
    const result = engine.evaluate(30, tuSchool);
    assert.strictEqual(result.shouldBlock, true, 'Offline: cached policy must still block during school');
    assert.strictEqual(result.isOfflineFallback, true, 'isOfflineFallback must be true when offline');
    console.info('  ✓ Offline mode with valid cached policy enforces schedules');
  }

  // ── 8. ScreenTimeEngine: offline expired cache → block-everything fallback ──
  {
    const sync = new PolicySyncService();
    const adapter = new AndroidAdapter();
    const engine = new ScreenTimeEngine(adapter, sync);

    // Simulate a policy cached 73 hours ago
    const oldPolicy: Policy = { ...BASE_POLICY };
    sync.savePolicyToCache(oldPolicy);
    // Manually backdate the cacheEntry by overwriting via a workaround:
    // We mark offline and spoof the TTL check by using a far-future `now`.
    sync.markDeviceOffline();

    const farFuture = new Date(Date.now() + 73 * 60 * 60 * 1000); // 73h from now
    const status = sync.getSyncStatus(farFuture);
    assert.strictEqual(status.isPolicyExpired, true, 'Policy should be expired after 73h offline');

    const result = engine.evaluate(0, farFuture);
    assert.strictEqual(result.shouldBlock, true, 'Expired offline cache must trigger block-everything fallback');
    assert(result.reason.includes('offline'), 'Fallback reason must mention offline state');
    console.info('  ✓ Offline expired cache block-everything fallback verified');
  }

  // ── 9. ScreenTimeEngine: clock tampering → block ──
  {
    const sync = new PolicySyncService();
    const adapter = new AndroidAdapter();
    const engine = new ScreenTimeEngine(adapter, sync);
    engine.applyPolicy(BASE_POLICY);

    const serverTime = new Date();
    engine.updateServerTime(serverTime);
    const tamperedTime = new Date(serverTime.getTime() - 120000); // 2 min back

    const result = engine.evaluate(0, tamperedTime);
    assert.strictEqual(result.shouldBlock, true, 'Clock tampering must trigger block');
    assert.strictEqual(result.evaluationDetail.clockTamperingDetected, true);
    console.info('  ✓ Clock tampering detection via ScreenTimeEngine verified');
  }

  // ── 10. ScreenTimeEngine: timezone conversion (UTC+5:30 IST) ──
  {
    const sync = new PolicySyncService();
    const adapter = new AndroidAdapter();
    const engine = new ScreenTimeEngine(adapter, sync);

    // School policy blocks 08:00–14:00 Mon-Fri in IST
    const istPolicy: Policy = {
      ...BASE_POLICY,
      timezone: 'Asia/Kolkata', // UTC+5:30
      schedules: [
        {
          id: 's-ist',
          name: 'School Hours',
          startTime: '08:00',
          endTime: '14:00',
          daysOfWeek: [1, 2, 3, 4, 5],
          action: RestrictionAction.BLOCK,
        },
      ],
    };
    engine.applyPolicy(istPolicy);

    // 04:00 UTC on a Monday = 09:30 IST → inside school hours → should block
    const mondayUTC0400 = new Date('2026-09-14T04:00:00Z');
    const resultIST = engine.evaluateInPolicyTimezone(0, mondayUTC0400);
    assert.strictEqual(resultIST.shouldBlock, true, 'Should block during IST school hours even when UTC is early');
    console.info('  ✓ Timezone-aware evaluation (IST UTC+5:30) verified');
  }

  // ── 11. ScreenTimeEngine: timezone conversion (New York UTC-4 EDT) ──
  {
    const sync = new PolicySyncService();
    const adapter = new IOSAdapter();
    const engine = new ScreenTimeEngine(adapter, sync);

    const nyPolicy: Policy = {
      ...BASE_POLICY,
      timezone: 'America/New_York',
      schedules: [
        {
          id: 's-ny',
          name: 'School Hours',
          startTime: '08:00',
          endTime: '14:00',
          daysOfWeek: [1, 2, 3, 4, 5],
          action: RestrictionAction.BLOCK,
        },
      ],
    };
    engine.applyPolicy(nyPolicy);

    // 13:30 UTC on a Tuesday = 09:30 EDT → inside school hours → block
    const tuesdayUTC1330 = new Date('2026-09-15T13:30:00Z');
    const resultNY = engine.evaluateInPolicyTimezone(0, tuesdayUTC1330);
    assert.strictEqual(resultNY.shouldBlock, true, 'Should block in NY school hours (09:30 EDT)');

    // 18:30 UTC on same day = 14:30 EDT → outside school hours → allow
    const tuesdayUTC1830 = new Date('2026-09-15T18:30:00Z');
    const resultNYFree = engine.evaluateInPolicyTimezone(0, tuesdayUTC1830);
    assert.strictEqual(resultNYFree.shouldBlock, false, 'Should allow after NY school hours (14:30 EDT)');
    console.info('  ✓ Timezone-aware evaluation (New York EDT) verified');
  }

  // ── 12. ScreenTimeEngine: timezone change fallback (invalid TZ) ──
  {
    const sync = new PolicySyncService();
    const adapter = new AndroidAdapter();
    const engine = new ScreenTimeEngine(adapter, sync);
    const badTzPolicy: Policy = { ...BASE_POLICY, timezone: 'Not/AReal_TZ' };
    engine.applyPolicy(badTzPolicy);

    // Should not throw; falls back to UTC
    const result = engine.evaluateInPolicyTimezone(0, new Date('2026-09-15T10:00:00Z'));
    assert.strictEqual(typeof result.shouldBlock, 'boolean', 'Invalid timezone must not throw');
    console.info('  ✓ Invalid timezone graceful fallback verified');
  }

  // ── 13. PolicySyncService: partial policy update ──
  {
    const sync = new PolicySyncService();
    sync.savePolicyToCache(BASE_POLICY);

    const updated = sync.applyPartialPolicyUpdate({ version: 2, dailyLimitMinutes: 60 });
    assert.strictEqual(updated, true, 'Partial update must succeed for newer version');
    assert.strictEqual(sync.getCachedPolicy()!.dailyLimitMinutes, 60);
    assert.strictEqual(sync.getCachedPolicy()!.version, 2);

    // Stale update should be rejected
    const stale = sync.applyPartialPolicyUpdate({ version: 1, dailyLimitMinutes: 999 });
    assert.strictEqual(stale, false, 'Stale partial update must be rejected');
    assert.strictEqual(sync.getCachedPolicy()!.dailyLimitMinutes, 60, 'Cache must not change on stale update');
    console.info('  ✓ PolicySyncService partial update and version guard verified');
  }

  // ── 14. PolicySyncService: offline → online lifecycle ──
  {
    const sync = new PolicySyncService();
    sync.savePolicyToCache(BASE_POLICY);
    assert.strictEqual(sync.isOnline, true);

    sync.markDeviceOffline();
    assert.strictEqual(sync.isOnline, false);
    const offlineStatus = sync.getSyncStatus();
    assert.strictEqual(offlineStatus.isOnline, false);
    assert(offlineStatus.offlineDurationMs >= 0);

    sync.markDeviceOnline();
    assert.strictEqual(sync.isOnline, true);
    const onlineStatus = sync.getSyncStatus();
    assert.strictEqual(onlineStatus.offlineDurationMs, 0);
    console.info('  ✓ PolicySyncService offline/online lifecycle verified');
  }

  // ── 15. ParentScheduleService: create from templates ──
  {
    const svc = new ParentScheduleService();

    const school = svc.createFromTemplate('SCHOOL', 'sched-1');
    assert.strictEqual(school.name, 'School Hours');
    assert.strictEqual(school.startTime, '08:00');
    assert.strictEqual(school.endTime, '14:00');
    assert.strictEqual(school.action, RestrictionAction.BLOCK);
    assert.deepStrictEqual(school.daysOfWeek, [1, 2, 3, 4, 5]);

    const bedtime = svc.createFromTemplate('BEDTIME', 'sched-2');
    assert.strictEqual(bedtime.startTime, '22:00');
    assert.strictEqual(bedtime.endTime, '07:00'); // midnight-crossing

    const homework = svc.createFromTemplate('HOMEWORK', 'sched-3');
    assert.strictEqual(homework.action, RestrictionAction.LIMIT);

    console.info('  ✓ ParentScheduleService template creation verified for SCHOOL, BEDTIME, HOMEWORK');
  }

  // ── 16. ParentScheduleService: add / update / remove schedule ──
  {
    const svc = new ParentScheduleService();
    const rule = svc.createFromTemplate('SCHOOL', 'sched-add');
    let policy = { ...BASE_POLICY, schedules: [], version: 1 };

    const { ok, policy: p1 } = svc.addSchedule(policy, rule);
    assert.strictEqual(ok, true);
    assert.strictEqual(p1.schedules.length, 1);
    assert.strictEqual(p1.version, 2, 'Version must increment on add');
    policy = p1;

    const p2 = svc.updateSchedule(policy, 'sched-add', { endTime: '15:00' });
    assert.strictEqual(p2.schedules[0].endTime, '15:00');
    assert.strictEqual(p2.version, 3, 'Version must increment on update');
    policy = p2;

    const p3 = svc.removeSchedule(policy, 'sched-add');
    assert.strictEqual(p3.schedules.length, 0);
    assert.strictEqual(p3.version, 4, 'Version must increment on remove');

    console.info('  ✓ ParentScheduleService add/update/remove schedule verified');
  }

  // ── 17. ParentScheduleService: enable / disable schedule ──
  {
    const svc = new ParentScheduleService();
    const rule = svc.createFromTemplate('SCHOOL', 'sched-toggle');
    let policy = { ...BASE_POLICY, schedules: [rule], version: 1 };

    const p1 = svc.setScheduleEnabled(policy, 'sched-toggle', false);
    const disabled = p1.schedules.find((s) => s.id === 'sched-toggle')!;
    assert.strictEqual(disabled.action, RestrictionAction.ALLOW, 'Disabled schedule must use ALLOW action');
    assert(disabled.name.includes('disabled'), 'Disabled schedule name must indicate disabled state');
    policy = p1;

    const p2 = svc.setScheduleEnabled(policy, 'sched-toggle', true);
    const enabled = p2.schedules.find((s) => s.id === 'sched-toggle')!;
    assert.strictEqual(enabled.action, RestrictionAction.BLOCK, 'Re-enabled schedule must restore BLOCK action');
    assert(!enabled.name.includes('disabled'), 'Re-enabled schedule name must not include disabled');

    console.info('  ✓ ParentScheduleService enable/disable verified');
  }

  // ── 18. ParentScheduleService: overlapping BLOCK detection ──
  {
    const svc = new ParentScheduleService();
    const school = svc.createFromTemplate('SCHOOL', 's-school'); // 08:00–14:00 Mon-Fri BLOCK
    const { policy: p1 } = svc.addSchedule({ ...BASE_POLICY, schedules: [], version: 1 }, school);

    // Add another BLOCK rule overlapping Mon-Fri 10:00–12:00
    const overlapping: typeof school = {
      ...school,
      id: 's-overlap',
      name: 'Morning Extra Block',
      startTime: '10:00',
      endTime: '12:00',
    };
    const { conflicts } = svc.addSchedule(p1, overlapping);
    assert(conflicts.length > 0, 'Overlapping BLOCK rules must be flagged as conflicts');
    console.info('  ✓ Overlapping BLOCK schedule conflict detection verified');
  }

  // ── 19. ParentScheduleService: capability warnings ──
  {
    const svc = new ParentScheduleService();
    const appBlockWarnings = svc.getCapabilityWarnings('APP_BLOCKING');
    assert(appBlockWarnings.length >= 2, 'Must have warnings for both Android and iOS app blocking');
    assert(appBlockWarnings.some((w) => w.platform === 'ANDROID'));
    assert(appBlockWarnings.some((w) => w.platform === 'IOS'));

    const offlineWarnings = svc.getCapabilityWarnings('SCHEDULE_ENFORCEMENT_OFFLINE');
    assert(offlineWarnings.length >= 1);
    assert(offlineWarnings[0].platform === 'BOTH');

    const all = svc.getAllCapabilityWarnings();
    assert.strictEqual(all.length, CAPABILITY_WARNINGS.length);

    console.info('  ✓ ParentScheduleService capability warnings verified');
  }

  // ── 20. ScreenTimeEngine: canEnforceMode surfaces limitations ──
  {
    const sync = new PolicySyncService();
    const adapter = new AndroidAdapter(); // Android has non-empty limitations
    const engine = new ScreenTimeEngine(adapter, sync);

    const { enforceable, limitations } = engine.canEnforceMode('SCHOOL');
    assert.strictEqual(enforceable, true, 'All known modes are at least partially enforceable');
    assert(limitations.length > 0, 'Android adapter must surface platform limitations');
    assert(limitations.some((l) => l.includes('PACKAGE_USAGE_STATS') || l.includes('Usage Access')));
    console.info('  ✓ canEnforceMode surfaces platform limitations correctly');
  }

  // ── 21. ScreenTimeEngine: no policy loaded → allow with explanation ──
  {
    const sync = new PolicySyncService();
    const adapter = new AndroidAdapter();
    const engine = new ScreenTimeEngine(adapter, sync);
    // No policy applied
    const result = engine.evaluate(0, new Date());
    assert.strictEqual(result.shouldBlock, false, 'No policy → device must not be blocked');
    assert(result.reason.includes('No policy'), 'Reason must explain absence of policy');
    console.info('  ✓ No-policy allow with explanation verified');
  }

  // ── 22. SCHEDULE_TEMPLATES completeness check ──
  {
    const expectedModes: Array<keyof typeof SCHEDULE_TEMPLATES> = [
      'SCHOOL', 'HOMEWORK', 'BEDTIME', 'FREE', 'CUSTOM',
    ];
    for (const mode of expectedModes) {
      const t = SCHEDULE_TEMPLATES[mode];
      assert.strictEqual(t.mode, mode);
      assert(t.name.length > 0);
      assert(/^\d{2}:\d{2}$/.test(t.startTime));
      assert(/^\d{2}:\d{2}$/.test(t.endTime));
      assert(t.daysOfWeek.length > 0);
    }
    console.info('  ✓ All schedule templates have correct structure');
  }

  // ── 23. ScreenTimeEngine: IOS adapter integration ──
  {
    const sync = new PolicySyncService();
    const adapter = new IOSAdapter();
    const engine = new ScreenTimeEngine(adapter, sync);
    engine.applyPolicy(BASE_POLICY);

    const schoolTime = new Date('2026-09-15T09:00:00Z'); // Tuesday 09:00
    const result = engine.evaluate(20, schoolTime);
    assert.strictEqual(result.shouldBlock, true, 'iOS adapter must block during school hours');
    assert(result.platformLimitations.length > 0, 'iOS adapter must surface FamilyControls limitations');
    console.info('  ✓ ScreenTimeEngine + IOSAdapter integration verified');
  }

  console.info('=== SCREEN-TIME ENGINE INTEGRATION TEST SUITE PASSED SUCCESSFULLY ===');
}
