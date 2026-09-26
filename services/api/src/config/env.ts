import { validateEnv, AppEnvConfig } from '@guardian/shared-validation';

let envConfig: AppEnvConfig | null = null;

export function getEnv(): AppEnvConfig {
  if (!envConfig) {
    envConfig = validateEnv(process.env);
  }
  return envConfig;
}
