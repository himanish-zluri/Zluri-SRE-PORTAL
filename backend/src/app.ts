import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './modules/auth/auth.routes';
import testRoutes from './routes/test.routes';
import queryRoutes from './modules/queries/query.routes';
import instanceRoutes from './modules/db-instances/dbInstance.routes';
import databaseRoutes from './modules/databases/database.routes';
import podsRoutes from './modules/pods/pods.routes';
import auditRoutes from './modules/audit/audit.routes';
import userRoutes from './modules/users/user.routes';
import { globalErrorHandler, notFoundHandler } from './middlewares/errorHandler.middleware';
import { RequestContext } from '@mikro-orm/core';
import { orm } from './config/database';
import { swaggerSpec } from './config/swagger';

const app = express();

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'https://zluri-sre-portal.vercel.app'
];

// Allow all Vercel preview deployments
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    // Allow configured origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    
    // Allow all Vercel preview deployments
    if (origin.includes('vercel.app')) return callback(null, true);
    
    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
app.use(cors(corsOptions));

app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'DB Query Portal API',
}));

// Serve OpenAPI spec as JSON
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// MikroORM request context middleware - creates a new EntityManager for each request
app.use((_req, _res, next) => {
  if (orm) {
    RequestContext.create(orm.em, next);
  } else {
    next();
  }
});

// Routes
app.use('/api/instances', instanceRoutes);
app.use('/api/databases', databaseRoutes);
app.use('/api/pods', podsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/audit', auditRoutes);

// 404 handler for undefined routes (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last middleware)
app.use(globalErrorHandler);

export default app;
