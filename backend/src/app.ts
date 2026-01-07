import express from 'express';
import authRoutes from './modules/auth/auth.routes';
import testRoutes from './routes/test.routes';
import queryRoutes from './modules/queries/query.routes';
import dbInstanceRoutes from './modules/db-instances/dbInstance.routes';


const app = express();

//making every incoming request in a json formats
app.use(express.json());

app.use('/api/db-instances', dbInstanceRoutes);


app.use('/api/auth', authRoutes);

//testing the authentication middleware
app.use('/api/test', testRoutes);

//queries routes
app.use('/api/queries', queryRoutes);



export default app;
