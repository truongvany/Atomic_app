import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.routes.js';
import { supplyRouter } from './routes/supply.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: config.FRONTEND_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'atomic-supply-chain-backend',
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api', supplyRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Không tìm thấy endpoint.' });
  });

  app.use(errorHandler);

  return app;
}
