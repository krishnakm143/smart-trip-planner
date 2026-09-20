import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import apiRoutes from './routes/index.js';

export function createApp() {
  const app = express();

  // Behind a hosting proxy the client address arrives in X-Forwarded-For; the
  // rate limiter needs it to tell visitors apart.
  if (config.trustProxy > 0) {
    app.set('trust proxy', config.trustProxy);
  }

  app.use(helmet());
  app.use(cors({ origin: config.clientOrigins }));
  app.use(express.json({ limit: '100kb' }));
  if (!config.isTest) {
    app.use(morgan(config.isDev ? 'dev' : 'tiny'));
  }

  app.use('/api/v1', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
