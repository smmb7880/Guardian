import { handleRegister, handleLogin } from '@guardian/api-service/dist/routes/auth';
import { handleCreateFamily } from '@guardian/api-service/dist/routes/families';
import { handleCreateChild } from '@guardian/api-service/dist/routes/children';
import { handlePairDevice } from '@guardian/api-service/dist/routes/devices';
import { UserRole, DevicePlatform } from '@guardian/shared-types';

export function runRoutesFoundationTest(): boolean {
  console.info('[Test] Running Routes Foundation Test...');

  // Auth test
  const regRes = handleRegister({
    email: 'parent@guardian.local',
    password: 'SecurePassword123!',
    fullName: 'Jane Parent',
  });
  if (!regRes.success || !regRes.data?.id) {
    throw new Error('Auth handleRegister failed');
  }

  const loginRes = handleLogin({
    email: 'parent@guardian.local',
    password: 'SecurePassword123!',
  });
  if (!loginRes.success || !loginRes.data?.accessToken) {
    throw new Error('Auth handleLogin failed');
  }

  const parentContext = {
    userId: regRes.data.id,
    email: 'parent@guardian.local',
    role: UserRole.PARENT,
    familyId: 'family-100',
  };

  // Family test
  const famRes = handleCreateFamily(parentContext, { name: 'The Guardians' });
  if (!famRes.success || famRes.data?.name !== 'The Guardians') {
    throw new Error('Family handleCreateFamily failed');
  }

  // Child test
  const childRes = handleCreateChild(parentContext, {
    familyId: 'family-100',
    name: 'Alex',
    age: 12,
  });
  if (!childRes.success || childRes.data?.name !== 'Alex') {
    throw new Error('Child handleCreateChild failed');
  }

  // Device test
  const devRes = handlePairDevice(parentContext, {
    childId: childRes.data.id,
    familyId: 'family-100',
    name: "Alex's Phone",
    platform: DevicePlatform.ANDROID,
    platformDeviceId: 'android-device-unique-id-999',
  });
  if (!devRes.success || !devRes.data?.isPaired) {
    throw new Error('Device handlePairDevice failed');
  }

  console.info('[Test] Routes Foundation Test PASSED.');
  return true;
}
