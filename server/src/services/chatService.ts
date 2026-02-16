import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { execSync } from 'child_process';
import { Server as SocketIOServer } from 'socket.io';
import * as dashboardService from './dashboardService';
import * as analysisService from './analysisService';

// ─── Types ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  context?: {
    type: 'global' | 'member';
    email?: string;
  };
}

// ─── MCP Tools (DB queries) ─────────────────────────────────────────────

function createDashboardTools() {
  return createSdkMcpServer({
    name: 'dashboard-db',
    version: '1.0.0',
    tools: [
      tool(
        'get_stats',
        'チーム全体のKPIサマリーを取得する（総セッション数、トークン数、コスト、メンバー数など）',
        {
          from: z.string().optional().describe('開始日 (YYYY-MM-DD)'),
          to: z.string().optional().describe('終了日 (YYYY-MM-DD)'),
          member: z.string().optional().describe('メンバーのメールアドレス'),
          repo: z.string().optional().describe('リポジトリ名'),
          model: z.string().optional().describe('モデル名'),
        },
        async (args) => {
          const data = await dashboardService.getStats(args);
          return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
        },
      ),

      tool(
        'get_daily_stats',
        '日別の集計データを取得する（セッション数、トークン数、コスト）',
        {
          from: z.string().optional().describe('開始日 (YYYY-MM-DD)'),
          to: z.string().optional().describe('終了日 (YYYY-MM-DD)'),
          member: z.string().optional().describe('メンバーのメールアドレス'),
          repo: z.string().optional().describe('リポジトリ名'),
        },
        async (args) => {
          const data = await dashboardService.getDailyStats(args);
          return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
        },
      ),

      tool(
        'get_member_stats',
        'メンバー別の集計データを取得する（セッション数、トークン数、コスト）',
        {
          from: z.string().optional().describe('開始日 (YYYY-MM-DD)'),
          to: z.string().optional().describe('終了日 (YYYY-MM-DD)'),
        },
        async (args) => {
          const data = await dashboardService.getMemberStats(args);
          return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
        },
      ),

      tool(
        'get_sessions',
        'セッション一覧を取得する（ページネーション対応）',
        {
          from: z.string().optional().describe('開始日 (YYYY-MM-DD)'),
          to: z.string().optional().describe('終了日 (YYYY-MM-DD)'),
          member: z.string().optional().describe('メンバーのメールアドレス'),
          repo: z.string().optional().describe('リポジトリ名'),
          model: z.string().optional().describe('モデル名'),
          page: z.number().optional().describe('ページ番号（デフォルト1）'),
          per_page: z.number().optional().describe('1ページあたりの件数（デフォルト50）'),
        },
        async (args) => {
          const { page, per_page, ...filters } = args;
          const data = await dashboardService.getSessions(filters, page || 1, per_page || 50);
          return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
        },
      ),

      tool(
        'get_session_detail',
        '特定セッションの詳細データを取得する（ターン一覧、ツール使用、サブエージェント情報）',
        {
          session_id: z.number().describe('セッションID'),
        },
        async (args) => {
          const data = await dashboardService.getSessionDetail(args.session_id);
          if (!data) {
            return { content: [{ type: 'text' as const, text: 'セッションが見つかりません' }] };
          }
          return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
        },
      ),

      tool(
        'get_tool_stats',
        'ツール使用統計を取得する（ツール名、カテゴリ、使用回数、成功率）',
        {
          from: z.string().optional().describe('開始日 (YYYY-MM-DD)'),
          to: z.string().optional().describe('終了日 (YYYY-MM-DD)'),
          member: z.string().optional().describe('メンバーのメールアドレス'),
        },
        async (args) => {
          const data = await dashboardService.getToolStats(args);
          return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
        },
      ),

      tool(
        'get_member_detail',
        '特定メンバーの詳細データを取得する（日別推移、モデル内訳、最近のセッション）',
        {
          email: z.string().describe('メンバーのメールアドレス'),
          from: z.string().optional().describe('開始日 (YYYY-MM-DD)'),
          to: z.string().optional().describe('終了日 (YYYY-MM-DD)'),
        },
        async (args) => {
          const { email, ...filters } = args;
          const data = await dashboardService.getMemberDetail(email, filters);
          return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
        },
      ),

      tool(
        'get_repo_stats',
        'リポジトリ別の集計データを取得する（セッション数、トークン数、メンバー数）',
        {
          from: z.string().optional().describe('開始日 (YYYY-MM-DD)'),
          to: z.string().optional().describe('終了日 (YYYY-MM-DD)'),
        },
        async (args) => {
          const data = await dashboardService.getRepoStats(args);
          return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
        },
      ),

      tool(
        'get_productivity_metrics',
        'メンバー別の生産性メトリクスを取得する（平均ターン数、ツール使用数、エラー率）',
        {
          from: z.string().optional().describe('開始日 (YYYY-MM-DD)'),
          to: z.string().optional().describe('終了日 (YYYY-MM-DD)'),
        },
        async (args) => {
          const data = await dashboardService.getProductivityMetrics(args);
          return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
        },
      ),

      tool(
        'get_heatmap',
        '曜日×時間帯のヒートマップデータを取得する',
        {
          from: z.string().optional().describe('開始日 (YYYY-MM-DD)'),
          to: z.string().optional().describe('終了日 (YYYY-MM-DD)'),
          member: z.string().optional().describe('メンバーのメールアドレス'),
        },
        async (args) => {
          const data = await dashboardService.getHeatmapData(args);
          return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
        },
      ),

      tool(
        'get_cost_stats',
        'モデル別・日別のコスト内訳を取得する',
        {
          from: z.string().optional().describe('開始日 (YYYY-MM-DD)'),
          to: z.string().optional().describe('終了日 (YYYY-MM-DD)'),
          member: z.string().optional().describe('メンバーのメールアドレス'),
        },
        async (args) => {
          const data = await dashboardService.getCostStats(args);
          return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
        },
      ),
    ],
  });
}

