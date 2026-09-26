import { createSuccessResponse, ApiResponse } from '@guardian/shared-api';
import { Policy } from '@guardian/shared-types';
import { validateRequiredFields } from '../middleware/validateRequest';
import { RequestUserContext, verifyFamilyOwnership } from '../middleware/authMiddleware';
import { PolicyService } from '../services/policyService';
import { AuditService } from '../services/auditService';

export interface SyncCheckPayload {
  childId: string;
  familyId: string;
  currentVersion: number;
}

export interface SyncCheckResponse {
  upToDate: boolean;
  policy?: Policy;
}

export function handleSyncCheck(
  context: RequestUserContext,
  payload: SyncCheckPayload,
): ApiResponse<SyncCheckResponse> {
  validateRequiredFields(payload, ['childId', 'familyId', 'currentVersion']);
  verifyFamilyOwnership(context, payload.familyId);

  const policy = PolicyService.getPolicy(context, payload.childId);

  if (payload.currentVersion >= policy.version) {
    return createSuccessResponse({ upToDate: true });
  }

  return createSuccessResponse({
    upToDate: false,
    policy,
  });
}

export function handleSyncAck(
  context: RequestUserContext,
  payload: { childId: string; familyId: string; version: number },
): ApiResponse<{ acknowledged: boolean }> {
  validateRequiredFields(payload, ['childId', 'familyId', 'version']);
  verifyFamilyOwnership(context, payload.familyId);

  AuditService.logEvent('POLICY_SYNC_ACKNOWLEDGED', 'POLICY', {
    familyId: payload.familyId,
    actorId: context.userId,
    entityId: payload.childId,
    details: { version: payload.version },
  });

  return createSuccessResponse({ acknowledged: true });
}
