export type ExtraTimeStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';

export interface ExtraTimeRequest {
  id: string;
  childId: string;
  familyId: string;
  requestedMinutes: number;
  reason?: string;
  status: ExtraTimeStatus;
  policyVersionAtRequest: number;
  idempotencyKey?: string;
  createdAt: string; // ISO string
  expiresAt: string; // ISO string
  respondedAt?: string; // ISO string
  respondedBy?: string; // parent userId
  grantedMinutes?: number;
}

export interface PushNotificationPayload {
  id: string;
  recipientId: string; // userId or deviceId
  title: string;
  body: string;
  data?: Record<string, unknown>;
  deduplicationKey?: string;
  sentAt: string; // ISO string
}
