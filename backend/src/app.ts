import express from 'express';
import authRoutes from './modules/auth/auth.routes';
import testRoutes from './routes/test.routes';
import queryRoutes from './modules/queries/query.routes';


const app = express();

//making every incoming request in a json format
app.use(express.json());

//testing the authentication middleware
app.use('/api/test', testRoutes);

//queries routes
app.use('/api/queries', queryRoutes);


app.use('/api/auth', authRoutes);

export default app;
