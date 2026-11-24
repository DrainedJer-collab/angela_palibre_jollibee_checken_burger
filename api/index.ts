import type { IncomingMessage, ServerResponse } from 'http';
import { createApiApp } from '../server/src/app.js';

let cachedApp: ReturnType<typeof createApiApp> | null = null;

function getApp(): ReturnType<typeof createApiApp> {
  if (!cachedApp) {
    cachedApp = createApiApp();
  }
  return cachedApp;
}

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  try {
    const parsed = new URL(req.url || '/', 'http://localhost');
    const rewrittenPath = parsed.searchParams.get('__path');

    if (rewrittenPath !== null) {
      parsed.searchParams.delete('__path');
      const qs = parsed.searchParams.toString();
      const cleanSubpath = rewrittenPath.replace(/^\/+/, '');
      req.url = `/api/${cleanSubpath}${qs ? `?${qs}` : ''}`;
    } else if (!parsed.pathname.startsWith('/api')) {
      const cleanPath = parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`;
      req.url = `/api${cleanPath}${parsed.search}`;
    }

    const app = getApp();
    app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
  } catch (err) {
    console.error('Vercel API handler error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const message =
      err instanceof Error ? err.message : 'Server initialization error.';
    res.end(JSON.stringify({ error: `API error: ${message}` }));
  }
}
