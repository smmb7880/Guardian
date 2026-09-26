import { runHealthCheckTest } from './health.test';
import { runValidationTest } from './validation.test';
import { runDbSchemaTest } from './db_schema.test';
import { runRoutesFoundationTest } from './routes.test';
import { runAuthTestSuite } from './auth.test';
import { runFamilyChildTestSuite } from './family_child.test';
import { runPairingTestSuite } from './pairing.test';
import { runPolicyTestSuite } from './policy.test';
import { runParentMobileTestSuite } from './parent_mobile.test';
import { runAndroidChildTestSuite } from './android_child.test';
import { runIOSChildTestSuite } from './ios_child.test';
import { runScheduleEngineTestSuite } from './schedule_engine.test';
import { runScreenTimeEngineTestSuite } from './screen_time_engine.test';
import { runExtraTimeNotificationsTestSuite } from './extra_time_notifications.test';
import { runOfflineSyncTestSuite } from './offline_sync.test';
import { runReportsSecurityTestSuite } from './reports_security.test';
import { runFullQaAuditTestSuite } from './qa_full_audit.test';
import { runE2eMvpFlowTestSuite } from './e2e_mvp_flow.test';
import { runFourWayMatrixTestSuite } from './four_way_matrix.test';

console.info('=== GUARDIAN MASTER SUITE: PHASES 1 - 16 CROSS-PLATFORM MVP VERIFICATION ===');
try {
  runHealthCheckTest();
  runValidationTest();
  runDbSchemaTest();
  runRoutesFoundationTest();
  runAuthTestSuite();
  runFamilyChildTestSuite();
  runPairingTestSuite();
  runPolicyTestSuite();
  runParentMobileTestSuite();
  runAndroidChildTestSuite();
  runIOSChildTestSuite();
  runScheduleEngineTestSuite();
  runScreenTimeEngineTestSuite();
  runExtraTimeNotificationsTestSuite();
  runOfflineSyncTestSuite();
  runReportsSecurityTestSuite();
  runFullQaAuditTestSuite();
  runE2eMvpFlowTestSuite();
  runFourWayMatrixTestSuite();
  console.info('=== ALL PHASES 1 - 16 TESTS PASSED SUCCESSFULLY (CROSS-PLATFORM MVP VERIFIED) ===');
} catch (err) {
  console.error('Test Suite Failed:', err);
  process.exit(1);
}