// ─── Claude Code executable path ────────────────────────────────────────

function findClaudeExecutable(): string | undefined {
  try {
    const path = execSync('which claude', { encoding: 'utf-8' }).trim();
    if (path) return path;
  } catch {
    // not found via which
  }
  // Common paths for Docker (npm -g) and local installs
  const candidates = [
    '/usr/local/bin/claude',
    '/usr/bin/claude',
    process.env.HOME + '/.local/bin/claude',
  ];
  for (const c of candidates) {
    try {
      execSync(`test -x ${c}`, { encoding: 'utf-8' });
      return c;
    } catch {
      // not found
    }
  }
  return undefined;
}

// ─── System Prompt ──────────────────────────────────────────────────────

function buildSystemPrompt(context?: ChatRequest['context']): string {
  const base = `あなたはAI駆動開発チームの分析アシスタントです。
チームのClaude Code利用状況データを分析し、洞察やアドバイスを提供します。

あなたには dashboard-db のツール群が利用可能です。
ユーザーの質問に答えるために、必要なデータをツールで取得してから回答してください。

利用可能なツール:
- get_stats: KPIサマリー
- get_daily_stats: 日別集計
- get_member_stats: メンバー別集計
- get_sessions: セッション一覧
- get_session_detail: セッション詳細
- get_tool_stats: ツール使用統計
- get_member_detail: メンバー詳細
- get_repo_stats: リポジトリ別集計
- get_productivity_metrics: 生産性メトリクス
- get_heatmap: ヒートマップ
- get_cost_stats: コスト内訳

回答のルール:
- 日本語で回答してください
- データに基づいた具体的な分析を行ってください
- 数値を含む回答では、実際のデータを引用してください
- 改善提案がある場合は具体的なアクションを提示してください
- マークダウン形式で見やすく回答してください
- 推測は「推測ですが」と前置きしてください`;

  if (context?.type === 'member' && context.email) {
    return `${base}

注意: 現在、メンバー「${context.email}」の詳細ページにいます。
質問が特定のメンバーに関するものである場合、このメールアドレスでフィルタリングしてデータを取得してください。`;
  }

  return base;
}

