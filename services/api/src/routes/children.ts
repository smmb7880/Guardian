import { createSuccessResponse, ApiResponse } from '@guardian/shared-api';
import { Child } from '@guardian/shared-types';
import { validateRequiredFields } from '../middleware/validateRequest';
import { RequestUserContext } from '../middleware/authMiddleware';
import { ChildService } from '../services/childService';

export function handleCreateChild(
  context: RequestUserContext,
  payload: { familyId?: string; name?: string; age?: number; avatarUrl?: string },
): ApiResponse<Child> {
  validateRequiredFields(payload, ['familyId', 'name']);
  const child = ChildService.createChild(context, {
    familyId: payload.familyId!,
    name: payload.name!,
    age: payload.age,
    avatarUrl: payload.avatarUrl,
  });
  return createSuccessResponse(child);
}

export function handleGetChildren(
  context: RequestUserContext,
  familyId: string,
): ApiResponse<Child[]> {
  const children = ChildService.getChildren(context, familyId);
  return createSuccessResponse(children);
}

export function handleUpdateChild(
  context: RequestUserContext,
  childId: string,
  payload: { name?: string; age?: number; avatarUrl?: string },
): ApiResponse<Child> {
  const updated = ChildService.updateChild(context, childId, payload);
  return createSuccessResponse(updated);
}

export function handleDeleteChild(
  context: RequestUserContext,
  childId: string,
): ApiResponse<{ deleted: boolean }> {
  ChildService.deleteChild(context, childId);
  return createSuccessResponse({ deleted: true });
}
