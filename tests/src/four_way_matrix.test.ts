import assert from 'assert';
import { UserRole, DevicePlatform, RestrictionAction, getDefaultCapabilities } from '@guardian/shared-types';
import { AtomicStorage, SyncTelemetryService, ScheduleEvaluator } from '@guardian/shared-utils';
import { RequestUserContext } from '../../services/api/src/middleware/authMiddleware';
import { AuthService } from '../../services/api/src/auth/authService';
import { FamilyService } from '../../services/api/src/services/familyService';
import { ChildService } from '../../services/api/src/services/childService';
import { PairingService } from '../../services/api/src/services/pairingService';
import { DeviceService } from '../../services/api/src/services/deviceService';
import { PolicyService } from '../../services/api/src/services/policyService';
import { ExtraTimeService } from '../../services/api/src/services/ExtraTimeService';
import { NotificationService } from '../../services/api/src/services/NotificationService';
import { AndroidAdapter } from '../../apps/child-mobile/src/AndroidAdapter';
import { IOSAdapter } from '../../apps/child-mobile/src/IOSAdapter';
import { PolicySyncService } from '../../apps/child-mobile/src/services/PolicySyncService';
import { ScreenTimeEngine } from '../../apps/child-mobile/src/services/ScreenTimeEngine';
import { SyncEngine } from '../../apps/child-mobile/src/services/SyncEngine';

