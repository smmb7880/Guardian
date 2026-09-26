import assert from 'assert';
import { authReducer, initialAuthState, AuthenticatedUser } from '../../apps/parent-mobile/src/context/AuthContext';
import { getInitialScreen } from '../../apps/parent-mobile/src/navigation/AppNavigator';
import { validateLoginForm, initialLoginFormState } from '../../apps/parent-mobile/src/screens/LoginScreenLogic';
import { validateRegisterForm, initialRegisterFormState } from '../../apps/parent-mobile/src/screens/RegisterScreenLogic';
import { validateFamilySetupForm, initialFamilySetupFormState } from '../../apps/parent-mobile/src/screens/FamilySetupScreenLogic';
import { formatMinutes, screenTimePercent, formatNextTransition } from '../../apps/parent-mobile/src/screens/DashboardScreenLogic';
import { formatPairingCodeForDisplay, isPairingCodeExpired, secondsUntilExpiry } from '../../apps/parent-mobile/src/screens/DeviceListScreenLogic';
import { UserRole } from '@guardian/shared-types';

export function runParentMobileTestSuite(): void {
  console.info('Running Parent Mobile Test Suite (Phase 7)...');

  // Test 1: Navigation Guard logic
  assert.strictEqual(getInitialScreen(false, false), 'Login');
  assert.strictEqual(getInitialScreen(true, false), 'FamilySetup');
  assert.strictEqual(getInitialScreen(true, true), 'Dashboard');
  console.info('  ✓ Initial screen routing logic passed');

  // Test 2: Auth Context Reducer
  const testUser: AuthenticatedUser = {
    userId: 'u-1',
    email: 'parent@test.com',
    role: UserRole.PARENT,
    familyId: 'f-1',
  };

  const loginState = authReducer(initialAuthState, {
    type: 'LOGIN_SUCCESS',
    user: testUser,
    accessToken: 'access-123',
    refreshToken: 'refresh-123',
  });
  assert.strictEqual(loginState.isAuthenticated, true);
  assert.strictEqual(loginState.user?.email, 'parent@test.com');
  assert.strictEqual(loginState.accessToken, 'access-123');

  const logoutState = authReducer(loginState, { type: 'LOGOUT' });
  assert.strictEqual(logoutState.isAuthenticated, false);
  assert.strictEqual(logoutState.user, null);
  assert.strictEqual(logoutState.accessToken, null);
  console.info('  ✓ Auth context reducer transitions passed');

  // Test 3: Form Validation
  const emptyLoginErrors = validateLoginForm(initialLoginFormState);
  assert.strictEqual(emptyLoginErrors.email, 'Email is required');
  assert.strictEqual(emptyLoginErrors.password, 'Password is required');

  const invalidEmailErrors = validateLoginForm({ ...initialLoginFormState, email: 'bademail', password: '123' });
  assert.strictEqual(invalidEmailErrors.email, 'Invalid email address');

  const validLoginErrors = validateLoginForm({ ...initialLoginFormState, email: 'test@example.com', password: 'password123' });
  assert.strictEqual(Object.keys(validLoginErrors).length, 0);

  const regMismatchErrors = validateRegisterForm({
    ...initialRegisterFormState,
    displayName: 'Parent',
    email: 'parent@test.com',
    password: 'password123',
    confirmPassword: 'differentpassword',
  });
  assert.strictEqual(regMismatchErrors.confirmPassword, 'Passwords do not match');

  const setupFutureDobErrors = validateFamilySetupForm({
    ...initialFamilySetupFormState,
    familyName: 'Smith Family',
    firstChildName: 'Alex',
    firstChildDateOfBirth: '2099-01-01',
  });
  assert.strictEqual(setupFutureDobErrors.firstChildDateOfBirth, 'Date of birth must be in the past');
  console.info('  ✓ Form validation rules passed');

  // Test 4: Dashboard Formatters & Screen Time calculations
  assert.strictEqual(formatMinutes(0), '0m');
  assert.strictEqual(formatMinutes(45), '45m');
  assert.strictEqual(formatMinutes(60), '1h');
  assert.strictEqual(formatMinutes(90), '1h 30m');

  assert.strictEqual(screenTimePercent(0, 120), 0);
  assert.strictEqual(screenTimePercent(60, 120), 50);
  assert.strictEqual(screenTimePercent(150, 120), 100);
  assert.strictEqual(screenTimePercent(60, null), 0);

  assert.strictEqual(formatNextTransition(null), 'No upcoming change');
  console.info('  ✓ Screen time calculations and formatters passed');

  // Test 5: Device Pairing Code Helpers
  assert.strictEqual(formatPairingCodeForDisplay('ABCDEF'), 'ABC-DEF');
  assert.strictEqual(formatPairingCodeForDisplay('XYZ'), 'XYZ');

  const pastExpiry = new Date(Date.now() - 10000).toISOString();
  assert.strictEqual(isPairingCodeExpired(pastExpiry), true);
  assert.strictEqual(secondsUntilExpiry(pastExpiry), 0);

  const futureExpiry = new Date(Date.now() + 60000).toISOString();
  assert.strictEqual(isPairingCodeExpired(futureExpiry), false);
  assert(secondsUntilExpiry(futureExpiry) > 50);
  console.info('  ✓ Device pairing code formatters and expiry logic passed');

  console.info('=== PARENT MOBILE TEST SUITE PASSED SUCCESSFULLY ===');
}
