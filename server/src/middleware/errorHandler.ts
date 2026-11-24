import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: Record<string, string>;

  constructor(statusCode: number, message: string, details?: Record<string, string>) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err && typeof err === 'object' && 'code' in err) {
    const sqliteErr = err as { code?: string; message?: string };
    if (sqliteErr.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'A record with this unique value already exists.' });
      return;
    }
    if (sqliteErr.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      res.status(400).json({ error: 'Referenced record could not be found.' });
      return;
    }
  }

  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'An unexpected server error occurred. Please try again.' });
}
