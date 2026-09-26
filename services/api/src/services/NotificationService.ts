import { PushNotificationPayload } from '@guardian/shared-types';
import { HashService } from '../auth/hashService';
import { ConsoleLogger } from '@guardian/shared-utils';

const logger = new ConsoleLogger();

export class NotificationService {
  private static deliveredNotifications: PushNotificationPayload[] = [];
  private static sentDeduplicationKeys: Map<string, PushNotificationPayload> = new Map();

  /**
   * Send a push notification with built-in deduplication and offline queuing.
   */
  public static sendPushNotification(
    recipientId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    deduplicationKey?: string,
  ): PushNotificationPayload {
    // 1. Deduplication Check
    if (deduplicationKey && this.sentDeduplicationKeys.has(deduplicationKey)) {
      logger.info(`[NOTIFICATION] Deduplicated notification for key '${deduplicationKey}' (skipped duplicate delivery).`);
      return this.sentDeduplicationKeys.get(deduplicationKey)!;
    }

    const payload: PushNotificationPayload = {
      id: `notif-${HashService.generateRandomToken(8)}`,
      recipientId,
      title,
      body,
      data,
      deduplicationKey,
      sentAt: new Date().toISOString(),
    };

    if (deduplicationKey) {
      this.sentDeduplicationKeys.set(deduplicationKey, payload);
    }

    this.deliveredNotifications.push(payload);
    logger.info(`[NOTIFICATION] Sent to ${recipientId}: "${title}" - ${body}`);

    return payload;
  }

  /**
   * Retrieve queued notifications for a recipient (e.g. offline parent/child sync).
   */
  public static getNotificationsForRecipient(recipientId: string): PushNotificationPayload[] {
    return this.deliveredNotifications.filter((n) => n.recipientId === recipientId);
  }

  /**
   * Clear in-memory notification state for test isolation.
   */
  public static clearForTest(): void {
    this.deliveredNotifications = [];
    this.sentDeduplicationKeys.clear();
  }
}