// ─── Analysis System Prompt (Performance Coach) ─────────────────────────

function buildAnalysisSystemPrompt(email: string, previousAnalysis?: string): string {
  let prompt = `あなたはAI駆動開発チームの**パフォーマンスコーチ**です。
メンバーのClaude Code利用データを分析し、改善コーチングを提供します。

## 分析対象メンバー
${email}

## あなたの役割
1. データに基づいた客観的な現状分析
2. KPI体系に沿った定量的な評価
3. 具体的で実行可能な改善提案（プロンプトの書き方・コンテキストエンジニアリング含む）

## KPI体系（4階層）

### Tier 1: セッション効率指標
- **ターン数/セッション**: 理想は5-15ターン。少なすぎ→1発で成果（優秀）、多すぎ→手戻り・試行錯誤の可能性
- **トークン効率**: inputTokens/outputTokens比率。cacheReadTokensの割合が高いほど効率的
- **セッション所要時間**: 30分以内のfocusedセッションが効率的

### Tier 2: AI活用品質指標
- **ツール成功率**: 80%以上が目標。低い場合はプロンプト品質に改善余地
- **エラー率**: errorCount/totalToolUses。5%以下が理想
- **サブエージェント活用率**: subagentCountが多いほど複雑なタスクに挑戦している

### Tier 3: コスト効率指標
- **セッションあたりコスト**: チーム平均との比較
- **モデル選択の適切さ**: タスク複雑さに応じたモデル選択（Haikuで十分なタスクにOpusを使っていないか等）
- **キャッシュ活用率**: cacheReadTokens / (totalInputTokens + cacheReadTokens)。高いほどコスト効率的

### Tier 4: 活動パターン指標
- **活動時間帯**: ヒートマップから生産的な時間帯を特定
- **セッション分類比率**: quick-fix / focused / exploration / heavy の内訳

## 分析手順
1. まず get_member_detail と get_stats でメンバーの基本データとチーム平均を取得
2. get_productivity_metrics でチーム全体と定量比較
3. get_tool_stats でツール使用パターンと成功率を確認
4. get_heatmap で活動パターンを確認
5. get_sessions で最近のセッション傾向を確認
6. 必要に応じて get_session_detail で特徴的なセッションを深掘り

## 出力形式（マークダウン）

### 📊 総合評価
★5段階評価と一言サマリー

### 📈 KPI分析
各Tier指標の**実数値**とチーム平均との比較

### 💡 改善提案（3-5項目）
各提案には以下を含める:
- **なぜ**: データの根拠
- **何を**: 具体的な改善ポイント
- **どうやって**: 実行可能なアクション

特に以下の観点を重視:
- プロンプトの書き方の改善（具体例を含む）
- コンテキストエンジニアリング（CLAUDE.mdの活用、適切なコンテキスト提供方法）
- モデル選択の最適化
- ツール使用パターンの改善
- セッション管理のコツ（いつ新規セッションを開始すべきか等）

## ルール
- 日本語で回答
- 批判ではなく**コーチング**のトーン
- 数値は必ず実データを引用
- 推測は「推測ですが」と前置き
- チーム平均との比較を必ず含める
- エンジニアの日常業務に即した具体的アドバイスを提供`;

  if (previousAnalysis) {
    prompt += `

## 前回の分析結果（比較用）
以下は前回の分析レポートです。改善・悪化した点があれば「🔄 前回との比較」セクションで言及してください。

${previousAnalysis}`;
  }

  return prompt;
}

// ─── Summarize tool args for display ────────────────────────────────────

function summarizeArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  return entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
}

// ─── Socket.IO Chat Handler ────────────────────────────────────────────

