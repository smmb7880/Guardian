import { HealthCheckResponse, createSuccessResponse } from '@guardian/shared-api';
import { getEnv } from '../config/env';

const startTime = Date.now();

export function getHealthStatus(): HealthCheckResponse {
  const env = getEnv();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  return {
    status: 'ok',
    version: '0.1.0',
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  };
}

export function handleHealthCheckRequest() {
  const healthData = getHealthStatus();
  return createSuccessResponse(healthData);
}
