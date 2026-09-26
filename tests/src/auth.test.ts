import {
  handleRegister,
  handleLogin,
  handleRefreshToken,
  handleLogout,
  userDatabase,
} from '@guardian/api-service/dist/routes/auth';
import { extractAndVerifyAuthHeader, verifyFamilyOwnership } from '@guardian/api-service/dist/middleware/authMiddleware';
import { TokenService } from '@guardian/api-service/dist/auth/tokenService';
import { SessionService } from '@guardian/api-service/dist/auth/sessionService';
import { RateLimiter } from '@guardian/api-service/dist/middleware/rateLimiter';
import { UserRole } from '@guardian/shared-types';
import { AppError } from '@guardian/api-service/dist/middleware/errorHandler';

export function runAuthTestSuite(): boolean {
  console.info('[Test Suite] Starting Phase 3 Authentication Tests...');
  userDatabase.clear();
  SessionService.clearAllForTest();
  RateLimiter.resetForTest();

  // Test 1: Valid Registration
  console.info(' - Test 1: Valid Registration');
  const regResult = handleRegister({
    email: 'alice@guardian.local',
    password: 'SuperSecurePassword123!',
    fullName: 'Alice Parent',
    familyId: 'family-alice-100',
  });
  if (!regResult.success || !regResult.data?.accessToken) {
    throw new Error('Valid registration failed.');
  }

  // Test 2: Duplicate Account Rejection
  console.info(' - Test 2: Duplicate Account Rejection');
  try {
    handleRegister({
      email: 'alice@guardian.local',
      password: 'AnotherPassword123!',
      fullName: 'Alice Clone',
    });
    throw new Error('Duplicate account registration should have failed.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'DUPLICATE_ACCOUNT') {
      throw new Error(`Expected DUPLICATE_ACCOUNT error, got ${err}`);
    }
  }

  // Test 3: Invalid Login Credentials
  console.info(' - Test 3: Invalid Login Credentials');
  try {
    handleLogin({
      email: 'alice@guardian.local',
      password: 'WrongPassword123!',
    });
    throw new Error('Invalid login should have failed.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'INVALID_CREDENTIALS') {
      throw new Error(`Expected INVALID_CREDENTIALS error, got ${err}`);
    }
  }

  // Test 4: Expired Access Token
  console.info(' - Test 4: Expired Access Token Validation');
  const expiredToken = TokenService.signAccessToken(
    'user-expired',
    'expired@guardian.local',
    UserRole.PARENT,
    'fam-expired',
    -100, // expired 100 seconds ago
  );
  try {
    extractAndVerifyAuthHeader(`Bearer ${expiredToken}`);
    throw new Error('Expired access token should have been rejected.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'TOKEN_EXPIRED') {
      throw new Error(`Expected TOKEN_EXPIRED error, got ${err}`);
    }
  }

  // Test 5: Refresh Token Rotation
  console.info(' - Test 5: Refresh Token Rotation');
  const loginRes = handleLogin({
    email: 'alice@guardian.local',
    password: 'SuperSecurePassword123!',
  });
  const firstRefreshToken = loginRes.data!.refreshToken;

  const refreshRes = handleRefreshToken({ refreshToken: firstRefreshToken });
  if (!refreshRes.success || !refreshRes.data?.accessToken) {
    throw new Error('Refresh token rotation failed.');
  }

  // Re-using old refresh token must trigger revocation rejection
  try {
    handleRefreshToken({ refreshToken: firstRefreshToken });
    throw new Error('Re-using old refresh token should have failed.');
  } catch (err) {
    if (!(err instanceof AppError) || (err.errorCode !== 'SESSION_REVOKED' && err.errorCode !== 'INVALID_SESSION')) {
      throw new Error(`Expected SESSION_REVOKED/INVALID_SESSION, got ${err}`);
    }
  }

  // Test 6: Revoked Session
  console.info(' - Test 6: Revoked Session Enforcement');
  const activeSessionRes = handleLogin({
    email: 'alice@guardian.local',
    password: 'SuperSecurePassword123!',
  });
  const tokenPayload = TokenService.verifyToken<{ sessionId?: string }>(activeSessionRes.data!.refreshToken);
  handleLogout({ sessionId: tokenPayload.sessionId });

  try {
    handleRefreshToken({ refreshToken: activeSessionRes.data!.refreshToken });
    throw new Error('Logout revoked session should have been rejected.');
  } catch (err) {
    if (!(err instanceof AppError)) {
      throw new Error('Revoked session should fail.');
    }
  }

  // Test 7: Unauthorized Family Access
  console.info(' - Test 7: Unauthorized Family Access Protection');
  const aliceContext = {
    userId: 'user-alice',
    email: 'alice@guardian.local',
    role: UserRole.PARENT,
    familyId: 'family-alice-100',
  };
  try {
    verifyFamilyOwnership(aliceContext, 'family-bob-999');
    throw new Error('Cross-family access attempt should have failed.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'FORBIDDEN_FAMILY_ACCESS') {
      throw new Error(`Expected FORBIDDEN_FAMILY_ACCESS, got ${err}`);
    }
  }

  // Test 8: Malformed Request Payload
  console.info(' - Test 8: Malformed Request Payload');
  try {
    handleRegister({ email: '', password: '' });
    throw new Error('Malformed request should have failed.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'INVALID_REQUEST_PAYLOAD') {
      throw new Error(`Expected INVALID_REQUEST_PAYLOAD, got ${err}`);
    }
  }

  // Test 9: Rate Limits Enforcement
  console.info(' - Test 9: Rate Limiting Enforcement');
  RateLimiter.resetForTest();
  const testIp = '10.0.0.42';
  for (let i = 0; i < 5; i++) {
    try {
      handleLogin({ email: 'alice@guardian.local', password: 'WrongPassword' }, testIp);
    } catch {
      // expected credential error
    }
  }
  // 6th attempt should hit rate limiter
  try {
    handleLogin({ email: 'alice@guardian.local', password: 'WrongPassword' }, testIp);
    throw new Error('6th login attempt should have hit rate limiter.');
  } catch (err) {
    if (!(err instanceof AppError) || err.errorCode !== 'TOO_MANY_REQUESTS') {
      throw new Error(`Expected TOO_MANY_REQUESTS, got ${err}`);
    }
  }

  console.info('[Test Suite] All Phase 3 Authentication Tests PASSED SUCCESSFULY!');
  return true;
}
