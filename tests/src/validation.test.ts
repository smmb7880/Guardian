import { validateEmail, validatePassword } from '@guardian/shared-validation';

export function runValidationTest(): boolean {
  console.info('[Test] Running Shared Validation Test...');

  if (!validateEmail('parent@example.com')) {
    throw new Error('Valid email rejected');
  }
  if (validateEmail('invalid-email')) {
    throw new Error('Invalid email accepted');
  }

  const passCheck = validatePassword('short');
  if (passCheck.valid) {
    throw new Error('Short password accepted');
  }

  console.info('[Test] Validation Test PASSED.');
  return true;
}
