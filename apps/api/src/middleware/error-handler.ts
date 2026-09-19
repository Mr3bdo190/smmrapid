import type { ErrorRequestHandler, RequestHandler } from 'express';
import { logger } from '../lib/logger.js';

/**
 * The single error envelope for the API: { success: false, error: { code, message } }.
 *
 * Rules enforced here for every future module:
 *  - a code is always present and stable (clients translate by code, never by message text);
 *  - unexpected failures answer with a neutral message plus a support reference;
 *  - the real cause is logged server-side with the same reference, never returned to the client.
 */
export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, status = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const supportRef = (): string =>
  Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).toUpperCase().slice(2, 5);

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'The requested resource does not exist.' },
  });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  const ref = supportRef();
  logger.error('Unhandled request failure', { ref, error: err instanceof Error ? err.message : String(err) });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'We could not complete this operation right now. Nothing was changed — please try again.',
      ref,
    },
  });
};
