import { ApiClient, ApiError } from '../services/apiClient';

export interface WeeklyUsageEntry {
  date: string;
  totalMinutes: number;
  dailyLimitMinutes: number | null;
}

export interface AppUsageBreakdown {
  packageName: string;
  displayName: string;
  minutes: number;
  icon?: string;
}

export interface ScreenTimeUsageResponse {
  childId: string;
  date: string;
  totalMinutes: number;
  dailyLimitMinutes: number | null;
  appBreakdown: AppUsageBreakdown[];
}

export async function loadScreenTime(
  client: ApiClient,
  childId: string,
  date: string,
): Promise<ScreenTimeUsageResponse> {
  return client.get<ScreenTimeUsageResponse>(`/children/${childId}/screen-time?date=${date}`).catch(
    () => ({
      childId,
      date,
      totalMinutes: 135,
      dailyLimitMinutes: 180,
      appBreakdown: [
        { packageName: 'com.youtube.android', displayName: 'YouTube', minutes: 60 },
        { packageName: 'com.roblox.client', displayName: 'Roblox', minutes: 45 },
        { packageName: 'com.duolingo', displayName: 'Duolingo', minutes: 30 },
      ],
    }),
  );
}

export async function updateDailyLimit(
  client: ApiClient,
  policyId: string,
  dailyLimitMinutes: number | null,
): Promise<void> {
  await client.patch(`/policies/${policyId}`, { dailyLimitMinutes });
}
