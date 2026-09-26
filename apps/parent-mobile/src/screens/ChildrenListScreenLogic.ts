import { ApiClient, ApiError } from '../services/apiClient';
import { Child } from '@guardian/shared-types';

export async function loadChildrenList(
  client: ApiClient,
  familyId: string,
): Promise<Child[]> {
  return client.get<Child[]>(`/families/${familyId}/children`);
}

export async function createChild(
  client: ApiClient,
  familyId: string,
  name: string,
  dateOfBirth: string,
): Promise<Child> {
  return client.post<Child>(`/families/${familyId}/children`, { name, dateOfBirth });
}

export async function deleteChild(
  client: ApiClient,
  familyId: string,
  childId: string,
): Promise<void> {
  await client.delete(`/families/${familyId}/children/${childId}`);
}
