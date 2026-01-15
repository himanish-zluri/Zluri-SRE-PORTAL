import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { initializeDatabase, closeDatabase } from './config/database';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    // Initialize MikroORM
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await closeDatabase();
  process.exit(0);
});

bootstrap();
