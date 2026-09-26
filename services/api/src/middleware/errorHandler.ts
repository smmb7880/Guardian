import { createErrorResponse, ApiResponse } from '@guardian/shared-api';
import { ConsoleLogger } from '@guardian/shared-utils';

const logger = new ConsoleLogger();

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function handleGlobalError(error: unknown): { statusCode: number; body: ApiResponse<never> } {
  if (error instanceof AppError) {
    logger.warn(`Handled AppError [${error.errorCode}]: ${error.message}`);
    return {
      statusCode: error.statusCode,
      body: createErrorResponse(error.errorCode, error.message, error.details),
    };
  }

  const err = error instanceof Error ? error : new Error(String(error));
  logger.error('Unhandled Internal Server Error', err);

  // Return generic error message to clients to avoid leaking stack traces or internal secrets
  return {
    statusCode: 500,
    body: createErrorResponse('INTERNAL_SERVER_ERROR', 'An unexpected error occurred on the server.'),
  };
}
