import express from 'express';
import authRoutes from './modules/auth/auth.routes';
import testRoutes from './routes/test.routes';

const app = express();

//making every incoming request in a json format
app.use(express.json());

//testing the authentication middleware
app.use('/api/test', testRoutes);

app.use('/api/auth', authRoutes);

export default app;
