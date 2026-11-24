import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload, UserRole } from '../types/index.js';
import { AppError } from './errorHandler.js';

const fallbackSecret = crypto.randomBytes(32).toString('hex');

function getJwtSecret(): string {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured && configured.length >= 16) {
    return configured;
  }
  const deploymentSeed =
    process.env.VERCEL_PROJECT_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;
  if (deploymentSeed) {
    return crypto.createHash('sha256').update(`tsc-jwt:${deploymentSeed}`).digest('hex');
  }
  return fallbackSecret;
}

export const COOKIE_NAME = 'tsc_auth';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

export function setAuthCookie(res: Response, token: string): void {
  const isHttps = process.env.NODE_ENV === 'production' || Boolean(process.env.APP_URL?.startsWith('https://'));
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    partitioned: isHttps,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  const isHttps = process.env.NODE_ENV === 'production' || Boolean(process.env.APP_URL?.startsWith('https://'));
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    partitioned: isHttps,
    path: '/',
  });
}

function extractToken(req: Request): { token: string | null; viaCookie: boolean } {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return { token: authHeader.slice(7).trim(), viaCookie: false };
  }

  const rawCookie = req.headers.cookie;
  if (rawCookie) {
    const parts = rawCookie.split(';');
    for (const part of parts) {
      const [k, ...rest] = part.trim().split('=');
      if (k === COOKIE_NAME && rest.length > 0) {
        return { token: decodeURIComponent(rest.join('=')), viaCookie: true };
      }
    }
  }

  return { token: null, viaCookie: false };
}

function verifyCsrfForCookieMutation(req: Request): void {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return;
  }
  const hasCustomHeader = req.headers['x-requested-with'] === 'XMLHttpRequest';
  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] as string | undefined) || req.headers.host;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return;
    } catch {
      // fall through
    }
  }
  if (hasCustomHeader) return;
  throw new AppError(403, 'Cross-origin request validation failed.');
}

export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  try {
    const { token, viaCookie } = extractToken(req);
    if (!token) {
      throw new AppError(401, 'Please sign in to continue.');
    }
    if (viaCookie) {
      verifyCsrfForCookieMutation(req);
    }
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(new AppError(401, 'Your session has expired. Please sign in again.'));
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  try {
    const { token } = extractToken(req);
    if (token) {
      req.user = verifyToken(token);
    }
  } catch {
    req.user = undefined;
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'Authentication required.'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'You do not have permission to perform this action.'));
      return;
    }
    next();
  };
}
