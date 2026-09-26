import { handleHealthCheckRequest } from './routes/health';
import { getEnv } from './config/env';
import { ConsoleLogger } from '@guardian/shared-utils';

const logger = new ConsoleLogger();

try {
  const env = getEnv();
  logger.info(`Starting Guardian API Service on PORT ${env.PORT} in ${env.NODE_ENV} mode...`);

  const health = handleHealthCheckRequest();
  logger.info('Initial Health Check Status:', health as unknown as Record<string, unknown>);
} catch (error) {
  logger.error('Failed to initialize Guardian API Service', error as Error);
  process.exit(1);
}
