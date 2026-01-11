import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

import authRoutes from './routes/auth';
import generateRoutes from './routes/generate';
import queueRoutes from './routes/queue';
import mediaRoutes from './routes/media';
import creditRoutes from './routes/credits';
import { setupWebSocketHandlers } from './websocket/handlers';
import { startQueueProcessor } from './services/queueProcessor';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

export const prisma = new PrismaClient();
export const redis = createClient({ url: process.env.REDIS_URL });

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await redis.connect();
    console.log('Connected to Redis');
    
    app.use(helmet());
    app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    }));
    app.use(morgan('combined'));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        redis: redis.isOpen,
        database: 'connected'
      });
    });

    app.use('/api/auth', authRoutes);
    app.use('/api/generate', generateRoutes);
    app.use('/api/queue', queueRoutes);
    app.use('/api/media', mediaRoutes);
    app.use('/api/credits', creditRoutes);

    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error(err.stack);
      res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
      });
    });

    setupWebSocketHandlers(wss);
    
    startQueueProcessor();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await redis.disconnect();
  await prisma.$disconnect();
  process.exit(0);
});

startServer();