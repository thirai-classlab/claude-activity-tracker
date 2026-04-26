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
import { startPricingSync } from './services/pricingSyncScheduler';

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3001;

// Next.js app - uses project root (server/) as the directory.
// Dev (tsx):   __dirname = server/src         → ../      = server/
// Prod (tsc): __dirname = server/dist/src     → ../../   = server/
// Override via NEXT_APP_DIR if the layout changes.
const projectRoot =
  process.env.NEXT_APP_DIR ??
  (dev ? path.join(__dirname, '..') : path.join(__dirname, '..', '..'));
const nextApp = next({ dev, dir: projectRoot });
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

  // Static docs (markdown files under repository `docs/`)
  // Precedence: DOCS_DIR env > ../docs relative to process.cwd() (dev default)
  // Docker: compose bind-mounts the repo docs/ to /app/docs and sets DOCS_DIR=/app/docs
  // Placed after Basic Auth so docs inherit the same access gate as the dashboard.
  // See docs/decisions/resolved.md (D-007) and docs/announcements/2026-04-data-correction.md
  const docsDir = process.env.DOCS_DIR || path.resolve(process.cwd(), '..', 'docs');
  app.use(
    '/docs',
    express.static(docsDir, {
      index: false, // no directory listing
      extensions: ['md'], // allow /docs/foo to resolve to foo.md
      maxAge: '1h',
      redirect: false, // D-011: prevent trailing-slash redirect loop with Next.js handler
      setHeaders: (res, filePath) => {
        if (filePath.toLowerCase().endsWith('.md')) {
          res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        }
      },
    }),
  );

  // Legacy EJS dashboard (kept at /legacy for backward compat)
  app.set('view engine', 'ejs');
  app.set('views', path.join(projectRoot, 'views'));
  app.use('/legacy/static', express.static(path.join(projectRoot, 'public')));
  app.get('/legacy', (_req, res) => {
    const metricsFixedSince =
      process.env.NEXT_PUBLIC_METRICS_FIXED_SINCE ||
      process.env.METRICS_FIXED_SINCE ||
      '2026-04-25';
    res.render('dashboard', {
      apiKey: process.env.API_KEY || '',
      metricsFixedSince,
    });
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

    // Model pricing sync (LiteLLM → DB). Non-blocking.
    // Disable with PRICING_SYNC_DISABLED=1 (used by CI / API smoke tests).
    // Override cadence with PRICING_SYNC_INTERVAL_SEC (default 3600s).
    // Spec: docs/specs/002-model-pricing-registry.md — Task: docs/tasks/phase-2-t9.md
    startPricingSync({
      disabled: process.env.PRICING_SYNC_DISABLED === '1',
    });
  });
}).catch((err) => {
  console.error('Failed to start Next.js:', err);
  process.exit(1);
});

export default {};
