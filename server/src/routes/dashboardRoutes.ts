import { Router, Request, Response } from 'express';
import * as dashboardService from '../services/dashboardService';
import { DashboardFilters } from '../services/dashboardService';

export const dashboardRoutes = Router();

// ─── Helper: extract filters from query params ─────────────────────────────

function getFilters(query: Request['query']): DashboardFilters {
  return {
    from: query.from as string | undefined,
    to: query.to as string | undefined,
    member: query.member as string | undefined,
    repo: query.repo as string | undefined,
    model: query.model as string | undefined,
  };
}

// ─── GET /stats — KPI summary ──────────────────────────────────────────────

dashboardRoutes.get('/stats', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getStats(getFilters(req.query));
    res.json(data);
  } catch (error) {
    console.error('stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ─── GET /daily — Daily aggregates ─────────────────────────────────────────

dashboardRoutes.get('/daily', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getDailyStats(getFilters(req.query));
    res.json(data);
  } catch (error) {
    console.error('daily stats error:', error);
    res.status(500).json({ error: 'Failed to get daily stats' });
  }
});

// ─── GET /members — Member aggregates ──────────────────────────────────────

dashboardRoutes.get('/members', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getMemberStats(getFilters(req.query));
    res.json(data);
  } catch (error) {
    console.error('member stats error:', error);
    res.status(500).json({ error: 'Failed to get member stats' });
  }
});

// ─── GET /subagents — Subagent analytics ───────────────────────────────────

dashboardRoutes.get('/subagents', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getSubagentStats(getFilters(req.query));
    res.json(data);
  } catch (error) {
    console.error('subagent stats error:', error);
    res.status(500).json({ error: 'Failed to get subagent stats' });
  }
});

// ─── GET /tools — Tool usage analytics ─────────────────────────────────────

dashboardRoutes.get('/tools', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getToolStats(getFilters(req.query));
    res.json(data);
  } catch (error) {
    console.error('tool stats error:', error);
    res.status(500).json({ error: 'Failed to get tool stats' });
  }
});

// ─── GET /costs — Cost breakdown by model and date ─────────────────────────

dashboardRoutes.get('/costs', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getCostStats(getFilters(req.query));
    res.json(data);
  } catch (error) {
    console.error('cost stats error:', error);
    res.status(500).json({ error: 'Failed to get cost stats' });
  }
});

// ─── GET /sessions — Paginated session list ────────────────────────────────

dashboardRoutes.get('/sessions', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const perPage = parseInt(req.query.per_page as string, 10) || 50;
    const data = await dashboardService.getSessions(getFilters(req.query), page, perPage);
    res.json(data);
  } catch (error) {
    console.error('sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// ─── GET /sessions/:id — Single session detail ─────────────────────────────

dashboardRoutes.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid session ID' });
      return;
    }
    const data = await dashboardService.getSessionDetail(id);
    if (!data) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(data);
  } catch (error) {
    console.error('session detail error:', error);
    res.status(500).json({ error: 'Failed to get session detail' });
  }
});

// ─── GET /heatmap — Time-of-day usage heatmap ──────────────────────────────

dashboardRoutes.get('/heatmap', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getHeatmapData(getFilters(req.query));
    res.json(data);
  } catch (error) {
    console.error('heatmap error:', error);
    res.status(500).json({ error: 'Failed to get heatmap data' });
  }
});

// ─── GET /security — Security metrics ──────────────────────────────────────

dashboardRoutes.get('/security', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getSecurityStats(getFilters(req.query));
    res.json(data);
  } catch (error) {
    console.error('security stats error:', error);
    res.status(500).json({ error: 'Failed to get security stats' });
  }
});

// ─── GET /repos — Repository analytics ──────────────────────────────────────

dashboardRoutes.get('/repos', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getRepoStats(getFilters(req.query));
    res.json(data);
  } catch (error) {
    console.error('repo stats error:', error);
    res.status(500).json({ error: 'Failed to get repo stats' });
  }
});

// ─── GET /repo-detail?name=... — Single repo detail (query param) ────────────

dashboardRoutes.get('/repo-detail', async (req: Request, res: Response) => {
  try {
    const repo = req.query.name as string;
    if (!repo) {
      res.status(400).json({ error: 'Missing name parameter' });
      return;
    }
    const data = await dashboardService.getRepoDetail(repo, getFilters(req.query));
    res.json(data);
  } catch (error) {
    console.error('repo detail error:', error);
    res.status(500).json({ error: 'Failed to get repo detail' });
  }
});

// ─── GET /member-detail?email=... — Single member detail (query param) ───────

dashboardRoutes.get('/member-detail', async (req: Request, res: Response) => {
  try {
    const member = req.query.email as string;
    if (!member) {
      res.status(400).json({ error: 'Missing email parameter' });
      return;
    }
    const data = await dashboardService.getMemberDetail(member, getFilters(req.query));
    res.json(data);
  } catch (error) {
    console.error('member detail error:', error);
    res.status(500).json({ error: 'Failed to get member detail' });
  }
});

// ─── GET /repo-date-heatmap — Repo x Date heatmap ─────────────────────────

dashboardRoutes.get('/repo-date-heatmap', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getRepoDateHeatmap(getFilters(req.query));
    res.json(data);
  } catch (error) {
    console.error('repo-date-heatmap error:', error);
    res.status(500).json({ error: 'Failed to get repo-date heatmap' });
  }
});

// ─── GET /member-date-heatmap — Member x Date heatmap ─────────────────────

dashboardRoutes.get('/member-date-heatmap', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getMemberDateHeatmap(getFilters(req.query));
    res.json(data);
  } catch (error) {
    console.error('member-date-heatmap error:', error);
    res.status(500).json({ error: 'Failed to get member-date heatmap' });
  }
});

// ─── GET /productivity — Member productivity metrics ──────────────────────

dashboardRoutes.get('/productivity', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getProductivityMetrics(getFilters(req.query));
    res.json(data);
  } catch (error) {
    console.error('productivity error:', error);
    res.status(500).json({ error: 'Failed to get productivity metrics' });
  }
});

// ─── GET /filters — Available filter values ────────────────────────────────

dashboardRoutes.get('/filters', async (_req: Request, res: Response) => {
  try {
    const data = await dashboardService.getFilterOptions();
    res.json(data);
  } catch (error) {
    console.error('filters error:', error);
    res.status(500).json({ error: 'Failed to get filter options' });
  }
});

// ─── GET /prompt-feed — Prompt feed for real-time view ──────────────────────

dashboardRoutes.get('/prompt-feed', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const before = req.query.before as string | undefined;
    const data = await dashboardService.getPromptFeed(getFilters(req.query), limit, before);
    res.json(data);
  } catch (error) {
    console.error('prompt-feed error:', error);
    res.status(500).json({ error: 'Failed to get prompt feed' });
  }
});
