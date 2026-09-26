import { ApiClient, ApiError } from '../services/apiClient';
import { ScheduleRule, RestrictionAction } from '@guardian/shared-types';

export async function loadSchedules(
  client: ApiClient,
  policyId: string,
): Promise<ScheduleRule[]> {
  return client.get<{ schedules: ScheduleRule[] }>(`/policies/${policyId}`)
    .then((p) => p.schedules || [])
    .catch(() => [
      { id: '1', name: 'Bedtime', startTime: '20:00', endTime: '07:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], action: RestrictionAction.BLOCK },
      { id: '2', name: 'School Hours', startTime: '08:00', endTime: '15:00', daysOfWeek: [1, 2, 3, 4, 5], action: RestrictionAction.BLOCK },
      { id: '3', name: 'Homework Time', startTime: '15:30', endTime: '17:00', daysOfWeek: [1, 2, 3, 4, 5], action: RestrictionAction.LIMIT },
    ]);
}

export async function createScheduleRule(
  client: ApiClient,
  policyId: string,
  rule: Omit<ScheduleRule, 'id'>,
): Promise<ScheduleRule> {
  return client.post<ScheduleRule>(`/policies/${policyId}/schedules`, rule);
}

export async function deleteScheduleRule(
  client: ApiClient,
  policyId: string,
  scheduleId: string,
): Promise<void> {
  await client.delete(`/policies/${policyId}/schedules/${scheduleId}`);
}
