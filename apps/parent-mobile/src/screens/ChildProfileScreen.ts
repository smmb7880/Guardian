import { ApiClient, ApiError } from '../services/apiClient';
import { Child, Device } from '@guardian/shared-types';
import { FamilyAction } from '../context/FamilyContext';

export interface ChildProfileData {
  child: Child;
  devices: Device[];
}

export interface UpdateChildRequest {
  name: string;
  dateOfBirth: string;
}

export async function loadChildProfile(
  client: ApiClient,
  familyId: string,
  childId: string,
): Promise<ChildProfileData> {
  const [child, devices] = await Promise.all([
    client.get<Child>(`/families/${familyId}/children/${childId}`),
    client.get<Device[]>(`/children/${childId}/devices`),
  ]);
  return { child, devices };
}

export async function updateChildProfile(
  client: ApiClient,
  familyId: string,
  childId: string,
  updates: UpdateChildRequest,
): Promise<Child> {
  return client.put<Child>(`/families/${familyId}/children/${childId}`, updates);
}

export async function unpairDevice(
  client: ApiClient,
  deviceId: string,
): Promise<void> {
  await client.delete(`/devices/${deviceId}`);
}

export async function revokeDevice(
  client: ApiClient,
  deviceId: string,
): Promise<void> {
  await client.post(`/devices/${deviceId}/revoke`, {});
}

export function handleChildProfileError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Failed to load child profile. Please try again.';
}
