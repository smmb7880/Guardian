export interface AppEnvConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
}

export function validateEnv(env: Record<string, string | undefined>): AppEnvConfig {
  const errors: string[] = [];

  const portStr = env.PORT || '3000';
  const port = parseInt(portStr, 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    errors.push(`Invalid PORT: ${portStr}`);
  }

  const nodeEnv = (env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    errors.push(`Invalid NODE_ENV: ${env.NODE_ENV}`);
  }

  const databaseUrl = env.DATABASE_URL || 'postgresql://guardian:guardian@localhost:5432/guardian_db';
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection URI');
  }

  const jwtSecret = env.JWT_SECRET || (nodeEnv === 'production' ? '' : 'dev-jwt-secret-key-change-in-prod');
  if (!jwtSecret && nodeEnv === 'production') {
    errors.push('JWT_SECRET is required in production environment');
  }

  if (errors.length > 0) {
    throw new Error(`Environment Configuration Error:\n - ${errors.join('\n - ')}`);
  }

  return {
    PORT: port,
    NODE_ENV: nodeEnv,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: env.JWT_EXPIRES_IN || '15m',
  };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long.' };
  }
  return { valid: true };
}