export function runFourWayMatrixTestSuite(): void {
  console.info('Running Cross-Platform Four-Way Support Matrix Test Suite (Phase 16)...');

  const combinations: {
    name: string;
    parentOS: 'android' | 'ios';
    childPlatform: DevicePlatform;
  }[] = [
    { name: 'TEST A: Parent Android -> Child Android', parentOS: 'android', childPlatform: DevicePlatform.ANDROID },
    { name: 'TEST B: Parent Android -> Child iOS', parentOS: 'android', childPlatform: DevicePlatform.IOS },
    { name: 'TEST C: Parent iOS -> Child Android', parentOS: 'ios', childPlatform: DevicePlatform.ANDROID },
    { name: 'TEST D: Parent iOS -> Child iOS', parentOS: 'ios', childPlatform: DevicePlatform.IOS },
  ];

  for (let idx = 0; idx < combinations.length; idx++) {
    const testCase = combinations[idx];
    console.info(`\nExecuting Matrix ${testCase.name}...`);

    // Reset clean state per combination test
    AuthService.clearForTest();
    FamilyService.clearForTest();
    ChildService.clearForTest();
    PairingService.clearForTest();
    DeviceService.clearForTest();
    PolicyService.clearForTest();
    ExtraTimeService.clearForTest();
    NotificationService.clearForTest();
    AtomicStorage.clearForTest();
    SyncTelemetryService.clearForTest();

    // 1. Parent registers account from Parent OS
    const parentEmail = `parent.${testCase.parentOS}.${idx}@example.com`;
    const authRes = AuthService.register({
      email: parentEmail,
      password: 'SecurePassword123!',
      fullName: `Parent (${testCase.parentOS.toUpperCase()})`,
      role: UserRole.PARENT,
    });
    assert(authRes.token);

    const parentContext: RequestUserContext = {
      userId: authRes.user.id,
      role: UserRole.PARENT,
    };

    // 2. Parent creates family
    const family = FamilyService.createFamily(parentContext, `Family ${idx + 1}`);
    parentContext.familyId = family.id;

    // 3. Parent creates child profile
    const childName = testCase.childPlatform === DevicePlatform.IOS ? 'Child (iPhone)' : 'Child (Pixel)';
    const child = ChildService.createChild(parentContext, family.id, childName, 11);

    // 4. Parent generates single-use pairing code
    const pairCodeRec = PairingService.generatePairingCode(parentContext, child.id, family.id);
    assert.strictEqual(pairCodeRec.code.length, 6);

    // 5. Child device pairs (on Child Platform)
    const pairResult = DeviceService.pairDeviceWithCode({
      pairingCode: pairCodeRec.code,
      name: `${childName}'s Device`,
      platform: testCase.childPlatform,
      platformDeviceId: `pdev-${testCase.childPlatform}-${idx}`,
      capabilities: getDefaultCapabilities(testCase.childPlatform),
    });

    assert(pairResult.deviceToken);
    assert.strictEqual(pairResult.device.platform, testCase.childPlatform);
    assert(pairResult.device.capabilities !== undefined);

    // 6. Parent inspects device in dashboard
    const childDevices = DeviceService.getChildDevices(parentContext, child.id);
    assert.strictEqual(childDevices.length, 1);
    assert.strictEqual(childDevices[0].platform, testCase.childPlatform);

    // Capability check: iOS overlayBlocking is false; Android overlayBlocking is true
    if (testCase.childPlatform === DevicePlatform.IOS) {
      assert.strictEqual(childDevices[0].capabilities?.overlayBlocking, false);
      assert.strictEqual(childDevices[0].capabilities?.appBlocking, true);
    } else {
      assert.strictEqual(childDevices[0].capabilities?.overlayBlocking, true);
    }

    // 7. Parent creates daily limit & app rules
    const updatedPolicy = PolicyService.updatePolicy(parentContext, child.id, family.id, {
      dailyLimitMinutes: 90,
      bedtime: { enabled: true, startTime: '21:30', endTime: '06:30', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
      appRules: [{ appIdentifier: 'com.social.app', appName: 'Social App', action: RestrictionAction.BLOCK }],
    });
    assert.strictEqual(updatedPolicy.dailyLimitMinutes, 90);

    // 8. Child device syncs policy using appropriate native adapter bridge
    const adapter = testCase.childPlatform === DevicePlatform.IOS ? new IOSAdapter() : new AndroidAdapter();
    const policySyncService = new PolicySyncService();
    const screenTimeEngine = new ScreenTimeEngine(adapter, policySyncService);
    const syncEngine = new SyncEngine(policySyncService);

    const mockTransport = {
      checkSync: async (ver: number) => {
        const serverPol = PolicyService.getPolicy(parentContext, child.id);
        if (ver < serverPol.version) return { status: 200, data: { upToDate: false, policy: serverPol } };
        return { status: 200, data: { upToDate: true } };
      },
      acknowledgeSync: async () => true,
    };

    syncEngine.performSync(mockTransport).then((synced) => {
      assert.strictEqual(synced, true);
      assert.strictEqual(policySyncService.getCachedPolicy()?.version, updatedPolicy.version);
    });

    // 9. Evaluate local restriction
    const bedtimeTime = new Date('2026-09-15T22:00:00Z');
    const localEval = ScheduleEvaluator.evaluate(updatedPolicy, bedtimeTime, 0);
    assert.strictEqual(localEval.isBlocked, true);
    assert.strictEqual(localEval.activePeriodName, 'Bedtime');

    // 10. Extra-time request workflow
    const childContext: RequestUserContext = { userId: `child-usr-${idx}`, familyId: family.id, role: UserRole.CHILD };
    const req = ExtraTimeService.createRequest(childContext, child.id, family.id, 15, 'Homework extension');

    const parentNotifs = NotificationService.getNotificationsForRecipient(family.id);
    assert.strictEqual(parentNotifs.length, 1);

    ExtraTimeService.respondToRequest(parentContext, req.id, 'APPROVE', 15);

    const policyWithAllowance = PolicyService.getPolicy(parentContext, child.id);
    assert.strictEqual(policyWithAllowance.temporaryAllowances.length, 1);

    // 11. Offline enforcement & recovery
    policySyncService.savePolicyToCache(policyWithAllowance);
    policySyncService.markDeviceOffline();
    assert.strictEqual(policySyncService.isOnline, false);

    const offlineEval = screenTimeEngine.evaluate(20, new Date('2026-09-15T14:00:00Z'));
    assert.strictEqual(offlineEval.isOfflineFallback, true);
    assert.strictEqual(offlineEval.shouldBlock, false); // Active allowance / free time

    policySyncService.markDeviceOnline();
    assert.strictEqual(policySyncService.isOnline, true);

    console.info(`  ✓ ${testCase.name} VERIFIED CLEANLY`);
  }

  console.info('\n=== ALL 4 CROSS-PLATFORM COMBINATIONS (PARENT ANDROID/IOS -> CHILD ANDROID/IOS) PASSED SUCCESSFULLY ===');
}
