import { handleCreateFamily, handleGetFamily, handleInviteParent } from '@guardian/api-service/dist/routes/families';
import { handleCreateChild, handleGetChildren, handleUpdateChild, handleDeleteChild } from '@guardian/api-service/dist/routes/children';
import { handlePairDevice, handleListChildDevices, handleListFamilyDevices } from '@guardian/api-service/dist/routes/devices';
import { FamilyService } from '@guardian/api-service/dist/services/familyService';
import { ChildService } from '@guardian/api-service/dist/services/childService';
import { DeviceService } from '@guardian/api-service/dist/services/deviceService';
import { AuditService } from '@guardian/api-service/dist/services/auditService';
import { UserRole, DevicePlatform } from '@guardian/shared-types';
import { AppError } from '@guardian/api-service/dist/middleware/errorHandler';

export function runFamilyChildTestSuite(): boolean {
  console.info('[Test Suite] Starting Phase 4 Family & Child Management Tests...');

  FamilyService.clearForTest();
  ChildService.clearForTest();
  DeviceService.clearForTest();
  AuditService.clearForTest();

  // Setup Contexts for Parent A (Family A) and Parent B (Family B)
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

  const childContext = {
    userId: 'user-child-x',
    email: 'childX@guardian.local',
    role: UserRole.CHILD,
    familyId: undefined as string | undefined,
  };

  // Test 1: Family Creation & Member Addition
  console.info(' - Test 1: Family Creation & Member Addition');
  const famARes = handleCreateFamily(parentAContext, { name: 'Family Alpha' });
  const famA = famARes.data!.family;
  parentAContext.familyId = famA.id;

  const famBRes = handleCreateFamily(parentBContext, { name: 'Family Beta' });
  const famB = famBRes.data!.family;
  parentBContext.familyId = famB.id;

  // Invite parent to Family A
  const inviteRes = handleInviteParent(parentAContext, famA.id, {
    email: 'parentA2@guardian.local',
    userId: 'user-parent-a2',
  });
  if (!inviteRes.success || inviteRes.data?.userId !== 'user-parent-a2') {
    throw new Error('Parent invitation failed.');
  }

  // Test 2: Child CRUD Operations
  console.info(' - Test 2: Child CRUD Operations');
  const childARes = handleCreateChild(parentAContext, {
    familyId: famA.id,
    name: 'Charlie Alpha',
    age: 10,
  });
  const childA = childARes.data!;

  const childBRes = handleCreateChild(parentBContext, {
    familyId: famB.id,
    name: 'Chloe Beta',
    age: 8,
  });
  const childB = childBRes.data!;

  // List children for Family A
  const listARes = handleGetChildren(parentAContext, famA.id);
  if (!listARes.success || listARes.data?.length !== 1) {
    throw new Error('Child listing for Family A failed.');
  }

  // Update Child Alpha
  const updateARes = handleUpdateChild(parentAContext, childA.id, { age: 11 });
  if (!updateARes.success || updateARes.data?.age !== 11) {
    throw new Error('Child update failed.');
  }

  // Test 3: Device Registration & Listing
  console.info(' - Test 3: Device Registration & Listing');
  const devARes = handlePairDevice(parentAContext, {
    childId: childA.id,
    familyId: famA.id,
    name: "Charlie's Android Phone",
    platform: DevicePlatform.ANDROID,
    platformDeviceId: 'android-id-alpha-001',
  });
  if (!devARes.success || !devARes.data?.isPaired) {
    throw new Error('Device pairing failed.');
  }

  const childDevs = handleListChildDevices(parentAContext, childA.id);
  if (!childDevs.success || childDevs.data?.length !== 1) {
    throw new Error('Child device listing failed.');
  }

  const familyDevs = handleListFamilyDevices(parentAContext, famA.id);
  if (!familyDevs.success || familyDevs.data?.length !== 1) {
    throw new Error('Family device listing failed.');
  }

  // Test 4: Cross-Family Access Prevention
  console.info(' - Test 4: Cross-Family Access Prevention');
  try {
    handleGetFamily(parentAContext, famB.id);
    throw new Error('Parent A should not be able to retrieve Family B.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'FORBIDDEN_FAMILY_ACCESS') {
      throw new Error(`Expected FORBIDDEN_FAMILY_ACCESS, got ${err}`);
    }
  }

  try {
    handleGetChildren(parentAContext, famB.id);
    throw new Error('Parent A should not be able to list Children of Family B.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'FORBIDDEN_FAMILY_ACCESS') {
      throw new Error(`Expected FORBIDDEN_FAMILY_ACCESS, got ${err}`);
    }
  }

  // Test 5: Unrelated Child Deletion Prevention
  console.info(' - Test 5: Unrelated Child Deletion Prevention');
  try {
    handleDeleteChild(parentAContext, childB.id);
    throw new Error('Parent A should not be able to delete Child of Family B.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'FORBIDDEN_FAMILY_ACCESS') {
      throw new Error(`Expected FORBIDDEN_FAMILY_ACCESS, got ${err}`);
    }
  }

  // Test 6: Unauthorized Parent Operations
  console.info(' - Test 6: Unauthorized Parent Operations (Child Role Block)');
  childContext.familyId = famA.id;
  try {
    handleCreateChild(childContext, { familyId: famA.id, name: 'Illegal Child' });
    throw new Error('Child role should not be allowed to create a child profile.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'FORBIDDEN') {
      throw new Error(`Expected FORBIDDEN error, got ${err}`);
    }
  }

  // Test 7: Cascade Deletion & Audit Trail Verification
  console.info(' - Test 7: Cascade Deletion & Audit Trail Verification');
  handleDeleteChild(parentAContext, childA.id);
  const remainingChildren = handleGetChildren(parentAContext, famA.id);
  if (remainingChildren.data?.length !== 0) {
    throw new Error('Child profile was not removed after deletion.');
  }

  const auditLogs = AuditService.getFamilyAuditLogs(famA.id);
  if (auditLogs.length < 4) {
    throw new Error('Expected at least 4 audit log entries for Family A.');
  }

  console.info('[Test Suite] All Phase 4 Family & Child Management Tests PASSED SUCCESSFULLY!');
  return true;
}
