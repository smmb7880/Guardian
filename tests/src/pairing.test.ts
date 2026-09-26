import {
  handleGeneratePairingCode,
  handlePairDeviceWithCode,
  handleUnpairDevice,
  handleRevokeDevice,
} from '@guardian/api-service/dist/routes/devices';
import { handleCreateFamily } from '@guardian/api-service/dist/routes/families';
import { handleCreateChild } from '@guardian/api-service/dist/routes/children';
import { FamilyService } from '@guardian/api-service/dist/services/familyService';
import { ChildService } from '@guardian/api-service/dist/services/childService';
import { DeviceService } from '@guardian/api-service/dist/services/deviceService';
import { PairingService } from '@guardian/api-service/dist/services/pairingService';
import { AuditService } from '@guardian/api-service/dist/services/auditService';
import { UserRole, DevicePlatform } from '@guardian/shared-types';
import { AppError } from '@guardian/api-service/dist/middleware/errorHandler';

export function runPairingTestSuite(): boolean {
  console.info('[Test Suite] Starting Phase 5 Secure Device Pairing Tests...');

  FamilyService.clearForTest();
  ChildService.clearForTest();
  DeviceService.clearForTest();
  PairingService.clearForTest();
  AuditService.clearForTest();

  // Setup Parent A & Family A & Child A
  const parentAContext = {
    userId: 'user-parent-a',
    email: 'parentA@guardian.local',
    role: UserRole.PARENT,
    familyId: undefined as string | undefined,
  };
  const parentBContext = {
    userId: 'user-parent-b',
    email: 'parentB@guardian.local',
    role: UserRole.PARENT,
    familyId: undefined as string | undefined,
  };

  const famA = handleCreateFamily(parentAContext, { name: 'Alpha Family' }).data!.family;
  parentAContext.familyId = famA.id;

  const famB = handleCreateFamily(parentBContext, { name: 'Beta Family' }).data!.family;
  parentBContext.familyId = famB.id;

  const childA = handleCreateChild(parentAContext, { familyId: famA.id, name: 'Alex Alpha', age: 10 }).data!;

  // Test 1: Valid Pairing
  console.info(' - Test 1: Valid Pairing Flow');
  const codeRec = handleGeneratePairingCode(parentAContext, { childId: childA.id, familyId: famA.id }).data!;
  if (!codeRec.code || codeRec.code.length !== 6 || !codeRec.qrPayload) {
    throw new Error('Pairing code generation failed.');
  }

  const pairRes = handlePairDeviceWithCode({
    pairingCode: codeRec.code,
    name: "Alex's Tablet",
    platform: DevicePlatform.ANDROID,
    platformDeviceId: 'tablet-platform-id-001',
  });
  if (!pairRes.success || !pairRes.data?.deviceToken || pairRes.data?.childId !== childA.id) {
    throw new Error('Device pairing with valid code failed.');
  }
  const pairedDevice = pairRes.data.device;

  // Test 2: Reused Pairing Code Rejection (Single-use & Replay Protection)
  console.info(' - Test 2: Reused Pairing Code Rejection (Single-Use)');
  try {
    handlePairDeviceWithCode({
      pairingCode: codeRec.code,
      name: "Alex's Phone",
      platform: DevicePlatform.ANDROID,
      platformDeviceId: 'phone-platform-id-002',
    });
    throw new Error('Reusing single-use pairing code should have failed.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'PAIRING_CODE_ALREADY_USED') {
      throw new Error(`Expected PAIRING_CODE_ALREADY_USED, got ${err}`);
    }
  }

  // Test 3: Expired Pairing Code Rejection
  console.info(' - Test 3: Expired Pairing Code Rejection');
  const expiredCodeRec = PairingService.createPairingCode(parentAContext, childA.id, famA.id, -10); // expired 10 seconds ago
  try {
    handlePairDeviceWithCode({
      pairingCode: expiredCodeRec.code,
      name: "Alex's Laptop",
      platform: DevicePlatform.IOS,
      platformDeviceId: 'ios-device-id-003',
    });
    throw new Error('Expired pairing code should have failed.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'PAIRING_CODE_EXPIRED') {
      throw new Error(`Expected PAIRING_CODE_EXPIRED, got ${err}`);
    }
  }

  // Test 4: Invalid Pairing Code Rejection
  console.info(' - Test 4: Invalid Pairing Code Rejection');
  try {
    handlePairDeviceWithCode({
      pairingCode: 'INVALID',
      name: 'Unknown Device',
      platform: DevicePlatform.ANDROID,
      platformDeviceId: 'unknown-id-000',
    });
    throw new Error('Invalid pairing code should have failed.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'INVALID_PAIRING_CODE') {
      throw new Error(`Expected INVALID_PAIRING_CODE, got ${err}`);
    }
  }

  // Test 5: Wrong Family Access Rejection
  console.info(' - Test 5: Wrong Family Access Rejection');
  try {
    handleGeneratePairingCode(parentBContext, { childId: childA.id, familyId: famA.id });
    throw new Error('Parent B should not be able to generate pairing code for Parent A child.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'FORBIDDEN_FAMILY_ACCESS') {
      throw new Error(`Expected FORBIDDEN_FAMILY_ACCESS, got ${err}`);
    }
  }

  // Test 6: Revoked Device & Session Invalidation
  console.info(' - Test 6: Revoked Device & Session Invalidation');
  handleRevokeDevice(parentAContext, { deviceId: pairedDevice.id });
  if (!DeviceService.isDeviceRevoked(pairedDevice.id)) {
    throw new Error('Device was not marked revoked.');
  }

  // Test 7: Duplicate Device Registration Handling
  console.info(' - Test 7: Duplicate Device Registration Handling');
  const codeRec2 = handleGeneratePairingCode(parentAContext, { childId: childA.id, familyId: famA.id }).data!;
  const pairRes2 = handlePairDeviceWithCode({
    pairingCode: codeRec2.code,
    name: "Alex's Tablet Re-paired",
    platform: DevicePlatform.ANDROID,
    platformDeviceId: 'tablet-platform-id-001',
  });
  if (pairRes2.data!.device.id !== pairedDevice.id) {
    throw new Error('Re-registering same platformDeviceId should retain device identity.');
  }

  // Test 8: Unauthorized Unpair Attempt Rejection
  console.info(' - Test 8: Unauthorized Unpair Attempt Rejection');
  try {
    handleUnpairDevice(parentBContext, { deviceId: pairedDevice.id });
    throw new Error('Parent B unpairing Parent A device should have failed.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'FORBIDDEN_FAMILY_ACCESS') {
      throw new Error(`Expected FORBIDDEN_FAMILY_ACCESS, got ${err}`);
    }
  }

  // Test 9: Replay Attempts Security Event Recording
  console.info(' - Test 9: Replay Security Audit Trail');
  const audits = AuditService.getFamilyAuditLogs(famA.id);
  const replayAudits = audits.filter((a) => a.action === 'PAIRING_REPLAY_ATTEMPT');
  if (replayAudits.length < 1) {
    throw new Error('Expected PAIRING_REPLAY_ATTEMPT audit event to be logged.');
  }

  console.info('[Test Suite] All Phase 5 Secure Device Pairing Tests PASSED SUCCESSFULLY!');
  return true;
}
