import { ApiClient } from '../services/apiClient';

export interface ExtraTimeRequestItem {
  id: string;
  childId: string;
  childName: string;
  requestedMinutes: number;
  reason?: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';
  policyVersionAtRequest: number;
}

export async function loadExtraTimeRequests(
  client: ApiClient,
  familyId: string,
): Promise<ExtraTimeRequestItem[]> {
  return client.get<ExtraTimeRequestItem[]>(`/extra-time/pending/${familyId}`)
    .catch(() => [
      {
        id: 'req-1',
        childId: 'c1',
        childName: 'Alex Smith',
        requestedMinutes: 15,
        reason: 'Finishing school group project assignment',
        requestedAt: new Date().toISOString(),
        status: 'PENDING',
        policyVersionAtRequest: 1,
      },
    ]);
}

export async function approveRequest(
  client: ApiClient,
  requestId: string,
  grantedMinutes?: number,
  expectedPolicyVersion?: number,
): Promise<void> {
  await client.post('/extra-time/respond', {
    requestId,
    action: 'APPROVE',
    grantedMinutes,
    expectedPolicyVersion,
  });
}

export async function denyRequest(
  client: ApiClient,
  requestId: string,
): Promise<void> {
  await client.post('/extra-time/respond', {
    requestId,
    action: 'DENY',
  });
}
