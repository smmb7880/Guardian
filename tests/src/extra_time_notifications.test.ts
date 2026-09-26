import assert from 'assert';
import { UserRole } from '@guardian/shared-types';
import { RequestUserContext } from '../../services/api/src/middleware/authMiddleware';
import { PolicyService } from '../../services/api/src/services/policyService';
import { ExtraTimeService } from '../../services/api/src/services/ExtraTimeService';
import { NotificationService } from '../../services/api/src/services/NotificationService';
import { AuditService } from '../../services/api/src/services/auditService';
import { AppError } from '../../services/api/src/middleware/errorHandler';

export function runExtraTimeNotificationsTestSuite(): void {
  console.info('Running Extra-Time Requests & Push Notifications Test Suite (Phase 11)...');

  // Setup test contexts
  const parentContext: RequestUserContext = {
    userId: 'parent-user-1',
    familyId: 'fam-ext-1',
    role: UserRole.PARENT,
  };

  const childContext: RequestUserContext = {
    userId: 'child-user-1',
    familyId: 'fam-ext-1',
    role: UserRole.CHILD,
  };

  const childId = 'child-ext-1';
  const familyId = 'fam-ext-1';

  // Helper to reset state before each test
  function resetState(): void {
    PolicyService.clearForTest();
    ExtraTimeService.clearForTest();
    NotificationService.clearForTest();
    AuditService.clearForTest();
    // Create initial policy
    PolicyService.createDefaultPolicy(parentContext, childId, familyId);
  }

  // ── Test 1: Approval (+15 min approval creates temporary allowance in policy) ──
  resetState();
  const req1 = ExtraTimeService.createRequest(childContext, childId, familyId, 15, 'Need to finish group project');
  assert.strictEqual(req1.status, 'PENDING');
  assert.strictEqual(req1.requestedMinutes, 15);

  const res1 = ExtraTimeService.respondToRequest(parentContext, req1.id, 'APPROVE', 15);
  assert.strictEqual(res1.request.status, 'APPROVED');
  assert.strictEqual(res1.request.grantedMinutes, 15);

  // Verify policy received temporary allowance
  const pol1 = PolicyService.getPolicy(parentContext, childId);
  assert.strictEqual(pol1.temporaryAllowances.length, 1);
  assert.strictEqual(pol1.temporaryAllowances[0].durationMinutes, 15);
  console.info('  ✓ Approval (+15 min approval creating temporary allowance) verified');

  // ── Test 2: Denial (denying request updates status to DENIED, no allowance added) ──
  resetState();
  const req2 = ExtraTimeService.createRequest(childContext, childId, familyId, 30, 'Playing extra video games');
  assert.strictEqual(req2.status, 'PENDING');

  const res2 = ExtraTimeService.respondToRequest(parentContext, req2.id, 'DENY');
  assert.strictEqual(res2.request.status, 'DENIED');

  const pol2 = PolicyService.getPolicy(parentContext, childId);
  assert.strictEqual(pol2.temporaryAllowances.length, 0);
  console.info('  ✓ Denial (status updated to DENIED, zero allowance added) verified');

  // ── Test 3: Expiration (unanswered request expires after TTL) ──
  resetState();
  const req3 = ExtraTimeService.createRequest(childContext, childId, familyId, 20, 'Request before bedtime');
  // Manually modify request expiresAt to simulating timeout in past
  const rawReq3 = ExtraTimeService.getRequestById(req3.id)!;
  rawReq3.expiresAt = new Date(Date.now() - 1000).toISOString();

  // Query pending requests triggers auto-expiration
  const pendingAfterExp = ExtraTimeService.getPendingRequests(parentContext, familyId);
  assert.strictEqual(pendingAfterExp.length, 0);
  assert.strictEqual(rawReq3.status, 'EXPIRED');

  // Attempting to approve expired request throws REQUEST_EXPIRED
  assert.throws(
    () => ExtraTimeService.respondToRequest(parentContext, req3.id, 'APPROVE'),
    (err: AppError) => err.code === 'REQUEST_EXPIRED',
  );
  console.info('  ✓ Expiration (unanswered request timeout) verified');

  // ── Test 4: Duplicate Request Protection ──
  resetState();
  ExtraTimeService.createRequest(childContext, childId, familyId, 15, 'First request');

  // Second request while first is PENDING should be rejected
  assert.throws(
    () => ExtraTimeService.createRequest(childContext, childId, familyId, 30, 'Second request'),
    (err: AppError) => err.code === 'DUPLICATE_REQUEST',
  );
  console.info('  ✓ Duplicate request protection verified');

  // ── Test 5: Offline Child Policy Sync ──
  resetState();
  const req5 = ExtraTimeService.createRequest(childContext, childId, familyId, 30, 'Online request before offline');
  ExtraTimeService.respondToRequest(parentContext, req5.id, 'APPROVE', 30);

  // Child reconnects and polls policy from server
  const offlineChildPolicy = PolicyService.getPolicy(childContext, childId);
  assert.strictEqual(offlineChildPolicy.temporaryAllowances.length, 1);
  assert.strictEqual(offlineChildPolicy.temporaryAllowances[0].durationMinutes, 30);
  console.info('  ✓ Offline child (server policy state updated for reconnect sync) verified');

  // ── Test 6: Offline Parent Notification Queue ──
  resetState();
  ExtraTimeService.createRequest(childContext, childId, familyId, 15, 'Request while parent offline');

  // Notification is queued in NotificationService for familyId
  const queuedNotifs = NotificationService.getNotificationsForRecipient(familyId);
  assert.strictEqual(queuedNotifs.length, 1);
  assert(queuedNotifs[0].body.includes('15 extra minutes'));

  // Parent app fetches pending requests on open
  const parentPending = ExtraTimeService.getPendingRequests(parentContext, familyId);
  assert.strictEqual(parentPending.length, 1);
  console.info('  ✓ Offline parent (notification queued & pending list fetched on open) verified');

  // ── Test 7: Stale Approval Rejection ──
  resetState();
  const req7 = ExtraTimeService.createRequest(childContext, childId, familyId, 15, 'Stale test');
  ExtraTimeService.respondToRequest(parentContext, req7.id, 'APPROVE', 15);

  // Attempting to approve again throws STALE_REQUEST
  assert.throws(
    () => ExtraTimeService.respondToRequest(parentContext, req7.id, 'APPROVE', 15),
    (err: AppError) => err.code === 'STALE_REQUEST',
  );
  console.info('  ✓ Stale approval rejection verified');

  // ── Test 8: Policy Version Conflict Check ──
  resetState();
  const req8 = ExtraTimeService.createRequest(childContext, childId, familyId, 15, 'Conflict test');

  // Update policy in background (increment version from 1 to 2)
  PolicyService.updatePolicy(parentContext, childId, familyId, { dailyLimitMinutes: 180 });

  // Parent tries to approve specifying stale expectedPolicyVersion = 1
  assert.throws(
    () => ExtraTimeService.respondToRequest(parentContext, req8.id, 'APPROVE', 15, 1),
    (err: AppError) => err.code === 'POLICY_VERSION_CONFLICT',
  );
  console.info('  ✓ Policy version conflict detection verified');

  // ── Test 9: Push Notification Deduplication ──
  resetState();
  const notif1 = NotificationService.sendPushNotification(parentContext.userId, 'Title', 'Body', {}, 'dedupe-key-100');
  const notif2 = NotificationService.sendPushNotification(parentContext.userId, 'Title', 'Body', {}, 'dedupe-key-100');

  assert.strictEqual(notif1.id, notif2.id); // Exactly same notification instance returned
  const allNotifs = NotificationService.getNotificationsForRecipient(parentContext.userId);
  assert.strictEqual(allNotifs.length, 1); // Only 1 delivered notification record
  console.info('  ✓ Notification deduplication verified');

  console.info('=== EXTRA-TIME REQUESTS & PUSH NOTIFICATIONS TEST SUITE PASSED SUCCESSFULLY ===');
}
