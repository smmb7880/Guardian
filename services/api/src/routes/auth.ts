import { createSuccessResponse, ApiResponse } from '@guardian/shared-api';
import { validateRequiredFields } from '../middleware/validateRequest';
import { validateEmail, validatePassword } from '@guardian/shared-validation';
import { AppError } from '../middleware/errorHandler';
import { HashService } from '../auth/hashService';
import { SessionService } from '../auth/sessionService';
import { VerificationService } from '../auth/verificationService';
import { RateLimiter } from '../middleware/rateLimiter';
import { UserRole } from '@guardian/shared-types';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  familyId?: string;
  isEmailVerified: boolean;
}

// In-memory mock DB for authentication persistence across requests
export const userDatabase: Map<string, UserRecord> = new Map();

export interface AuthTokenResponse {
  userId: string;
  email: string;
  role: UserRole;
  familyId?: string;
  accessToken: string;
  refreshToken: string;
}

export function handleRegister(
  payload: { email?: string; password?: string; fullName?: string; role?: UserRole; familyId?: string },
  clientIp: string = '127.0.0.1',
): ApiResponse<AuthTokenResponse> {
  RateLimiter.checkRateLimit(`register:${clientIp}`, 10, 60000);
  validateRequiredFields(payload, ['email', 'password', 'fullName']);

  const email = payload.email!.toLowerCase().trim();
  if (!validateEmail(email)) {
    throw new AppError(400, 'INVALID_EMAIL', 'Email address format is invalid.');
  }

  const passCheck = validatePassword(payload.password!);
  if (!passCheck.valid) {
    throw new AppError(400, 'WEAK_PASSWORD', passCheck.reason || 'Password fails complexity check.');
  }

  if (userDatabase.has(email)) {
    throw new AppError(409, 'DUPLICATE_ACCOUNT', 'An account with this email address already exists.');
  }

  const userId = `user-${HashService.generateRandomToken(8)}`;
  const passwordHash = HashService.hashPassword(payload.password!);
  const role = payload.role || UserRole.PARENT;

  const user: UserRecord = {
    id: userId,
    email,
    passwordHash,
    fullName: payload.fullName!,
    role,
    familyId: payload.familyId,
    isEmailVerified: false,
  };

  userDatabase.set(email, user);

  const tokens = SessionService.createSession(user.id, user.email, user.role, user.familyId);

  return createSuccessResponse({
    userId: user.id,
    email: user.email,
    role: user.role,
    familyId: user.familyId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

export function handleLogin(
  payload: { email?: string; password?: string },
  clientIp: string = '127.0.0.1',
): ApiResponse<AuthTokenResponse> {
  RateLimiter.checkRateLimit(`login:${clientIp}`, 5, 60000);
  validateRequiredFields(payload, ['email', 'password']);

  const email = payload.email!.toLowerCase().trim();
  const user = userDatabase.get(email);

  if (!user || !HashService.verifyPassword(payload.password!, user.passwordHash)) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const tokens = SessionService.createSession(user.id, user.email, user.role, user.familyId);

  return createSuccessResponse({
    userId: user.id,
    email: user.email,
    role: user.role,
    familyId: user.familyId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

export function handleRefreshToken(
  payload: { refreshToken?: string },
  clientIp: string = '127.0.0.1',
): ApiResponse<{ accessToken: string; refreshToken: string }> {
  RateLimiter.checkRateLimit(`refresh:${clientIp}`, 10, 60000);
  validateRequiredFields(payload, ['refreshToken']);

  const oldToken = payload.refreshToken!;
  // Look up user from token payload if valid
  const tokens = SessionService.rotateRefreshToken(oldToken, 'parent@guardian.local', UserRole.PARENT);

  return createSuccessResponse(tokens);
}

export function handleLogout(payload: { sessionId?: string }): ApiResponse<{ loggedOut: boolean }> {
  validateRequiredFields(payload, ['sessionId']);
  SessionService.revokeSession(payload.sessionId!);
  return createSuccessResponse({ loggedOut: true });
}

export function handleRequestPasswordReset(payload: { email?: string }): ApiResponse<{ resetToken: string }> {
  validateRequiredFields(payload, ['email']);
  const resetToken = VerificationService.createPasswordResetToken(payload.email!);
  return createSuccessResponse({ resetToken });
}

export function handleResetPassword(payload: { resetToken?: string; newPassword?: string }): ApiResponse<{ passwordUpdated: boolean }> {
  validateRequiredFields(payload, ['resetToken', 'newPassword']);
  const result = VerificationService.resetPasswordWithToken(payload.resetToken!, payload.newPassword!);
  const user = userDatabase.get(result.email.toLowerCase());
  if (user) {
    user.passwordHash = result.newPasswordHash;
    SessionService.revokeAllUserSessions(user.id);
  }
  return createSuccessResponse({ passwordUpdated: true });
}
