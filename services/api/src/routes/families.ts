import { createSuccessResponse, ApiResponse } from '@guardian/shared-api';
import { Family } from '@guardian/shared-types';
import { validateRequiredFields } from '../middleware/validateRequest';
import { RequestUserContext } from '../middleware/authMiddleware';
import { FamilyService, FamilyDetailResponse } from '../services/familyService';
import { FamilyMemberEntity } from '../db/schema';

export function handleCreateFamily(
  context: RequestUserContext,
  payload: { name?: string },
): ApiResponse<FamilyDetailResponse> {
  validateRequiredFields(payload, ['name']);
  const result = FamilyService.createFamily(context, payload.name!);
  return createSuccessResponse(result);
}

export function handleGetFamily(
  context: RequestUserContext,
  familyId: string,
): ApiResponse<FamilyDetailResponse> {
  const result = FamilyService.getFamily(context, familyId);
  return createSuccessResponse(result);
}

export function handleUpdateFamily(
  context: RequestUserContext,
  familyId: string,
  payload: { name?: string },
): ApiResponse<Family> {
  validateRequiredFields(payload, ['name']);
  const updated = FamilyService.updateFamily(context, familyId, payload.name!);
  return createSuccessResponse(updated);
}

export function handleInviteParent(
  context: RequestUserContext,
  familyId: string,
  payload: { email?: string; userId?: string },
): ApiResponse<FamilyMemberEntity> {
  validateRequiredFields(payload, ['email', 'userId']);
  const member = FamilyService.inviteParent(context, familyId, payload.email!, payload.userId!);
  return createSuccessResponse(member);
}
