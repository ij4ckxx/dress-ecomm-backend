import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { ENV } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { startTokenCleanupCron, stopTokenCleanupCron } from './jobs/tokenCleanup.job.js';

const app = express();
const PORT = ENV.PORT;

// Global Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, Postman) or matching CLIENT_URL
      if (!origin || origin === ENV.CLIENT_URL || ENV.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(cookieParser(ENV.COOKIE_SECRET));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check endpoints (supports both /api/v1/health and /api/health)
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'E-commerce API is running' });
});

// Mount Authentication & Main API routes
// Supports both /api/v1 and /api prefixes
app.use('/api/v1', apiRoutes);
app.use('/api', apiRoutes);

// Global Centralized Error Handler (must be after all routes)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  startTokenCleanupCron();
});

// Graceful shutdown listeners
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server and stopping cron jobs...');
  stopTokenCleanupCron();
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received. Closing HTTP server and stopping cron jobs...');
  stopTokenCleanupCron();
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

export default app;
