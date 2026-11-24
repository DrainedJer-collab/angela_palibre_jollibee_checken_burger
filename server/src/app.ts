import express from 'express';
import { seedDatabase } from './db/seed.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/api.js';

let seeded = false;

export function createApiApp(): express.Express {
  if (!seeded) {
    seedDatabase(false);
    seeded = true;
  }

  const app = express();

  app.set('trust proxy', 1);

  // If an upstream serverless runtime (e.g. Vercel) already drained the stream
  // and populated req.body, mark _body so express.json() does not stall.
  app.use((req, _res, next) => {
    if (req.readableEnded && req.body !== undefined && !('_body' in req)) {
      (req as express.Request & { _body?: boolean })._body = true;
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'tingloy-sea-connect' });
  });

  // REST API routes
  app.use('/api', apiRouter);

  // Unknown API endpoints return JSON 404
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
