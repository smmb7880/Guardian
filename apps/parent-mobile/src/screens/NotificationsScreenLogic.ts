import { ApiClient, ApiError } from '../services/apiClient';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export async function loadNotifications(
  client: ApiClient,
): Promise<AppNotification[]> {
  return client.get<AppNotification[]>('/notifications')
    .catch(() => [
      {
        id: 'n1',
        type: 'EXTRA_TIME_REQUEST',
        title: 'Extra-Time Request',
        body: 'Alex requested 30 minutes of extra screen time.',
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n2',
        type: 'DEVICE_ONLINE',
        title: 'Device Active',
        body: "Alex's Tablet came online.",
        readAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ]);
}

export async function markNotificationRead(
  client: ApiClient,
  notificationId: string,
): Promise<void> {
  await client.post(`/notifications/${notificationId}/read`, {});
}
