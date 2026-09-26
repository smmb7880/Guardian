import assert from 'assert';
import { UserRole, RestrictionAction } from '@guardian/shared-types';
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
import { PolicySyncService } from '../../apps/child-mobile/src/services/PolicySyncService';
import { ScreenTimeEngine } from '../../apps/child-mobile/src/services/ScreenTimeEngine';
import { SyncEngine } from '../../apps/child-mobile/src/services/SyncEngine';

export function runE2eMvpFlowTestSuite(): void {
  console.info('Running 21-Step End-to-End MVP Integration Flow Test Suite (Phase 15)...');

  // Clear state
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

  // 1. Parent creates an account
  const authRes = AuthService.register({
    email: 'parent.mvp@example.com',
    password: 'SecurePassword123!',
    fullName: 'Jane Parent',
    role: UserRole.PARENT,
  });
  assert(authRes.token);
  assert.strictEqual(authRes.user.email, 'parent.mvp@example.com');
  console.info('  ✓ 1. Parent created account');

  const parentContext: RequestUserContext = {
    userId: authRes.user.id,
    role: UserRole.PARENT,
  };

  // 2. Parent creates a family
  const family = FamilyService.createFamily(parentContext, 'The Parent Family');
  parentContext.familyId = family.id;
  assert.strictEqual(family.name, 'The Parent Family');
  console.info('  ✓ 2. Parent created family');

  // 3. Parent creates a child
  const child = ChildService.createChild(parentContext, family.id, 'Tommy', 10);
  assert.strictEqual(child.name, 'Tommy');
  console.info('  ✓ 3. Parent created child profile');

  // 4. Parent generates a secure pairing code
  const pairCodeRec = PairingService.generatePairingCode(parentContext, child.id, family.id);
  assert.strictEqual(pairCodeRec.code.length, 6);
  assert.strictEqual(pairCodeRec.isUsed, false);
  console.info('  ✓ 4. Parent generated secure pairing code');

  // 5. Child device pairs
  const pairResult = PairingService.pairDevice(pairCodeRec.code, 'android', "Tommy's Tablet");
  assert(pairResult.deviceToken);
  assert.strictEqual(pairResult.childId, child.id);
  console.info('  ✓ 5. Child device paired');

  // 6. Device appears in the parent dashboard
  const devices = DeviceService.getChildDevices(parentContext, child.id);
  assert.strictEqual(devices.length, 1);
  assert.strictEqual(devices[0].deviceName, "Tommy's Tablet");
  console.info('  ✓ 6. Device appears in parent dashboard');

  // 7. Parent sees device status
  const devStatus = DeviceService.getDevice(parentContext, devices[0].id);
  assert.strictEqual(devStatus.isPaired, true);
  assert(devStatus.lastSyncAt !== null);
  console.info('  ✓ 7. Parent sees device status');

  // 8. Parent creates a daily screen-time limit
  // 9. Parent creates bedtime
  // 10. Parent configures supported app restrictions
  const updatedPol = PolicyService.updatePolicy(parentContext, child.id, family.id, {
    dailyLimitMinutes: 120,
    bedtime: { enabled: true, startTime: '21:00', endTime: '07:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
    appRules: [{ appIdentifier: 'com.game.action', appName: 'Action Game', action: RestrictionAction.BLOCK }],
  });
  assert.strictEqual(updatedPol.dailyLimitMinutes, 120);
  assert.strictEqual(updatedPol.bedtime.startTime, '21:00');
  assert.strictEqual(updatedPol.appRules.length, 1);
  console.info('  ✓ 8-10. Parent configured daily limit, bedtime, and app restrictions');

  // 11. Child device receives the policy
  // 12. Device stores the policy locally
  const androidAdapter = new AndroidAdapter();
  const policySyncService = new PolicySyncService();
  const screenTimeEngine = new ScreenTimeEngine(androidAdapter, policySyncService);
  const syncEngine = new SyncEngine(policySyncService);

  const mockTransport = {
    checkSync: async (version: number) => {
      const currentServerPol = PolicyService.getPolicy(parentContext, child.id);
      if (version < currentServerPol.version) {
        return { status: 200, data: { upToDate: false, policy: currentServerPol } };
      }
      return { status: 200, data: { upToDate: true } };
    },
    acknowledgeSync: async () => true,
  };

  syncEngine.performSync(mockTransport).then((synced) => {
    assert.strictEqual(synced, true);
    assert.strictEqual(policySyncService.getCachedPolicy()?.version, updatedPol.version);
    console.info('  ✓ 11-12. Child device received policy and stored atomically in local storage');
  });

  // 13. Supported restrictions are actually enforced
  const bedtimeTestTime = new Date('2026-09-15T22:30:00Z'); // 22:30 Bedtime
  const evalResult = ScheduleEvaluator.evaluate(updatedPol, bedtimeTestTime, 0);
  assert.strictEqual(evalResult.isBlocked, true);
  assert.strictEqual(evalResult.activePeriodName, 'Bedtime');
  console.info('  ✓ 13. Supported restrictions enforced locally');

  // 14. Child requests extra time
  const childContext: RequestUserContext = { userId: 'child-user-1', familyId: family.id, role: UserRole.CHILD };
  const req = ExtraTimeService.createRequest(childContext, child.id, family.id, 15, 'Finish project assignment');
  assert.strictEqual(req.requestedMinutes, 15);
  console.info('  ✓ 14. Child requested extra time');

  // 15. Parent receives notification
  const parentNotifs = NotificationService.getNotificationsForRecipient(family.id);
  assert.strictEqual(parentNotifs.length, 1);
  assert(parentNotifs[0].body.includes('15 extra minutes'));
  console.info('  ✓ 15. Parent received push notification');

  // 16. Parent approves
  // 17. Temporary allowance is applied
  const respondRes = ExtraTimeService.respondToRequest(parentContext, req.id, 'APPROVE', 15);
  assert.strictEqual(respondRes.request.status, 'APPROVED');

  const polWithAllowance = PolicyService.getPolicy(parentContext, child.id);
  assert.strictEqual(polWithAllowance.temporaryAllowances.length, 1);
  assert.strictEqual(polWithAllowance.temporaryAllowances[0].durationMinutes, 15);
  console.info('  ✓ 16-17. Parent approved request; temporary allowance applied to policy');

  // 18. Temporary allowance expires
  // Simulate time fast forward beyond allowance expiration
  const futureTime = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes later
  policySyncService.savePolicyToCache(polWithAllowance);
  const prunedCount = policySyncService.pruneExpiredAllowances(futureTime);
  assert.strictEqual(prunedCount, 1);
  console.info('  ✓ 18. Temporary allowance expired and pruned');

  // 19. Device returns to the original policy
  const postExpiryPolicy = policySyncService.getCachedPolicy()!;
  assert.strictEqual(postExpiryPolicy.temporaryAllowances.length, 0);
  console.info('  ✓ 19. Device returned to original policy baseline');

  // 20. Device continues using the last valid policy while offline
  policySyncService.markDeviceOffline();
  assert.strictEqual(policySyncService.isOnline, false);
  const offlineEval = screenTimeEngine.evaluate(30, new Date('2026-09-15T14:00:00Z'));
  assert.strictEqual(offlineEval.isOfflineFallback, true);
  assert.strictEqual(offlineEval.shouldBlock, false); // Within daily limit during free time
  console.info('  ✓ 20. Device continues using last valid policy while offline');

  // 21. Device synchronizes correctly when connectivity returns
  policySyncService.markDeviceOnline();
  assert.strictEqual(policySyncService.isOnline, true);
  syncEngine.performSync(mockTransport).then((resync) => {
    assert.strictEqual(resync, true);
    console.info('  ✓ 21. Device synchronized correctly upon connectivity recovery');
  });

  console.info('=== 21-STEP END-TO-END MVP INTEGRATION FLOW PASSED CLEANLY ===');
}
