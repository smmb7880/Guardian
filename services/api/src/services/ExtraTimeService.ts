import { ExtraTimeRequest, ExtraTimeStatus, UserRole } from '@guardian/shared-types';
import { HashService } from '../auth/hashService';
import { AppError } from '../middleware/errorHandler';
import { verifyUserRole, verifyFamilyOwnership, RequestUserContext } from '../middleware/authMiddleware';
import { PolicyService } from './policyService';
import { NotificationService } from './NotificationService';
import { AuditService } from './auditService';

export class ExtraTimeService {
  private static requests: Map<string, ExtraTimeRequest> = new Map(); // requestId -> ExtraTimeRequest
  private static requestTTLMinutes = 15; // Unanswered requests expire after 15 minutes

  /**
   * Child creates an extra-time request.
   */
  public static createRequest(
    context: RequestUserContext,
    childId: string,
    familyId: string,
    requestedMinutes: number,
    reason?: string,
    idempotencyKey?: string,
  ): ExtraTimeRequest {
    verifyFamilyOwnership(context, familyId);

    if (requestedMinutes <= 0 || requestedMinutes > 240) {
      throw new AppError(400, 'INVALID_REQUESTED_MINUTES', 'Requested extra-time minutes must be between 1 and 240 minutes.');
    }

    const now = new Date();

    // 1. Duplicate Request Protection
    const existingRequests = Array.from(this.requests.values()).filter((r) => r.childId === childId);

    for (const req of existingRequests) {
      // Auto-expire stale pending requests
      if (req.status === 'PENDING' && new Date(req.expiresAt).getTime() <= now.getTime()) {
        req.status = 'EXPIRED';
      }

      if (req.status === 'PENDING') {
        if (idempotencyKey && req.idempotencyKey === idempotencyKey) {
          return req; // Return identical idempotent request
        }
        throw new AppError(409, 'DUPLICATE_REQUEST', 'An active extra-time request is already pending for this child.');
      }
    }

    // Fetch current child policy to record version
    const policy = PolicyService.getPolicy(context, childId);
    const expiresAt = new Date(now.getTime() + this.requestTTLMinutes * 60000).toISOString();

    const request: ExtraTimeRequest = {
      id: `req-${HashService.generateRandomToken(8)}`,
      childId,
      familyId,
      requestedMinutes,
      reason,
      status: 'PENDING',
      policyVersionAtRequest: policy.version,
      idempotencyKey,
      createdAt: now.toISOString(),
      expiresAt,
    };

    this.requests.set(request.id, request);

    // Send push notification to parent
    const dedupeKey = `notif-extra-time-${request.id}`;
    NotificationService.sendPushNotification(
      familyId,
      'Extra-Time Requested',
      `Child requested ${requestedMinutes} extra minutes.`,
      { requestId: request.id, childId, requestedMinutes },
      dedupeKey,
    );

    // Audit log
    AuditService.logEvent('EXTRA_TIME_REQUESTED', 'EXTRA_TIME_REQUEST', {
      familyId,
      actorId: context.userId,
      entityId: request.id,
      details: { childId, requestedMinutes, reason, policyVersion: policy.version },
    });

    return request;
  }

  /**
   * Get pending extra-time requests for a family (auto-prunes expired requests).
   */
  public static getPendingRequests(context: RequestUserContext, familyId: string): ExtraTimeRequest[] {
    verifyFamilyOwnership(context, familyId);

    const now = new Date();
    const result: ExtraTimeRequest[] = [];

    for (const req of this.requests.values()) {
      if (req.familyId === familyId) {
        if (req.status === 'PENDING' && new Date(req.expiresAt).getTime() <= now.getTime()) {
          req.status = 'EXPIRED';
        }
        if (req.status === 'PENDING') {
          result.push(req);
        }
      }
    }

    return result;
  }

