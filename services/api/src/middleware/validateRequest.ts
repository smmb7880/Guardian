import { AppError } from './errorHandler';

export function validateRequiredFields<T extends Record<string, unknown>>(
  payload: T,
  requiredFields: (keyof T)[],
): void {
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      missing.push(String(field));
    }
  }

  if (missing.length > 0) {
    throw new AppError(
      400,
      'INVALID_REQUEST_PAYLOAD',
      `Missing required request fields: ${missing.join(', ')}`,
      { missingFields: missing },
    );
  }
}
