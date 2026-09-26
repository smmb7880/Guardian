import { ApiClient, ApiError } from '../services/apiClient';
import { ScreenTimeUsageResponse } from './DashboardScreen';

export interface WeeklyUsageEntry {
  date: string;
  totalMinutes: number;
  dailyLimitMinutes: number | null;
}

export interface ScreenTimeState {
  dailyUsage: ScreenTimeUsageResponse | null;
  weeklyUsage: WeeklyUsageEntry[];
  selectedDate: string;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

export const initialScreenTimeState: ScreenTimeState = {
  dailyUsage: null,
  weeklyUsage: [],
  selectedDate: new Date().toISOString().split('T')[0],
  isLoading: false,
  isSaving: false,
  error: null,
};

export async function loadScreenTime(
  client: ApiClient,
  childId: string,
  date: string,
): Promise<ScreenTimeUsageResponse> {
  return client.get<ScreenTimeUsageResponse>(`/children/${childId}/screen-time?date=${date}`);
}

export async function loadWeeklyScreenTime(
  client: ApiClient,
  childId: string,
  startDate: string,
): Promise<WeeklyUsageEntry[]> {
  return client.get<WeeklyUsageEntry[]>(`/children/${childId}/screen-time/weekly?start=${startDate}`);
}

export async function updateDailyLimit(
  client: ApiClient,
  childId: string,
  policyId: string,
  dailyLimitMinutes: number | null,
): Promise<void> {
  await client.patch(`/policies/${policyId}`, { dailyLimitMinutes });
}

export function getWeekStartDate(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function buildWeekDates(startDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export function handleScreenTimeError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Failed to load screen time data.';
}
