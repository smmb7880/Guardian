import { ApiClient, ApiError } from '../services/apiClient';
import { ExtraTimeRequest, FamilyAction } from '../context/FamilyContext';

export interface ExtraTimeResponse {
  id: string;
  childId: string;
  childName: string;
  requestedMinutes: number;
  reason?: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export async function loadExtraTimeRequests(
  client: ApiClient,
  familyId: string,
  status?: 'PENDING' | 'APPROVED' | 'REJECTED',
): Promise<ExtraTimeRequest[]> {
  const query = status ? `?status=${status}` : '';
  const items = await client.get<ExtraTimeResponse[]>(`/families/${familyId}/extra-time-requests${query}`);
  return items.map((r) => ({
    id: r.id,
    childId: r.childId,
    childName: r.childName,
    requestedMinutes: r.requestedMinutes,
    reason: r.reason,
    requestedAt: r.requestedAt,
    status: r.status,
  }));
}

export async function approveRequest(
  client: ApiClient,
  requestId: string,
  grantedMinutes?: number,
): Promise<void> {
  await client.post(`/extra-time-requests/${requestId}/approve`, {
    grantedMinutes,
  });
}

export async function rejectRequest(
  client: ApiClient,
  requestId: string,
  reason?: string,
): Promise<void> {
  await client.post(`/extra-time-requests/${requestId}/reject`, { reason });
}

export function formatRequestTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function handleExtraTimeError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Failed to process extra time request.';
}
