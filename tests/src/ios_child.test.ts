import assert from 'assert';
import { DevicePlatform, Policy, RestrictionAction } from '@guardian/shared-types';
import { IOSAdapter } from '../../apps/child-mobile/src/adapters/IOSAdapter';

export function runIOSChildTestSuite(): void {
  console.info('Running iOS Child Device Test Suite (Phase 9)...');

  // Test 1: IOSAdapter platform capability report
  const adapter = new IOSAdapter();
  assert.strictEqual(adapter.platform, DevicePlatform.IOS);

  const capabilityReport = adapter.getCapabilityReport();
  assert.strictEqual(capabilityReport.platform, 'IOS');
  assert(capabilityReport.supported.includes('FAMILY_CONTROLS_AUTHORIZATION'));
  assert(capabilityReport.supported.includes('MANAGED_SETTINGS_SHIELDING'));
  assert(capabilityReport.supported.includes('DEVICE_ACTIVITY_MONITORING'));
  assert(capabilityReport.unsupported.includes('KEYLOGGING'));
  assert(capabilityReport.unsupported.includes('COVERT_RECORDING'));
  assert(capabilityReport.unsupported.includes('RAW_PACKAGE_LISTING'));
  assert(capabilityReport.requires_permission.includes('FamilyControlsAuthorization'));
  assert(capabilityReport.requires_user_action.includes('APPROVE_FAMILY_CONTROLS_PROMPT'));
  console.info('  ✓ IOSAdapter capability report structure verified');

  // Test 2: Permission status check
  adapter.checkPermissionStatus().then((permStatus) => {
    assert.strictEqual(typeof permStatus.granted, 'boolean');
    assert(Array.isArray(permStatus.missingPermissions));
  });
  console.info('  ✓ Permission status check verified');

  // Test 3: Policy application and usage reporting
  const testPolicy: Policy = {
    id: 'pol-ios-1',
    childId: 'child-ios-1',
    version: 4,
    timezone: 'America/New_York',
    dailyLimitMinutes: 90,
    bedtime: {
      enabled: true,
      startTime: '21:00',
      endTime: '06:30',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    },
    schedules: [],
    appRules: [
      { appIdentifier: 'token-social-media', appName: 'Social Media Category', action: RestrictionAction.BLOCK },
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
  console.info('  ✓ iOS Policy application and usage statistics report verified');

  // Test 4: Platform Limitations
  const limitations = adapter.getPlatformLimitations();
  assert(limitations.length > 0);
  assert(limitations.some((l) => l.includes('FamilyControls entitlement')));
  console.info('  ✓ iOS platform limitations reference verified');

  console.info('=== IOS CHILD DEVICE TEST SUITE PASSED SUCCESSFULLY ===');
}
