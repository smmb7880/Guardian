import { validateEnv } from '@guardian/shared-validation';
import { handleHealthCheckRequest } from '@guardian/api-service/dist/routes/health';

export function runHealthCheckTest(): boolean {
  console.info('[Test] Running Health Check Test...');
  const env = validateEnv({
    PORT: '4000',
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://guardian:test@localhost:5432/guardian_test',
    JWT_SECRET: 'test-secret',
  });

  if (env.PORT !== 4000) {
    throw new Error(`Expected PORT 4000, got ${env.PORT}`);
  }

  const response = handleHealthCheckRequest();
  if (!response.success || response.data?.status !== 'ok') {
    throw new Error('Health check status failed');
  }

  console.info('[Test] Health Check Test PASSED.');
  return true;
}
