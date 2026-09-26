import { ApiClient, ApiError } from '../services/apiClient';
import { Child, Device } from '@guardian/shared-types';
import { ChildDashboardState, ExtraTimeRequest, FamilyAction } from '../context/FamilyContext';

export interface ScreenTimeUsageResponse {
  childId: string;
  date: string;
  totalMinutes: number;
  dailyLimitMinutes: number | null;
  appBreakdown: Array<{ packageName: string; displayName: string; minutes: number }>;
}

export interface CurrentScheduleResponse {
  activePeriod: string | null;
  nextPeriod: string | null;
  nextPeriodStartsAt: string | null;
}

export async function loadDashboard(
  client: ApiClient,
  familyId: string,
  childId: string,
  dispatch: (action: FamilyAction) => void,
): Promise<void> {
  dispatch({ type: 'SET_LOADING', loading: true });
  dispatch({ type: 'SET_ERROR', error: null });

  const today = new Date().toISOString().split('T')[0];

  const [child, devices, usage, schedule, requests] = await Promise.all([
    client.get<Child>(`/families/${familyId}/children/${childId}`),
    client.get<Device[]>(`/children/${childId}/devices`).catch(() => []),
    client.get<ScreenTimeUsageResponse>(`/children/${childId}/screen-time?date=${today}`).catch(
      () => ({ childId, date: today, totalMinutes: 0, dailyLimitMinutes: null, appBreakdown: [] }),
    ),
    client.get<CurrentScheduleResponse>(`/children/${childId}/schedule/current`).catch(
      () => ({ activePeriod: null, nextPeriod: null, nextPeriodStartsAt: null }),
    ),
    client.get<ExtraTimeRequest[]>(`/children/${childId}/extra-time-requests?status=PENDING`).catch(
      () => [],
    ),
  ]);

  const isOnline = devices.some((d) => d.isPaired);

  const data: ChildDashboardState = {
    child,
    policy: null,
    devices,
    todayUsageMinutes: usage.totalMinutes,
    isOnline,
    currentSchedule: schedule.activePeriod,
    nextScheduleTransition: schedule.nextPeriodStartsAt,
    pendingRequests: requests,
  };

  dispatch({ type: 'SET_DASHBOARD', data });
  dispatch({ type: 'SET_LOADING', loading: false });
}

export function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function screenTimePercent(used: number, limit: number | null): number {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function formatNextTransition(isoString: string | null): string {
  if (!isoString) return 'No upcoming change';
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins <= 0) return 'Starting now';
  if (diffMins < 60) return `In ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  return `In ${diffHours}h`;
}
