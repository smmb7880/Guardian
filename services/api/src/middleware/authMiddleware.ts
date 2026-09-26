import { UserRole } from '@guardian/shared-types';
import { AppError } from './errorHandler';
import { TokenService, AccessTokenPayload } from '../auth/tokenService';

export interface RequestUserContext {
  userId: string;
  email: string;
  role: UserRole;
  familyId?: string;
}

export function extractAndVerifyAuthHeader(authHeader?: string): RequestUserContext {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication token required (Bearer scheme).');
  }

  const token = authHeader.substring(7).trim();
  const payload = TokenService.verifyToken<AccessTokenPayload>(token);

  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    familyId: payload.familyId,
  };
}

export function verifyUserRole(context: RequestUserContext | null, allowedRoles: UserRole[]): void {
  if (!context) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication token required.');
  }

  if (!allowedRoles.includes(context.role)) {
    throw new AppError(403, 'FORBIDDEN', 'User does not possess required role permissions.');
  }
}

export function verifyFamilyOwnership(context: RequestUserContext | null, targetFamilyId: string): void {
  if (!context) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication token required.');
  }

  if (!context.familyId || context.familyId !== targetFamilyId) {
    throw new AppError(403, 'FORBIDDEN_FAMILY_ACCESS', 'Access denied to requested family resources.');
  }
}
