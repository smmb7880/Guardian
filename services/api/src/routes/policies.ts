import { createSuccessResponse, ApiResponse } from '@guardian/shared-api';
import { Policy, TemporaryAllowance } from '@guardian/shared-types';
import { validateRequiredFields } from '../middleware/validateRequest';
import { RequestUserContext } from '../middleware/authMiddleware';
import { PolicyService, PolicyDiffResult } from '../services/policyService';
import { PolicyEvaluator, EvaluationContext, EvaluationResult } from '../policy/policyEvaluator';

export function handleGetPolicy(
  context: RequestUserContext,
  childId: string,
): ApiResponse<Policy> {
  const policy = PolicyService.getPolicy(context, childId);
  return createSuccessResponse(policy);
}

export function handleUpdatePolicy(
  context: RequestUserContext,
  childId: string,
  familyId: string,
  payload: Partial<Policy>,
): ApiResponse<Policy> {
  const updated = PolicyService.updatePolicy(context, childId, familyId, payload);
  return createSuccessResponse(updated);
}

export function handleGetPolicyVersion(
  context: RequestUserContext,
  childId: string,
  versionNumber: number,
): ApiResponse<Policy> {
  const versionRecord = PolicyService.getPolicyVersion(context, childId, versionNumber);
  return createSuccessResponse(versionRecord);
}

export function handleGetPolicyDiff(
  context: RequestUserContext,
  childId: string,
  versionA: number,
  versionB: number,
): ApiResponse<PolicyDiffResult> {
  const diff = PolicyService.calculatePolicyDiff(context, childId, versionA, versionB);
  return createSuccessResponse(diff);
}

export function handleGrantAllowance(
  context: RequestUserContext,
  childId: string,
  familyId: string,
  payload: { durationMinutes?: number; reason?: string },
): ApiResponse<TemporaryAllowance> {
  validateRequiredFields(payload, ['durationMinutes']);
  const allowance = PolicyService.grantTemporaryAllowance(
    context,
    childId,
    familyId,
    payload.durationMinutes!,
    payload.reason,
  );
  return createSuccessResponse(allowance);
}

export function handleEvaluatePolicy(
  context: RequestUserContext,
  childId: string,
  evalContext: EvaluationContext,
): ApiResponse<EvaluationResult> {
  const policy = PolicyService.getPolicy(context, childId);
  const result = PolicyEvaluator.evaluate(policy, evalContext);
  return createSuccessResponse(result);
}
