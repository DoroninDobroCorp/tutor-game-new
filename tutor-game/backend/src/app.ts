import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import { json } from 'body-parser';
import { errorHandler } from './middlewares/error.middleware';
import authRoutes from './routes/auth.routes';
import teacherRoutes from './routes/teacher.routes';
import studentRoutes from './routes/student.routes';
import generateRoutes from './routes/generate.routes';
import { config } from './config/env';
import WebSocketService from './services/websocket.service';

interface ServerWithWebSocket extends http.Server {
  wsService?: WebSocketService;
}

export const createServer = () => {
  const app = express();
  const server = http.createServer(app) as ServerWithWebSocket;
  
  // Initialize WebSocket service
  const wsService = new WebSocketService(server);
  server.wsService = wsService; // Attach WebSocket service to server instance
  
  // Enhanced CORS configuration
  const corsOptions = {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3003',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3003'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Content-Length',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Auth-Token'
    ],
    exposedHeaders: [
      'Content-Length',
      'X-Foo',
      'X-Bar',
      'Authorization'
    ],
    maxAge: 86400 // 24 hours
  };

  // Apply CORS with options
  app.use(cors(corsOptions));
  
  // Handle preflight requests
  app.options('*', cors(corsOptions));
  
  app.use(morgan('dev'));
  app.use(json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.env,
      websockets: wsService ? 'active' : 'inactive',
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/teacher', teacherRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/generate', generateRoutes);

  // 404 handler
  app.use((req, res, next) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`,
    });
  });

  // Error handling
  app.use(errorHandler);
  
  // Return both the Express app and HTTP server
  return { app, server };
};
