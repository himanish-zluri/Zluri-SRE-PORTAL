import express from 'express';
import authRoutes from './modules/auth/auth.routes';
import testRoutes from './routes/test.routes';
import queryRoutes from './modules/queries/query.routes';
import dbInstanceRoutes from './modules/db-instances/dbInstance.routes';
import podsRoutes from './modules/pods/pods.routes';

const app = express();

app.use(express.json());

// Routes
app.use('/api', dbInstanceRoutes);
app.use('/api/pods', podsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/queries', queryRoutes);

export default app;
