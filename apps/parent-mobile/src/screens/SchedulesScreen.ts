import { ApiClient, ApiError } from '../services/apiClient';
import { Schedule, SchedulePeriod } from '@guardian/shared-types';

export type ScheduleMode = 'SCHOOL' | 'HOMEWORK' | 'BEDTIME' | 'FREE' | 'CUSTOM';

export interface ScheduleFormState {
  mode: ScheduleMode;
  label: string;
  startTime: string; // HH:MM 24h
  endTime: string;   // HH:MM 24h
  daysOfWeek: number[]; // 0=Sunday, 6=Saturday
  isActive: boolean;
}

export const defaultScheduleTemplates: Record<ScheduleMode, Partial<ScheduleFormState>> = {
  SCHOOL: {
    label: 'School',
    startTime: '08:00',
    endTime: '15:00',
    daysOfWeek: [1, 2, 3, 4, 5],
    isActive: true,
  },
  HOMEWORK: {
    label: 'Homework',
    startTime: '15:30',
    endTime: '17:00',
    daysOfWeek: [1, 2, 3, 4, 5],
    isActive: true,
  },
  BEDTIME: {
    label: 'Bedtime',
    startTime: '20:00',
    endTime: '07:00',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    isActive: true,
  },
  FREE: { label: 'Free Time', daysOfWeek: [], isActive: true },
  CUSTOM: { label: '', daysOfWeek: [], isActive: true },
};

export async function loadSchedules(
  client: ApiClient,
  policyId: string,
): Promise<SchedulePeriod[]> {
  const policy = await client.get<{ schedules: SchedulePeriod[] }>(`/policies/${policyId}`);
  return policy.schedules ?? [];
}

export async function createSchedulePeriod(
  client: ApiClient,
  policyId: string,
  form: ScheduleFormState,
): Promise<SchedulePeriod> {
  return client.post<SchedulePeriod>(`/policies/${policyId}/schedules`, {
    label: form.label,
    mode: form.mode,
    startTime: form.startTime,
    endTime: form.endTime,
    daysOfWeek: form.daysOfWeek,
    isActive: form.isActive,
  });
}

export async function updateSchedulePeriod(
  client: ApiClient,
  policyId: string,
  scheduleId: string,
  updates: Partial<ScheduleFormState>,
): Promise<SchedulePeriod> {
  return client.patch<SchedulePeriod>(`/policies/${policyId}/schedules/${scheduleId}`, updates);
}

export async function deleteSchedulePeriod(
  client: ApiClient,
  policyId: string,
  scheduleId: string,
): Promise<void> {
  await client.delete(`/policies/${policyId}/schedules/${scheduleId}`);
}

export function validateScheduleForm(form: ScheduleFormState): string | null {
  if (!form.label.trim()) return 'Schedule name is required';
  if (!form.startTime) return 'Start time is required';
  if (!form.endTime) return 'End time is required';
  if (form.daysOfWeek.length === 0) return 'Select at least one day';
  return null;
}

export function dayLabel(dayIndex: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex];
}

export function handleSchedulesError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Failed to manage schedules.';
}
