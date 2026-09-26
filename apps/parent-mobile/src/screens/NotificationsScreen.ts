import { ApiClient, ApiError } from '../services/apiClient';

export type NotificationType =
  | 'EXTRA_TIME_REQUEST'
  | 'DEVICE_ONLINE'
  | 'DEVICE_OFFLINE'
  | 'POLICY_VIOLATION'
  | 'SCREEN_TIME_LIMIT_APPROACHING'
  | 'SCREEN_TIME_LIMIT_REACHED'
  | 'PAIRING_COMPLETE'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

export const initialNotificationsState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

export async function loadNotifications(
  client: ApiClient,
  limit = 50,
): Promise<AppNotification[]> {
  return client.get<AppNotification[]>(`/notifications?limit=${limit}`);
}

export async function markNotificationRead(
  client: ApiClient,
  notificationId: string,
): Promise<void> {
  await client.post(`/notifications/${notificationId}/read`, {});
}

export async function markAllNotificationsRead(client: ApiClient): Promise<void> {
  await client.post('/notifications/read-all', {});
}

export async function registerPushToken(
  client: ApiClient,
  token: string,
  platform: 'ios' | 'android',
): Promise<void> {
  await client.post('/push-tokens', { token, platform });
}

export function countUnread(notifications: AppNotification[]): number {
  return notifications.filter((n) => !n.readAt).length;
}

export function notificationIcon(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    EXTRA_TIME_REQUEST: '⏱️',
    DEVICE_ONLINE: '📱',
    DEVICE_OFFLINE: '📵',
    POLICY_VIOLATION: '⚠️',
    SCREEN_TIME_LIMIT_APPROACHING: '🔔',
    SCREEN_TIME_LIMIT_REACHED: '🚫',
    PAIRING_COMPLETE: '✅',
    SYSTEM: 'ℹ️',
  };
  return map[type] ?? '🔔';
}

export function handleNotificationsError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Failed to load notifications.';
}
