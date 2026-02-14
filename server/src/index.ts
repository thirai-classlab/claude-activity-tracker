import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import { hookRoutes } from './routes/hookRoutes';
import { apiKeyAuth } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('short'));

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Hook API routes (protected by API key auth)
app.use('/api/hook', apiKeyAuth, hookRoutes);

// Basic auth for dashboard UI (skip /api/* and /health)
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || '';
if (BASIC_AUTH_PASSWORD) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return next();
    }
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const encoded = authHeader.split(' ')[1] || '';
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const password = decoded.includes(':') ? decoded.split(':').slice(1).join(':') : decoded;
      if (password === BASIC_AUTH_PASSWORD) {
        return next();
      }
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="AI Driven Analytics"');
    res.status(401).send('Authentication required');
  });
}

// Dashboard routes (protected by API key auth)
import { dashboardRoutes } from './routes/dashboardRoutes';
app.use('/api/dashboard', apiKeyAuth, dashboardRoutes);

// Dashboard (root serves the EJS dashboard)
app.get('/', (_req, res) => {
  res.render('dashboard', { apiKey: process.env.API_KEY || '' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Claude Activity Tracker API listening on port ${PORT}`);
});

export default app;
