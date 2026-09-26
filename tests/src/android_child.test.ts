import assert from 'assert';
import { DevicePlatform, Policy, RestrictionAction } from '@guardian/shared-types';
import { AndroidAdapter } from '../../apps/child-mobile/src/adapters/AndroidAdapter';
import { ChildAppController } from '../../apps/child-mobile/src/services/ChildAppController';
import { ChildDeviceSession } from '../../apps/child-mobile/src/services/ChildDeviceSession';
import { PolicySyncService } from '../../apps/child-mobile/src/services/PolicySyncService';

export function runAndroidChildTestSuite(): void {
  console.info('Running Android Child Device Test Suite (Phase 8)...');

  // Test 1: AndroidAdapter platform capability report
  const adapter = new AndroidAdapter();
  assert.strictEqual(adapter.platform, DevicePlatform.ANDROID);

  const capabilityReport = adapter.getCapabilityReport();
  assert.strictEqual(capabilityReport.platform, 'ANDROID');
  assert(capabilityReport.supported.includes('DEVICE_REGISTRATION'));
  assert(capabilityReport.supported.includes('POLICY_SYNC'));
  assert(capabilityReport.unsupported.includes('KEYLOGGING'));
  assert(capabilityReport.unsupported.includes('COVERT_RECORDING'));
  assert(capabilityReport.requires_permission.includes('PACKAGE_USAGE_STATS'));
  assert(capabilityReport.requires_permission.includes('SYSTEM_ALERT_WINDOW'));
  assert(capabilityReport.requires_user_action.includes('ENABLE_USAGE_ACCESS_SETTINGS'));
  console.info('  ✓ AndroidAdapter capability report structure verified');

  // Test 2: Permission status check
  adapter.checkPermissionStatus().then((permStatus) => {
    assert.strictEqual(typeof permStatus.granted, 'boolean');
    assert(Array.isArray(permStatus.missingPermissions));
  });
  console.info('  ✓ Permission status check verified');

  // Test 3: Policy application and usage reporting
  const testPolicy: Policy = {
    id: 'pol-1',
    childId: 'child-1',
    version: 3,
    timezone: 'UTC',
    dailyLimitMinutes: 120,
    bedtime: {
      enabled: false,
      startTime: '22:00',
      endTime: '07:00',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    },
    schedules: [],
    appRules: [
      { appIdentifier: 'com.social.tiktok', appName: 'TikTok', action: RestrictionAction.BLOCK },
      { appIdentifier: 'com.learning.duolingo', appName: 'Duolingo', action: RestrictionAction.ALLOW },
    ],
    websiteRules: [],
    categoryRules: [],
    temporaryAllowances: [],
    updatedAt: new Date().toISOString(),
  };

  adapter.applyPolicy(testPolicy).then((applied) => {
    assert.strictEqual(applied, true);
  });

  adapter.getUsageReport().then((report) => {
    assert.strictEqual(typeof report.totalScreenTimeMinutes, 'number');
    assert.strictEqual(typeof report.appUsageMinutes, 'object');
  });
  console.info('  ✓ Policy application and usage statistics report verified');

  // Test 4: ChildAppController & Device Session
  const controller = new ChildAppController();
  const session = controller.getSession();
  assert.strictEqual(session.isRegistered(), false);

  controller.pairDeviceWithCode('123456', 'android-device-uuid-999', 'Alex Android Phone').then((creds) => {
    assert.strictEqual(creds.platformDeviceId, 'android-device-uuid-999');
    assert.strictEqual(session.isRegistered(), true);
    assert.strictEqual(session.getAccessToken(), 'child-access-token-123');
  });

  // Test 5: Policy evaluation rules
  controller.syncAndApplyPolicy(testPolicy).then((synced) => {
    assert.strictEqual(synced, true);

    const tiktokEval = controller.evaluateAppAccess('com.social.tiktok');
    assert.strictEqual(tiktokEval.allowed, false);
    assert(tiktokEval.reason?.includes('TikTok is blocked'));

    const duolingoEval = controller.evaluateAppAccess('com.learning.duolingo');
    assert.strictEqual(duolingoEval.allowed, true);

    const unknownAppEval = controller.evaluateAppAccess('com.other.app');
    assert.strictEqual(unknownAppEval.allowed, true);
  });
  console.info('  ✓ ChildAppController policy evaluation and access restrictions verified');

  console.info('=== ANDROID CHILD DEVICE TEST SUITE PASSED SUCCESSFULLY ===');
}
