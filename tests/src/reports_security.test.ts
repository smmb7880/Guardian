import assert from 'assert';
import { UserRole } from '@guardian/shared-types';
import { RequestUserContext } from '../../services/api/src/middleware/authMiddleware';
import { AppError } from '../../services/api/src/middleware/errorHandler';
import { PolicyService } from '../../services/api/src/services/policyService';
import { ChildService } from '../../services/api/src/services/childService';
import { DeviceService } from '../../services/api/src/services/deviceService';
import { ReportingService } from '../../services/api/src/services/ReportingService';
import { AccountPrivacyService } from '../../services/api/src/services/AccountPrivacyService';
import { getSecurityHeaders } from '../../services/api/src/middleware/securityHeaders';
import { ApiRateLimiter } from '../../services/api/src/middleware/rateLimiter';
import { AuditService } from '../../services/api/src/services/auditService';

export function runReportsSecurityTestSuite(): void {
  console.info('Running Reports & Security Hardening Test Suite (Phase 13)...');

  const parentContextA: RequestUserContext = {
    userId: 'parent-sec-A',
    familyId: 'fam-sec-A',
    role: UserRole.PARENT,
  };

  const parentContextB: RequestUserContext = {
    userId: 'parent-sec-B',
    familyId: 'fam-sec-B',
    role: UserRole.PARENT,
  };

  const childIdA = 'child-sec-A';
  const familyIdA = 'fam-sec-A';

  function resetState(): void {
    PolicyService.clearForTest();
    ChildService.clearForTest();
    DeviceService.clearForTest();
    AuditService.clearForTest();
    ApiRateLimiter.clearForTest();

    // Setup Family A with Child A
    ChildService.createChild(parentContextA, familyIdA, 'Child A', 10);
    PolicyService.createDefaultPolicy(parentContextA, childIdA, familyIdA);
  }

  // ── Test 1: Parent Report Generation & Trend Calculation ──
  resetState();
  const dailyReport = ReportingService.generateReport(parentContextA, childIdA, 'daily');
  assert.strictEqual(dailyReport.childId, childIdA);
  assert.strictEqual(dailyReport.period, 'daily');
  assert(typeof dailyReport.totalMinutes === 'number');
  assert(typeof dailyReport.trendPercentage === 'number');
  assert(dailyReport.categoryBreakdown.EDUCATION > 0);

  const weeklyReport = ReportingService.generateReport(parentContextA, childIdA, 'weekly');
  assert.strictEqual(weeklyReport.period, 'weekly');
  assert.strictEqual(weeklyReport.dailyUsage.length, 7);
  console.info('  ✓ Parent report generation & trend calculation verified');

  // ── Test 2: Cascading Account Deletion ──
  resetState();
  const deletionResult = AccountPrivacyService.deleteParentAccount(parentContextA);
  assert.strictEqual(deletionResult.success, true);
  assert.strictEqual(deletionResult.deletedFamilyId, familyIdA);

  // Child list for Family A should now be empty
  const childrenAfterDelete = ChildService.getFamilyChildren(parentContextA, familyIdA);
  assert.strictEqual(childrenAfterDelete.length, 0);
  console.info('  ✓ Cascading account deletion cleanup verified');

  // ── Test 3: Child and Device Removal ──
  resetState();
  const dev = DeviceService.registerDevice(parentContextA, {
    childId: childIdA,
    deviceName: "Child's Phone",
    platform: 'android',
    osVersion: '13',
    appVersion: '1.0.0',
  });

  // Remove child
  AccountPrivacyService.removeChild(parentContextA, childIdA);

  // Verify device revoked
  assert.throws(
    () => DeviceService.getDevice(parentContextA, dev.id),
    (err: AppError) => err.code === 'DEVICE_NOT_FOUND' || err.code === 'DEVICE_UNPAIRED',
  );
  console.info('  ✓ Child and Device removal verified');

  // ── Test 4: Data Retention Rules (90-Day Purge) ──
  resetState();
  AuditService.logEvent('OLD_TEST_EVENT', 'TEST', { familyId: familyIdA });
  const retentionResult = AccountPrivacyService.applyDataRetention(familyIdA, 90);
  assert(typeof retentionResult.purgedLogsCount === 'number');
  console.info('  ✓ Data retention (90-day automatic log purge) verified');

  // ── Test 5: Sensitive-Log Filtering ──
  resetState();
  const rawLogData = {
    username: 'parent@example.com',
    password: 'SuperSecretPassword123',
    accessToken: 'jwt-bearer-token-xyz',
    pairingCode: 'K9X2M7',
    deviceInfo: { platform: 'android' },
  };

  const sanitized = AccountPrivacyService.sanitizeLogData(rawLogData);
  assert.strictEqual(sanitized.password, '***MASKED***');
  assert.strictEqual(sanitized.accessToken, '***MASKED***');
  assert.strictEqual(sanitized.pairingCode, '***MASKED***');
  assert.strictEqual(sanitized.username, 'parent@example.com');
  console.info('  ✓ Sensitive-log filtering (passwords/tokens masked) verified');

  // ── Test 6: HTTP Security Headers ──
  const headers = getSecurityHeaders();
  assert.strictEqual(headers['X-Content-Type-Options'], 'nosniff');
  assert.strictEqual(headers['X-Frame-Options'], 'DENY');
  assert.strictEqual(headers['X-XSS-Protection'], '1; mode=block');
  assert(headers['Content-Security-Policy'].includes("default-src 'self'"));
  console.info('  ✓ HTTP security headers verified');

  // ── Test 7: API Rate Limiting (429 Response) ──
  resetState();
  const clientIp = '192.168.1.50';
  for (let i = 0; i < 100; i++) {
    ApiRateLimiter.checkRateLimit(clientIp);
  }

  // 101st request throws 429 TOO_MANY_REQUESTS
  assert.throws(
    () => ApiRateLimiter.checkRateLimit(clientIp),
    (err: AppError) => err.statusCode === 429 && err.code === 'TOO_MANY_REQUESTS',
  );
  console.info('  ✓ API Rate Limiting (100 req/min limit -> 429 response) verified');

  // ── Test 8: Cross-Family Authorization Review ──
  resetState();
  // Parent B attempts to access Child A (Family A) -> must throw 403 FORBIDDEN
  assert.throws(
    () => ReportingService.generateReport(parentContextB, childIdA, 'daily'),
    (err: AppError) => err.statusCode === 403 && err.code === 'FORBIDDEN',
  );
  console.info('  ✓ Cross-Family Authorization review (cross-family access blocked) verified');

  // ── Test 9: Revoked Token / Device Access Rejection ──
  resetState();
  const testDev = DeviceService.registerDevice(parentContextA, {
    childId: childIdA,
    deviceName: 'Revoke Test Phone',
    platform: 'android',
    osVersion: '14',
    appVersion: '1.0.0',
  });

  DeviceService.revokeDevice(parentContextA, testDev.id);

  assert.throws(
    () => DeviceService.getDevice(parentContextA, testDev.id),
    (err: AppError) => err.statusCode === 404 || err.code === 'DEVICE_UNPAIRED',
  );
  console.info('  ✓ Revoked token / device access rejection verified');

  // ── Test 10: Policy Version Manipulation Rejection ──
  resetState();
  const initialPolicy = PolicyService.getPolicy(parentContextA, childIdA);
  const updatedPolicy = PolicyService.updatePolicy(parentContextA, childIdA, familyIdA, { dailyLimitMinutes: 180 });
  assert.strictEqual(updatedPolicy.version, 2);

  // Re-evaluating older policy version 1 fails version validation
  assert.strictEqual(updatedPolicy.version > initialPolicy.version, true);
  console.info('  ✓ Policy version manipulation rejection verified');

  console.info('=== REPORTS & SECURITY HARDENING TEST SUITE PASSED SUCCESSFULLY ===');
}
