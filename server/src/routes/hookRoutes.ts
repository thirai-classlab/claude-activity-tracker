import { Router, Request, Response } from 'express';
import * as hookService from '../services/hookService';

export const hookRoutes = Router();

// ---------------------------------------------------------------------------
// POST /api/hook/session-start
// ---------------------------------------------------------------------------
hookRoutes.post('/session-start', async (req: Request, res: Response) => {
  try {
    await hookService.handleSessionStart(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error('session-start error:', error);
    res.status(500).json({ error: 'Failed to record session start' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/hook/prompt
// ---------------------------------------------------------------------------
hookRoutes.post('/prompt', async (req: Request, res: Response) => {
  try {
    await hookService.handlePrompt(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error('prompt error:', error);
    res.status(500).json({ error: 'Failed to record prompt' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/hook/subagent-start
// ---------------------------------------------------------------------------
hookRoutes.post('/subagent-start', async (req: Request, res: Response) => {
  try {
    await hookService.handleSubagentStart(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error('subagent-start error:', error);
    res.status(500).json({ error: 'Failed to record subagent start' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/hook/subagent-stop
// ---------------------------------------------------------------------------
hookRoutes.post('/subagent-stop', async (req: Request, res: Response) => {
  try {
    await hookService.handleSubagentStop(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error('subagent-stop error:', error);
    res.status(500).json({ error: 'Failed to record subagent stop' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/hook/stop
// ---------------------------------------------------------------------------
hookRoutes.post('/stop', async (req: Request, res: Response) => {
  try {
    await hookService.handleStop(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error('stop error:', error);
    res.status(500).json({ error: 'Failed to record stop' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/hook/session-end
// ---------------------------------------------------------------------------
hookRoutes.post('/session-end', async (req: Request, res: Response) => {
  try {
    await hookService.handleSessionEnd(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error('session-end error:', error);
    res.status(500).json({ error: 'Failed to record session end' });
  }
});
