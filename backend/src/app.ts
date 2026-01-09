import express from 'express';
import authRoutes from './modules/auth/auth.routes';
import testRoutes from './routes/test.routes';
import queryRoutes from './modules/queries/query.routes';
import instanceRoutes from './modules/db-instances/dbInstance.routes';
import databaseRoutes from './modules/databases/database.routes';
import podsRoutes from './modules/pods/pods.routes';
import auditRoutes from './modules/audit/audit.routes';

const app = express();

app.use(express.json());

// Routes
app.use('/api/instances', instanceRoutes);
app.use('/api/databases', databaseRoutes);
app.use('/api/pods', podsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/audit', auditRoutes);

export default app;
