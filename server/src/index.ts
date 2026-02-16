import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { hookRoutes } from './routes/hookRoutes';
import { dashboardRoutes } from './routes/dashboardRoutes';
import { apiKeyAuth } from './middleware/auth';
import { registerChatSocket } from './services/chatService';

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3001;

// Next.js app - uses project root (server/) as the directory
const nextApp = next({ dev, dir: path.join(__dirname, '..') });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('short'));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Hook API routes (protected by API key auth)
  app.use('/api/hook', apiKeyAuth, hookRoutes);

  // Dashboard API routes (protected by API key auth)
  app.use('/api/dashboard', apiKeyAuth, dashboardRoutes);

  // Basic auth for non-API routes
  const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || '';
  if (BASIC_AUTH_PASSWORD) {
    app.use((req, res, nextFn) => {
      if (req.path.startsWith('/api/') || req.path === '/health') {
        return nextFn();
      }
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const encoded = authHeader.split(' ')[1] || '';
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const password = decoded.includes(':') ? decoded.split(':').slice(1).join(':') : decoded;
        if (password === BASIC_AUTH_PASSWORD) {
          return nextFn();
        }
      }
      res.setHeader('WWW-Authenticate', 'Basic realm="AI Driven Analytics"');
      res.status(401).send('Authentication required');
    });
  }

  // Legacy EJS dashboard (kept at /legacy for backward compat)
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../views'));
  app.use('/legacy/static', express.static(path.join(__dirname, '../public')));
  app.get('/legacy', (_req, res) => {
    res.render('dashboard', { apiKey: process.env.API_KEY || '' });
  });

  // Next.js handles all other routes (new dashboard UI)
  app.all('*', (req, res) => handle(req, res));

  // Create HTTP server and attach Socket.IO
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    path: '/socket.io',
    cors: { origin: '*' },
  });

  // Register chat WebSocket handler
  registerChatSocket(io);

  httpServer.listen(PORT, () => {
    console.log(`Claude Activity Tracker listening on port ${PORT}`);
    console.log(`  Dashboard: http://localhost:${PORT}`);
    console.log(`  Legacy:    http://localhost:${PORT}/legacy`);
    console.log(`  API:       http://localhost:${PORT}/api/dashboard/*`);
    console.log(`  WebSocket: ws://localhost:${PORT}/socket.io`);
  });
}).catch((err) => {
  console.error('Failed to start Next.js:', err);
  process.exit(1);
});

export default {};