export function registerChatSocket(io: SocketIOServer): void {
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('chat:send', async (payload: ChatRequest) => {
      // Validate
      if (!payload.messages || !Array.isArray(payload.messages) || payload.messages.length === 0) {
        socket.emit('chat:error', { message: 'messages is required' });
        return;
      }

      // API Key auth (from handshake)
      const apiKey = process.env.API_KEY;
      if (apiKey) {
        const clientKey = socket.handshake.auth?.apiKey;
        if (clientKey !== apiKey) {
          socket.emit('chat:error', { message: 'Invalid API key' });
          return;
        }
      }

      const dashboardTools = createDashboardTools();

      // Build prompt from conversation history
      const lastUserMessage = payload.messages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) {
        socket.emit('chat:error', { message: 'ユーザーメッセージがありません' });
        return;
      }

      const conversationHistory = payload.messages.slice(0, -1)
        .map(m => `${m.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${m.content}`)
        .join('\n\n');

      const prompt = conversationHistory
        ? `これまでの会話:\n${conversationHistory}\n\n最新の質問: ${lastUserMessage.content}`
        : lastUserMessage.content;

      try {
        let hasOutput = false;
        const claudePath = findClaudeExecutable();
        // Track tool_use IDs to match results
        const pendingTools = new Map<string, string>();

        for await (const message of query({
          prompt,
          options: {
            systemPrompt: buildSystemPrompt(payload.context),
            mcpServers: {
              'dashboard-db': dashboardTools,
            },
            allowedTools: ['mcp__dashboard-db__*'],
            maxTurns: 10,
            model: 'claude-sonnet-4-5-20250929',
            ...(claudePath ? { pathToClaudeCodeExecutable: claudePath } : {}),
          },
        })) {
          if (message.type === 'assistant' && message.message?.content) {
            for (const block of message.message.content) {
              if ('text' in block && block.text) {
                socket.emit('chat:text', { content: block.text });
                hasOutput = true;
              } else if ('type' in block && block.type === 'tool_use') {
                const toolBlock = block as { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
                // Strip mcp__dashboard-db__ prefix for display
                const displayName = toolBlock.name.replace('mcp__dashboard-db__', '');
                pendingTools.set(toolBlock.id, displayName);
                socket.emit('chat:tool_use', {
                  toolName: displayName,
                  args: summarizeArgs(toolBlock.input || {}),
                });
              }
            }
          } else if (message.type === 'user' && message.message?.content) {
            // tool_result messages from the SDK
            const content = message.message.content;
            if (Array.isArray(content)) {
              for (const block of content) {
                if ('type' in block && block.type === 'tool_result') {
                  const resultBlock = block as { type: 'tool_result'; tool_use_id: string; content?: string | Array<{ text?: string }> };
                  const toolName = pendingTools.get(resultBlock.tool_use_id) || 'unknown';
                  pendingTools.delete(resultBlock.tool_use_id);
                  socket.emit('chat:tool_result', {
                    toolName,
                    summary: 'データ取得完了',
                  });
                }
              }
            }
          } else if (message.type === 'result') {
            if (message.subtype === 'success') {
              if (!hasOutput && message.result) {
                socket.emit('chat:text', { content: String(message.result) });
              }
            } else {
              console.error('Agent error:', message.subtype);
            }
          }
        }

        socket.emit('chat:done', {});
      } catch (e: unknown) {
        console.error('Chat error:', e);
        const msg = e instanceof Error ? e.message : 'Unknown error';
        socket.emit('chat:error', { message: `チャットエラー: ${msg}` });
      }
    });

    // ─── Analysis: Auto-run member analysis ──────────────────────────
    socket.on('analysis:run', async (payload: { email: string; periodFrom?: string; periodTo?: string }) => {
      if (!payload.email) {
        socket.emit('chat:error', { message: 'email is required' });
        return;
      }

      // API Key auth
      const apiKey = process.env.API_KEY;
      if (apiKey) {
        const clientKey = socket.handshake.auth?.apiKey;
        if (clientKey !== apiKey) {
          socket.emit('chat:error', { message: 'Invalid API key' });
          return;
        }
      }

      const dashboardTools = createDashboardTools();
      const claudePath = findClaudeExecutable();

      // Build period string for prompt
      const now = new Date();
      const periodFrom = payload.periodFrom || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const periodTo = payload.periodTo || now.toISOString().split('T')[0];

      // Fetch previous analysis for comparison
      let previousContent: string | undefined;
      try {
        const prev = await analysisService.getLatestAnalysisLog(payload.email);
        if (prev) {
          previousContent = prev.content;
        }
      } catch {
        // ignore - no previous analysis
      }

      const analysisPrompt = `メンバー「${payload.email}」の期間 ${periodFrom} 〜 ${periodTo} のAI活用状況を包括的に分析してください。

KPI 4階層（セッション効率・AI活用品質・コスト効率・活動パターン）で評価し、
プロンプトの書き方やコンテキストエンジニアリングの具体的な改善提案を含めてください。
チーム平均と比較し、★5段階評価で総合評価してください。

データ取得時は member パラメータに「${payload.email}」を、from に「${periodFrom}」を、to に「${periodTo}」を指定してください。
チーム平均との比較のために、get_productivity_metrics はフィルタなしでも呼び出してください。`;

      try {
        let accumulatedContent = '';
        let hasOutput = false;
        const pendingTools = new Map<string, string>();

        for await (const message of query({
          prompt: analysisPrompt,
          options: {
            systemPrompt: buildAnalysisSystemPrompt(payload.email, previousContent),
            mcpServers: {
              'dashboard-db': dashboardTools,
            },
            allowedTools: ['mcp__dashboard-db__*'],
            maxTurns: 15,
            model: 'claude-sonnet-4-5-20250929',
            ...(claudePath ? { pathToClaudeCodeExecutable: claudePath } : {}),
          },
        })) {
          if (message.type === 'assistant' && message.message?.content) {
            for (const block of message.message.content) {
              if ('text' in block && block.text) {
                socket.emit('chat:text', { content: block.text });
                accumulatedContent += block.text;
                hasOutput = true;
              } else if ('type' in block && block.type === 'tool_use') {
                const toolBlock = block as { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
                const displayName = toolBlock.name.replace('mcp__dashboard-db__', '');
                pendingTools.set(toolBlock.id, displayName);
                socket.emit('chat:tool_use', {
                  toolName: displayName,
                  args: summarizeArgs(toolBlock.input || {}),
                });
              }
            }
          } else if (message.type === 'user' && message.message?.content) {
            const content = message.message.content;
            if (Array.isArray(content)) {
              for (const block of content) {
                if ('type' in block && block.type === 'tool_result') {
                  const resultBlock = block as { type: 'tool_result'; tool_use_id: string };
                  const toolName = pendingTools.get(resultBlock.tool_use_id) || 'unknown';
                  pendingTools.delete(resultBlock.tool_use_id);
                  socket.emit('chat:tool_result', { toolName, summary: 'データ取得完了' });
                }
              }
            }
          } else if (message.type === 'result') {
            if (message.subtype === 'success') {
              if (!hasOutput && message.result) {
                const text = String(message.result);
                socket.emit('chat:text', { content: text });
                accumulatedContent += text;
              }
            } else {
              console.error('Analysis agent error:', message.subtype);
            }
          }
        }

        // Save analysis log to DB
        if (accumulatedContent) {
          try {
            const log = await analysisService.saveAnalysisLog({
              memberEmail: payload.email,
              periodFrom: new Date(periodFrom),
              periodTo: new Date(periodTo),
              content: accumulatedContent,
              metadata: { model: 'claude-sonnet-4-5-20250929' },
            });
            socket.emit('analysis:saved', { logId: log.id });
          } catch (saveErr) {
            console.error('Failed to save analysis log:', saveErr);
          }
        }

        socket.emit('chat:done', {});
      } catch (e: unknown) {
        console.error('Analysis error:', e);
        const msg = e instanceof Error ? e.message : 'Unknown error';
        socket.emit('chat:error', { message: `分析エラー: ${msg}` });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
}
