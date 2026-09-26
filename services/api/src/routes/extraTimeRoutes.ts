import { createSuccessResponse, ApiResponse } from '@guardian/shared-api';
import { ExtraTimeRequest } from '@guardian/shared-types';
import { validateRequiredFields } from '../middleware/validateRequest';
import { RequestUserContext } from '../middleware/authMiddleware';
import { ExtraTimeService } from '../services/ExtraTimeService';

export function handleCreateExtraTimeRequest(
  context: RequestUserContext,
  payload: {
    childId: string;
    familyId: string;
    requestedMinutes: number;
    reason?: string;
    idempotencyKey?: string;
  },
): ApiResponse<ExtraTimeRequest> {
  validateRequiredFields(payload, ['childId', 'familyId', 'requestedMinutes']);
  const request = ExtraTimeService.createRequest(
    context,
    payload.childId,
    payload.familyId,
    payload.requestedMinutes,
    payload.reason,
    payload.idempotencyKey,
  );
  return createSuccessResponse(request);
}

export function handleGetPendingExtraTimeRequests(
  context: RequestUserContext,
  familyId: string,
): ApiResponse<ExtraTimeRequest[]> {
  const requests = ExtraTimeService.getPendingRequests(context, familyId);
  return createSuccessResponse(requests);
}

export function handleRespondExtraTimeRequest(
  context: RequestUserContext,
  payload: {
    requestId: string;
    action: 'APPROVE' | 'DENY';
    grantedMinutes?: number;
    expectedPolicyVersion?: number;
  },
): ApiResponse<{ request: ExtraTimeRequest; updatedPolicyVersion?: number }> {
  validateRequiredFields(payload, ['requestId', 'action']);
  const result = ExtraTimeService.respondToRequest(
    context,
    payload.requestId,
    payload.action,
    payload.grantedMinutes,
    payload.expectedPolicyVersion,
  );
  return createSuccessResponse(result);
}
