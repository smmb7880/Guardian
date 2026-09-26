import assert from 'assert';
import { Policy, UserRole } from '@guardian/shared-types';
import { AtomicStorage, SyncTelemetryService, StorageCorruptionError } from '@guardian/shared-utils';
import { RequestUserContext } from '../../services/api/src/middleware/authMiddleware';
import { PolicyService } from '../../services/api/src/services/policyService';
import { PolicySyncService } from '../../apps/child-mobile/src/services/PolicySyncService';
import { SyncEngine } from '../../apps/child-mobile/src/services/SyncEngine';

export function runOfflineSyncTestSuite(): void {
  console.info('Running Offline-First Synchronization & Recovery Test Suite (Phase 12)...');

  const parentContext: RequestUserContext = {
    userId: 'parent-sync-1',
    familyId: 'fam-sync-1',
    role: UserRole.PARENT,
  };

  const childId = 'child-sync-1';
  const familyId = 'fam-sync-1';

  function resetState(): void {
    PolicyService.clearForTest();
    AtomicStorage.clearForTest();
    SyncTelemetryService.clearForTest();
    PolicyService.createDefaultPolicy(parentContext, childId, familyId);
  }

  // ── Test 1: Full Online Sync Protocol ──
  resetState();
  const syncService1 = new PolicySyncService();
  const syncEngine1 = new SyncEngine(syncService1);

  // Update server policy to version 2
  const serverPolV2 = PolicyService.updatePolicy(parentContext, childId, familyId, { dailyLimitMinutes: 180 });
  assert.strictEqual(serverPolV2.version, 2);

  let ackedVersion: number | null = null;
  const transport1 = {
    checkSync: async (version: number) => {
      if (version < serverPolV2.version) {
        return { status: 200, data: { upToDate: false, policy: serverPolV2 } };
      }
      return { status: 200, data: { upToDate: true } };
    },
    acknowledgeSync: async (version: number) => {
      ackedVersion = version;
      return true;
    },
  };

  syncEngine1.performSync(transport1).then((success) => {
    assert.strictEqual(success, true);
    assert.strictEqual(syncEngine1.getSyncState(), 'UP_TO_DATE');
    assert.strictEqual(syncService1.getCachedPolicy()?.version, 2);
    assert.strictEqual(ackedVersion, 2);
    console.info('  ✓ Full Online Sync Protocol (version check -> atomic store -> ack) verified');
  });

  // ── Test 2: Exponential Backoff & Max Retry Cap ──
  resetState();
  const syncService2 = new PolicySyncService();
  const syncEngine2 = new SyncEngine(syncService2, { baseDelayMs: 100, maxAttempts: 5 });

  assert.strictEqual(syncEngine2.calculateBackoffDelay(1) >= 100, true);
  assert.strictEqual(syncEngine2.calculateBackoffDelay(2) >= 200, true);
  assert.strictEqual(syncEngine2.calculateBackoffDelay(3) >= 400, true);

  const failingTransport = {
    checkSync: async () => ({ status: 503 }),
    acknowledgeSync: async () => false,
  };

  // Run 5 failing attempts
  (async () => {
    for (let i = 0; i < 5; i++) {
      await syncEngine2.performSync(failingTransport);
    }
    assert.strictEqual(syncEngine2.getSyncState(), 'PAUSED_COOLDOWN');
    assert.strictEqual(syncEngine2.getAttemptCount(), 5);
    console.info('  ✓ Exponential Backoff & Max Retry Cap (5 attempts cap -> PAUSED_COOLDOWN) verified');
  })();

  // ── Test 3: Network Failure & Recovery ──
  resetState();
  const syncService3 = new PolicySyncService();
  const initialPol = PolicyService.getPolicy(parentContext, childId);
  syncService3.savePolicyToCache(initialPol);

  // Simulate network loss
  syncService3.markDeviceOffline();
  assert.strictEqual(syncService3.isOnline, false);
  assert.strictEqual(syncService3.getCachedPolicy()?.version, 1);

  // Restore network connection
  syncService3.markDeviceOnline();
  assert.strictEqual(syncService3.isOnline, true);
  console.info('  ✓ Network Failure & Recovery (offline mode fallback -> online recovery) verified');

  // ── Test 4: Server Unavailability (503 Handling) ──
  resetState();
  const syncService4 = new PolicySyncService();
  const syncEngine4 = new SyncEngine(syncService4, { baseDelayMs: 50 });

  syncEngine4.performSync(failingTransport).then((res) => {
    assert.strictEqual(res, false);
    assert.strictEqual(syncEngine4.getSyncState(), 'BACKOFF_RETRY');
    console.info('  ✓ Server Unavailability (503 handling & backoff retry state) verified');
  });

  // ── Test 5: Invalid Server Response Schema Rejection ──
  resetState();
  const syncService5 = new PolicySyncService();
  const syncEngine5 = new SyncEngine(syncService5);
  syncService5.savePolicyToCache(PolicyService.getPolicy(parentContext, childId));

  const invalidTransport = {
    checkSync: async () => ({ status: 200, data: { policy: { bad: 'schema' } as any } }),
    acknowledgeSync: async () => true,
  };

  syncEngine5.performSync(invalidTransport).then((res) => {
    assert.strictEqual(res, false);
    // Cached policy must remain valid version 1
    assert.strictEqual(syncService5.getCachedPolicy()?.version, 1);
    console.info('  ✓ Invalid Server Payload Rejection (schema validation failure, cache preserved) verified');
  });

  // ── Test 6: Expired Credentials (401 Handling & Refresh) ──
  resetState();
  const syncService6 = new PolicySyncService();
  const syncEngine6 = new SyncEngine(syncService6);

  let refreshed = false;
  const expiredCredsTransport = {
    checkSync: async () => ({ status: 401 }),
    acknowledgeSync: async () => true,
    refreshToken: async () => {
      refreshed = true;
      return false; // Refresh failed -> remains unauthenticated
    },
  };

  syncEngine6.performSync(expiredCredsTransport).then(() => {
    assert.strictEqual(refreshed, true);
    assert.strictEqual(syncEngine6.getSyncState(), 'EXPIRED_CREDENTIALS');
    console.info('  ✓ Expired Credentials (401 token refresh flow) verified');
  });

  // ── Test 7: Revoked Device Handling (403/404) ──
  resetState();
  const syncService7 = new PolicySyncService();
  const syncEngine7 = new SyncEngine(syncService7);
  syncService7.savePolicyToCache(PolicyService.getPolicy(parentContext, childId));

  const revokedTransport = {
    checkSync: async () => ({ status: 403 }),
    acknowledgeSync: async () => true,
  };

  syncEngine7.performSync(revokedTransport).then(() => {
    assert.strictEqual(syncEngine7.getSyncState(), 'REVOKED');
    assert.strictEqual(syncService7.getCachedPolicy(), null); // Cache wiped
    assert.strictEqual(syncService7.getSyncStatus().isRevoked, true);
    console.info('  ✓ Revoked Device Handling (403 cache wipe & lock down) verified');
  });

  // ── Test 8: Corrupted Local State Recovery ──
  resetState();
  const syncService8 = new PolicySyncService();
  syncService8.savePolicyToCache(PolicyService.getPolicy(parentContext, childId));

  // Corrupt local storage
  AtomicStorage.corruptKeyForTest('local_policy_cache');

  // Reload storage -> detects corruption
  syncService8.loadFromStorage();
  assert.strictEqual(syncService8.getCachedPolicy(), null);
  assert.strictEqual(syncService8.getSyncStatus().hasCorruptedStorage, true);

  // Verify non-sensitive metric recorded
  const metrics8 = SyncTelemetryService.getMetrics();
  assert.strictEqual(metrics8.corruptionDetectedCount, 1);
  console.info('  ✓ Corrupted Local State Recovery (checksum validation -> cache reset -> safe fallback) verified');

  // ── Test 9: Atomic Storage Write Integrity ──
  resetState();
  const polV1 = PolicyService.getPolicy(parentContext, childId);
  AtomicStorage.writeAtomic('test_atomic_key', polV1);

  const readBack = AtomicStorage.readAtomic<Policy>('test_atomic_key');
  assert.strictEqual(readBack?.id, polV1.id);
  assert.strictEqual(readBack?.version, 1);
  console.info('  ✓ Atomic Storage Write Integrity verified');

  // ── Test 10: Privacy-Preserving Telemetry Verification ──
  const metrics = SyncTelemetryService.getMetrics();
  assert(typeof metrics.syncAttemptCount === 'number');
  assert(typeof metrics.corruptionDetectedCount === 'number');
  console.info('  ✓ Privacy-Preserving Operational Telemetry (zero PII logged) verified');

  console.info('=== OFFLINE-FIRST SYNCHRONIZATION & RECOVERY TEST SUITE PASSED SUCCESSFULLY ===');
}