  /**
   * Parent responds to an extra-time request (APPROVE or DENY).
   */
  public static respondToRequest(
    context: RequestUserContext,
    requestId: string,
    action: 'APPROVE' | 'DENY',
    grantedMinutes?: number,
    expectedPolicyVersion?: number,
  ): { request: ExtraTimeRequest; updatedPolicyVersion?: number } {
    verifyUserRole(context, [UserRole.PARENT]);

    const request = this.requests.get(requestId);
    if (!request) {
      throw new AppError(404, 'REQUEST_NOT_FOUND', 'Requested extra-time request does not exist.');
    }

    verifyFamilyOwnership(context, request.familyId);

    const now = new Date();

    // 1. Expiration check
    if (new Date(request.expiresAt).getTime() <= now.getTime()) {
      request.status = 'EXPIRED';
      throw new AppError(400, 'REQUEST_EXPIRED', 'This extra-time request has expired.');
    }

    // 2. Stale request check
    if (request.status !== 'PENDING') {
      throw new AppError(400, 'STALE_REQUEST', `Request has already been processed with status: ${request.status}`);
    }

    // 3. Policy version conflict check
    const currentPolicy = PolicyService.getPolicy(context, request.childId);
    if (expectedPolicyVersion !== undefined && expectedPolicyVersion !== currentPolicy.version) {
      throw new AppError(409, 'POLICY_VERSION_CONFLICT', `Policy version conflict: expected version ${expectedPolicyVersion}, current policy version is ${currentPolicy.version}`);
    }

    request.respondedAt = now.toISOString();
    request.respondedBy = context.userId;

    if (action === 'DENY') {
      request.status = 'DENIED';

      // Send notification to child
      NotificationService.sendPushNotification(
        request.childId,
        'Extra-Time Request Denied',
        'Your parent has denied your request for extra screen time.',
        { requestId: request.id, status: 'DENIED' },
        `notif-deny-${request.id}`,
      );

      // Audit log
      AuditService.logEvent('EXTRA_TIME_DENIED', 'EXTRA_TIME_REQUEST', {
        familyId: request.familyId,
        actorId: context.userId,
        entityId: request.id,
        details: { childId: request.childId },
      });

      return { request };
    }

    // action === 'APPROVE'
    const minsToGrant = grantedMinutes || request.requestedMinutes;

    if (minsToGrant <= 0 || minsToGrant > 240) {
      throw new AppError(400, 'INVALID_GRANTED_MINUTES', 'Granted extra time must be between 1 and 240 minutes.');
    }

    // Authoritative Temporary Allowance Creation
    PolicyService.grantTemporaryAllowance(
      context,
      request.childId,
      request.familyId,
      minsToGrant,
      request.reason || 'Child extra-time request approved',
    );

    request.status = 'APPROVED';
    request.grantedMinutes = minsToGrant;

    const updatedPolicy = PolicyService.getPolicy(context, request.childId);

    // Send notification to child
    NotificationService.sendPushNotification(
      request.childId,
      'Extra-Time Request Approved',
      `Your parent approved +${minsToGrant} extra minutes!`,
      { requestId: request.id, status: 'APPROVED', grantedMinutes: minsToGrant, policyVersion: updatedPolicy.version },
      `notif-approve-${request.id}`,
    );

    // Audit log
    AuditService.logEvent('EXTRA_TIME_APPROVED', 'EXTRA_TIME_REQUEST', {
      familyId: request.familyId,
      actorId: context.userId,
      entityId: request.id,
      details: { childId: request.childId, grantedMinutes: minsToGrant, policyVersion: updatedPolicy.version },
    });

    return { request, updatedPolicyVersion: updatedPolicy.version };
  }

  /**
   * Retrieve request by ID (for state checks & testing).
   */
  public static getRequestById(requestId: string): ExtraTimeRequest | undefined {
    return this.requests.get(requestId);
  }

  /**
   * Clear in-memory requests for test isolation.
   */
  public static clearForTest(): void {
    this.requests.clear();
  }
}
