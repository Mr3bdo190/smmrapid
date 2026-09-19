import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from './error-handler.js';

/**
 * Request validation.
 *
 * Every handler that accepts a body or params runs through one of these, so a malformed request
 * answers with a stable VALIDATION_ERROR listing the offending fields instead of reaching the
 * database and failing there with a driver message.
 *
 * Query validation lives here too, so a list endpoint has one way to refuse a bad filter and the
 * client sees one shape (`error.details.fields`) whether the mistake was in the body, the path or
 * the query string.
 */
const humanPath = (path: readonly (string | number | symbol)[]): string =>
  path.length ? path.map(String).join('.') : '(body)';

export type FieldIssue = { field: string; message: string };

function parse<T>(schema: ZodType<T>, value: unknown, where: string): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const fields: FieldIssue[] = result.error.issues.map((issue) => ({
    field: humanPath(issue.path),
    message: issue.message,
  }));
  const first = fields[0];

  throw new AppError(
    'VALIDATION_ERROR',
    first ? `${where}: ${first.field} — ${first.message}` : `${where} is not valid.`,
    422,
    { fields },
  );
}

export const validateBody = <T>(schema: ZodType<T>): RequestHandler => (req, _res, next) => {
  try {
    req.body = parse(schema, req.body ?? {}, 'Request body');
    next();
  } catch (error) {
    next(error);
  }
};

export const validateQuery = <T>(schema: ZodType<T>): RequestHandler => (req, _res, next) => {
  try {
    // express 5 exposes the parsed query as a getter: assigning the parsed value back is the only
    // reliable way to hand typed, coerced values to the handler.
    const parsed = parse(schema, req.query ?? {}, 'Query');
    Object.defineProperty(req, 'query', { value: parsed, writable: false, configurable: true });
    next();
  } catch (error) {
    next(error);
  }
};

export const validateParams = <T>(schema: ZodType<T>): RequestHandler => (req, _res, next) => {
  try {
    req.params = parse(schema, req.params ?? {}, 'Path') as typeof req.params;
    next();
  } catch (error) {
    next(error);
  }
};
