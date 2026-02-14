import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedChoice<T>(arr: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function daysAgo(days: number, hourMin = 9, hourMax = 20): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randomInt(hourMin, hourMax), randomInt(0, 59), randomInt(0, 59), 0);
  return d;
}

function addMs(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

function estimateCost(
  model: string,
  input: number,
  output: number,
  cacheCreation: number,
  cacheRead: number,
): number {
  let inputPrice = 3;
  let outputPrice = 15;
  let cacheCreatePrice = 3.75;
  let cacheReadPrice = 0.3;

  if (model.includes('opus')) {
    inputPrice = 15;
    outputPrice = 75;
    cacheCreatePrice = 18.75;
    cacheReadPrice = 1.5;
  } else if (model.includes('haiku')) {
    inputPrice = 0.8;
    outputPrice = 4;
    cacheCreatePrice = 1;
    cacheReadPrice = 0.08;
  }

  return (
    (input / 1_000_000) * inputPrice +
    (output / 1_000_000) * outputPrice +
    (cacheCreation / 1_000_000) * cacheCreatePrice +
    (cacheRead / 1_000_000) * cacheReadPrice
  );
}

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

const MODELS = ['claude-opus-4-6', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001'];
const MODEL_WEIGHTS = [20, 60, 20]; // sonnet most common

const REPOS = [
  'acme-corp/acme-crm',
  'acme-corp/acme-web-frontend',
  'acme-corp/acme-api-server',
  'acme-corp/acme-mobile-app',
  'acme-corp/acme-infra',
  'acme-corp/acme-docs',
];

const BRANCHES = ['main', 'develop', 'feature/auth', 'feature/dashboard', 'fix/bug-123', 'fix/login-error', 'refactor/api-v2', 'feature/notifications'];

const PROMPTS = [
  'このファイルの構造を確認して',
  'テストを追加してください',
  'エラーの原因を調べて',
  'リファクタリングしてほしい',
  'APIエンドポイントを作成して',
  'データベースのスキーマを修正して',
  'CSSのレイアウトを直して',
  'TypeScriptの型エラーを修正して',
  'ログ出力を追加して',
  'パフォーマンスを改善して',
  'ドキュメントを更新して',
  '認証機能を実装して',
  'このバグを修正してください',
  'コンポーネントを分割して',
  'バリデーションを追加して',
  'CI/CDパイプラインを設定して',
  'ユニットテストを書いて',
  'E2Eテストを追加して',
  'Salesforceの連携を実装して',
  'GraphQLスキーマを作成して',
  'Dockerfileを修正して',
  'Terraformの設定を更新して',
  'セキュリティ脆弱性を調査して',
  'キャッシュ戦略を実装して',
  'レスポンシブデザインに対応して',
  'アクセシビリティを改善して',
  'メール通知機能を追加して',
  'CSVエクスポート機能を実装して',
  'ページネーションを追加して',
  'WebSocketによるリアルタイム通知を実装して',
];

const SUMMARIES = [
  'Expressルートにエラーハンドリングを追加し、テストを作成',
  'Prismaスキーマの更新とマイグレーション実行',
  'ダッシュボードコンポーネントの実装とChart.js統合',
  'APIエンドポイントのリファクタリングとバグ修正',
  'TypeScript型定義の整理と共通化',
  'CI/CDパイプラインの設定とデプロイスクリプト作成',
  'ユーザー認証フローの実装（JWT + リフレッシュトークン）',
  'Salesforce APIとの連携モジュールを実装',
  'データベースインデックス最適化によるクエリ高速化',
  'React コンポーネントの分割とパフォーマンス改善',
  'Docker Compose環境の構築とドキュメント作成',
  'E2Eテストフレームワーク（Playwright）の導入と基本テスト作成',
  'CSVインポート/エクスポート機能の実装',
  'WebSocket通知システムの設計と実装',
  'アクセス制御（RBAC）の実装とミドルウェア作成',
  'フォームバリデーションの統一とエラーメッセージ改善',
  'APIレスポンスキャッシュ戦略の導入（Redis）',
  'モバイルアプリ用REST APIの設計とエンドポイント実装',
  'ログ収集・監視基盤（CloudWatch）の設定',
  'データマイグレーションスクリプトの作成と実行',
  null,
  null,
];

const TOOL_DEFS: Array<{
  toolName: string;
  toolCategory: string;
  isMcp: boolean;
  mcpServer: string | null;
  summaryFn: () => string;
  weight: number;
}> = [
  {
    toolName: 'Read',
    toolCategory: 'search',
    isMcp: false,
    mcpServer: null,
    weight: 25,
    summaryFn: () =>
      randomChoice([
        'src/index.ts', 'src/components/App.tsx', 'package.json', 'prisma/schema.prisma',
        'src/lib/prisma.ts', 'src/routes/hookRoutes.ts', 'tsconfig.json', 'src/services/authService.ts',
        'src/middleware/auth.ts', 'src/utils/validation.ts', '.env.example', 'README.md',
      ]),
  },
  {
    toolName: 'Grep',
    toolCategory: 'search',
    isMcp: false,
    mcpServer: null,
    weight: 15,
    summaryFn: () =>
      randomChoice([
        'handleSessionStart in src/', 'TODO in **/*.ts', 'import.*prisma', 'export function',
        'console\\.error', 'async function', 'throw new Error', '@deprecated',
      ]),
  },
  {
    toolName: 'Glob',
    toolCategory: 'search',
    isMcp: false,
    mcpServer: null,
    weight: 10,
    summaryFn: () =>
      randomChoice(['**/*.ts', 'src/**/*.tsx', 'prisma/**', '**/*.test.ts', 'src/**/*.spec.ts']),
  },
  {
    toolName: 'Edit',
    toolCategory: 'file_edit',
    isMcp: false,
    mcpServer: null,
    weight: 20,
    summaryFn: () =>
      randomChoice([
        'src/index.ts', 'src/services/hookService.ts', 'src/components/Dashboard.tsx',
        'src/utils/helpers.ts', 'src/routes/api.ts', 'src/middleware/auth.ts',
      ]),
  },
  {
    toolName: 'Write',
    toolCategory: 'file_edit',
    isMcp: false,
    mcpServer: null,
    weight: 8,
    summaryFn: () =>
      randomChoice([
        'src/utils/newHelper.ts', 'src/components/Chart.tsx', 'scripts/deploy.sh',
        'src/types/index.ts', 'src/__tests__/auth.test.ts',
      ]),
  },
  {
    toolName: 'Bash',
    toolCategory: 'bash',
    isMcp: false,
    mcpServer: null,
    weight: 12,
    summaryFn: () =>
      randomChoice([
        'npm run build', 'npm test', 'git status', 'npx prisma db push',
        'ls -la src/', 'npm install zod', 'git diff --stat', 'docker compose up -d',
        'npx jest --coverage', 'npm run lint',
      ]),
  },
  {
    toolName: 'Task',
    toolCategory: 'subagent',
    isMcp: false,
    mcpServer: null,
    weight: 5,
    summaryFn: () =>
      randomChoice([
        'Search for all usages of the deprecated API',
        'Find and list test files that need updating',
        'Explore the auth module structure',
        'Investigate the database connection pooling issue',
      ]),
  },
  {
    toolName: 'WebSearch',
    toolCategory: 'web',
    isMcp: false,
    mcpServer: null,
    weight: 3,
    summaryFn: () =>
      randomChoice([
        'Prisma SQLite migration guide', 'Express error handling best practices',
        'TypeScript generic constraints', 'React 19 new features',
      ]),
  },
  {
    toolName: 'mcp__github__search_code',
    toolCategory: 'mcp',
    isMcp: true,
    mcpServer: 'github',
    weight: 2,
    summaryFn: () =>
      randomChoice([
        'query=handleSessionStart repo=acme-corp/acme-api-server',
        'query=PrismaClient repo=acme-corp/acme-api-server',
      ]),
  },
  {
    toolName: 'mcp__github__create_pull_request',
    toolCategory: 'mcp',
    isMcp: true,
    mcpServer: 'github',
    weight: 1,
    summaryFn: () => 'title=Fix auth bug base=main head=fix/auth',
  },
  {
    toolName: 'mcp__salesforce__salesforce_query_records',
    toolCategory: 'mcp',
    isMcp: true,
    mcpServer: 'salesforce',
    weight: 2,
    summaryFn: () =>
      randomChoice([
        'SELECT Id, Name FROM Account LIMIT 10',
        'SELECT Id, Status FROM Case WHERE CreatedDate = TODAY',
      ]),
  },
  {
    toolName: 'mcp__serena__find_symbol',
    toolCategory: 'mcp',
    isMcp: true,
    mcpServer: 'serena',
    weight: 1,
    summaryFn: () => randomChoice(['handleSessionStart', 'PrismaClient', 'DashboardService']),
  },
];

const TOOL_WEIGHTS = TOOL_DEFS.map((t) => t.weight);

const SUBAGENT_TYPES = ['Explore', 'Plan', 'Bash', 'general-purpose'];

const FILE_PATHS = [
  'src/index.ts', 'src/components/App.tsx', 'src/services/hookService.ts',
  'src/utils/helpers.ts', 'src/types/index.ts', 'prisma/schema.prisma',
  'package.json', 'src/routes/dashboardRoutes.ts', 'src/lib/prisma.ts',
  'tsconfig.json', '.env', 'src/components/SessionList.tsx',
  'src/components/StatsCard.tsx', 'src/middleware/auth.ts',
  'src/__tests__/hookService.test.ts', 'src/__tests__/dashboard.test.ts',
  'docker-compose.yml', 'Dockerfile', '.github/workflows/ci.yml',
  'src/services/notificationService.ts', 'src/utils/validation.ts',
];

const OPERATIONS = ['create', 'edit', 'edit', 'edit', 'read']; // edit is most common

const MEMBERS = [
  { gitEmail: 'alice@example.com', displayName: 'Alice Johnson', claudeAccount: 'alice@example.com' },
  { gitEmail: 'bob@example.com', displayName: 'Bob Smith', claudeAccount: 'bob@example.com' },
  { gitEmail: 'carol@example.com', displayName: 'Carol Williams', claudeAccount: 'carol@example.com' },
  { gitEmail: 'dave@example.com', displayName: 'Dave Brown', claudeAccount: 'dave@example.com' },
  { gitEmail: 'eve@example.com', displayName: 'Eve Davis', claudeAccount: 'eve@example.com' },
  { gitEmail: 'frank@example.com', displayName: 'Frank Miller', claudeAccount: 'frank@example.com' },
  { gitEmail: 'grace@example.com', displayName: 'Grace Wilson', claudeAccount: 'grace@example.com' },
  { gitEmail: 'hank@example.com', displayName: 'Hank Moore', claudeAccount: 'hank@example.com' },
];

// Each member has a "profile" that determines usage patterns
const MEMBER_PROFILES: Record<string, { sessionsPerWeek: number; avgTurns: number; usesSubagents: boolean; preferredModel: string }> = {
  'alice@example.com': { sessionsPerWeek: 12, avgTurns: 10, usesSubagents: true, preferredModel: 'claude-opus-4-6' },
  'bob@example.com':   { sessionsPerWeek: 8, avgTurns: 7, usesSubagents: true, preferredModel: 'claude-sonnet-4-5-20250929' },
  'carol@example.com': { sessionsPerWeek: 6, avgTurns: 5, usesSubagents: false, preferredModel: 'claude-sonnet-4-5-20250929' },
  'dave@example.com':  { sessionsPerWeek: 10, avgTurns: 8, usesSubagents: true, preferredModel: 'claude-sonnet-4-5-20250929' },
  'eve@example.com':   { sessionsPerWeek: 4, avgTurns: 4, usesSubagents: false, preferredModel: 'claude-haiku-4-5-20251001' },
  'frank@example.com': { sessionsPerWeek: 7, avgTurns: 6, usesSubagents: true, preferredModel: 'claude-sonnet-4-5-20250929' },
  'grace@example.com': { sessionsPerWeek: 5, avgTurns: 5, usesSubagents: false, preferredModel: 'claude-sonnet-4-5-20250929' },
  'hank@example.com':  { sessionsPerWeek: 3, avgTurns: 3, usesSubagents: false, preferredModel: 'claude-haiku-4-5-20251001' },
};

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding database...');

  // Clear existing data (in dependency order)
  await prisma.sessionEvent.deleteMany();
  await prisma.fileChange.deleteMany();
  await prisma.toolUse.deleteMany();
  await prisma.subagent.deleteMany();
  await prisma.turn.deleteMany();
  await prisma.session.deleteMany();
  await prisma.member.deleteMany();

  console.log('  Cleared existing data');

  // Create members
  const createdMembers = await Promise.all(
    MEMBERS.map((m) =>
      prisma.member.create({
        data: {
          gitEmail: m.gitEmail,
          claudeAccount: m.claudeAccount || null,
          displayName: m.displayName,
        },
      }),
    ),
  );
  console.log(`  Created ${createdMembers.length} members`);

  let totalSessions = 0;
  let totalTurns = 0;
  let totalToolUses = 0;
  let totalSubagents = 0;
  let totalFileChanges = 0;
  let totalEvents = 0;

  // Generate sessions for the past 30 days
  const DAYS_BACK = 30;

  for (const member of createdMembers) {
    const profile = MEMBER_PROFILES[member.gitEmail] || {
      sessionsPerWeek: 5, avgTurns: 5, usesSubagents: false, preferredModel: 'claude-sonnet-4-5-20250929',
    };

    // Total sessions for this member over DAYS_BACK
    const totalMemberSessions = Math.round((profile.sessionsPerWeek / 7) * DAYS_BACK);

    for (let s = 0; s < totalMemberSessions; s++) {
      // Spread sessions across the date range
      const startDay = randomInt(0, DAYS_BACK - 1);

      // Weekday bias: fewer sessions on weekends
      const dayOfWeek = new Date(daysAgo(startDay)).getDay();
      if ((dayOfWeek === 0 || dayOfWeek === 6) && Math.random() > 0.2) continue;

      // Model selection: mostly preferred, sometimes others
      const model = Math.random() > 0.3
        ? profile.preferredModel
        : weightedChoice(MODELS, MODEL_WEIGHTS);

      const repo = randomChoice(REPOS);
      const branch = randomChoice(BRANCHES);
      const sessionStart = daysAgo(startDay, 9, 21);
      const sessionDurationMinutes = randomInt(5, 180);
      const sessionEnd = addMs(sessionStart, sessionDurationMinutes * 60 * 1000);
      const hasSubagents = profile.usesSubagents && Math.random() > 0.4;

      // Token totals scale with session duration and model
      const durationFactor = sessionDurationMinutes / 60; // hours
      const baseInput = model.includes('opus') ? 40000 : model.includes('haiku') ? 8000 : 20000;
      const baseOutput = model.includes('opus') ? 15000 : model.includes('haiku') ? 3000 : 8000;

      const sessionInputTokens = Math.round(baseInput * durationFactor * (0.7 + Math.random() * 0.6));
      const sessionOutputTokens = Math.round(baseOutput * durationFactor * (0.7 + Math.random() * 0.6));
      const sessionCacheCreation = Math.round(sessionInputTokens * 0.15 * Math.random());
      const sessionCacheRead = Math.round(sessionInputTokens * 0.6 * Math.random());
      const cost = estimateCost(model, sessionInputTokens, sessionOutputTokens, sessionCacheCreation, sessionCacheRead);

      const turnCount = Math.max(2, Math.round(profile.avgTurns * (0.5 + Math.random())));
      const toolUseCount = randomInt(turnCount, turnCount * 3);
      const subagentCount = hasSubagents ? randomInt(1, 4) : 0;
      const compactCount = sessionDurationMinutes > 60 ? randomInt(1, 3) : (Math.random() > 0.8 ? 1 : 0);
      const errorCount = Math.random() > 0.75 ? randomInt(1, 3) : 0;

      const endReason = randomChoice(['user_exit', 'user_exit', 'user_exit', 'conversation_end', 'timeout']);
      const permissionMode = randomChoice(['default', 'default', 'plan', 'full-auto']);

      // Create the session
      const session = await prisma.session.create({
        data: {
          memberId: member.id,
          sessionUuid: uuid(),
          model,
          source: randomChoice(['vscode', 'vscode', 'vscode', 'terminal', 'cursor']),
          permissionMode,
          cwd: `/home/${member.gitEmail.split('@')[0]}/projects/${repo.split('/')[1]}`,
          gitRepo: repo,
          gitBranch: branch,
          ipAddress: `192.168.1.${randomInt(10, 200)}`,
          startedAt: sessionStart,
          endedAt: sessionEnd,
          endReason,
          totalInputTokens: sessionInputTokens,
          totalOutputTokens: sessionOutputTokens,
          totalCacheCreationTokens: sessionCacheCreation,
          totalCacheReadTokens: sessionCacheRead,
          estimatedCost: Math.round(cost * 10000) / 10000,
          turnCount,
          toolUseCount,
          subagentCount,
          compactCount,
          errorCount,
          summary: randomChoice(SUMMARIES),
        },
      });
      totalSessions++;

      // Create turns
      let turnCursor = new Date(sessionStart);
      const createdTurns: { id: number }[] = [];

      for (let t = 0; t < turnCount; t++) {
        const promptSubmittedAt = addMs(turnCursor, randomInt(3000, 60000));
        const durationMs = randomInt(800, 15000);
        const responseCompletedAt = addMs(promptSubmittedAt, durationMs);
        turnCursor = responseCompletedAt;

        const fraction = 1 / turnCount;
        const jitter = 0.5 + Math.random();
        const turnInputTokens = Math.round(sessionInputTokens * fraction * jitter);
        const turnOutputTokens = Math.round(sessionOutputTokens * fraction * jitter);
        const turnCacheCreation = Math.round(sessionCacheCreation * fraction * Math.random());
        const turnCacheRead = Math.round(sessionCacheRead * fraction * Math.random());

        const turn = await prisma.turn.create({
          data: {
            sessionId: session.id,
            turnNumber: t + 1,
            promptText: randomChoice(PROMPTS),
            promptSubmittedAt,
            responseCompletedAt,
            durationMs,
            inputTokens: turnInputTokens,
            outputTokens: turnOutputTokens,
            cacheCreationTokens: turnCacheCreation,
            cacheReadTokens: turnCacheRead,
            model,
            stopReason: randomChoice(['end_turn', 'end_turn', 'max_tokens', 'tool_use']),
          },
        });
        createdTurns.push({ id: turn.id });
        totalTurns++;
      }

      // Create tool uses (main agent)
      for (let tu = 0; tu < toolUseCount; tu++) {
        const toolDef = weightedChoice(TOOL_DEFS, TOOL_WEIGHTS);
        const associatedTurn = randomChoice(createdTurns);
        const isError = Math.random() > 0.92;

        await prisma.toolUse.create({
          data: {
            sessionId: session.id,
            turnId: associatedTurn.id,
            toolUseUuid: uuid(),
            toolName: toolDef.toolName,
            toolCategory: toolDef.toolCategory,
            toolInputSummary: toolDef.summaryFn(),
            status: isError ? 'error' : 'success',
            errorMessage: isError
              ? randomChoice([
                  'File not found', 'Permission denied', 'Command failed with exit code 1',
                  'Network timeout', 'EACCES: permission denied', 'Module not found',
                ])
              : null,
            isMcp: toolDef.isMcp,
            mcpServer: toolDef.mcpServer,
            executedAt: addMs(sessionStart, randomInt(60000, sessionDurationMinutes * 60 * 1000)),
          },
        });
        totalToolUses++;
      }

      // Create subagents
      if (hasSubagents) {
        for (let sa = 0; sa < subagentCount; sa++) {
          const agentType = randomChoice(SUBAGENT_TYPES);
          const saStart = addMs(sessionStart, randomInt(60000, Math.max(120000, (sessionDurationMinutes * 60 * 1000) / 2)));
          const saDurationSec = randomInt(10, 300);
          const saEnd = addMs(saStart, saDurationSec * 1000);
          const saModel = Math.random() > 0.6 ? model : weightedChoice(MODELS, MODEL_WEIGHTS);
          const saInputTokens = randomInt(2000, 25000);
          const saOutputTokens = randomInt(500, 8000);
          const saCacheCreation = randomInt(0, 5000);
          const saCacheRead = randomInt(0, 12000);
          const saCost = estimateCost(saModel, saInputTokens, saOutputTokens, saCacheCreation, saCacheRead);

          const subagentToolCount = randomInt(2, 8);
          const parentTurn = randomChoice(createdTurns);

          const subagent = await prisma.subagent.create({
            data: {
              sessionId: session.id,
              turnId: parentTurn.id,
              agentUuid: uuid(),
              agentType,
              agentModel: saModel,
              promptText: randomChoice([
                'Search for all usages of deprecated API in the codebase',
                'Find test files that reference hookService',
                'Explore the project structure and list key modules',
                'Plan the implementation of the new dashboard feature',
                'Run the full test suite and report results',
                'Investigate the performance bottleneck in the API layer',
                'Check for security vulnerabilities in dependencies',
                'Find all TODO comments and create a summary',
              ]),
              description: `${agentType} subagent for ${repo.split('/')[1]}`,
              startedAt: saStart,
              stoppedAt: saEnd,
              durationSeconds: saDurationSec,
              inputTokens: saInputTokens,
              outputTokens: saOutputTokens,
              cacheCreationTokens: saCacheCreation,
              cacheReadTokens: saCacheRead,
              estimatedCost: Math.round(saCost * 10000) / 10000,
              toolUseCount: subagentToolCount,
            },
          });
          totalSubagents++;

          // Create tool uses for this subagent
          for (let stu = 0; stu < subagentToolCount; stu++) {
            const nonSubagentTools = TOOL_DEFS.filter((td) => td.toolCategory !== 'subagent');
            const nonSubagentWeights = nonSubagentTools.map((t) => t.weight);
            const toolDef = weightedChoice(nonSubagentTools, nonSubagentWeights);
            await prisma.toolUse.create({
              data: {
                sessionId: session.id,
                turnId: parentTurn.id,
                subagentId: subagent.id,
                toolUseUuid: uuid(),
                toolName: toolDef.toolName,
                toolCategory: toolDef.toolCategory,
                toolInputSummary: toolDef.summaryFn(),
                status: Math.random() > 0.95 ? 'error' : 'success',
                errorMessage: Math.random() > 0.95 ? 'Subagent tool error' : null,
                isMcp: toolDef.isMcp,
                mcpServer: toolDef.mcpServer,
                executedAt: addMs(saStart, randomInt(1000, saDurationSec * 1000)),
              },
            });
            totalToolUses++;
          }
        }
      }

      // Create file changes (for ~75% of sessions)
      if (Math.random() > 0.25) {
        const fileChangeCount = randomInt(2, 8);
        for (let fc = 0; fc < fileChangeCount; fc++) {
          const associatedTurn = randomChoice(createdTurns);
          await prisma.fileChange.create({
            data: {
              sessionId: session.id,
              turnId: associatedTurn.id,
              filePath: randomChoice(FILE_PATHS),
              operation: randomChoice(OPERATIONS),
            },
          });
          totalFileChanges++;
        }
      }

      // Create session events: turn_duration
      for (let td = 0; td < turnCount; td++) {
        await prisma.sessionEvent.create({
          data: {
            sessionId: session.id,
            eventType: 'turn_duration',
            eventSubtype: null,
            eventData: JSON.stringify({ turn_index: td, duration_ms: randomInt(800, 15000) }),
            occurredAt: addMs(sessionStart, randomInt(10000, sessionDurationMinutes * 60 * 1000)),
          },
        });
        totalEvents++;
      }

      // Create session events: compact
      for (let ce = 0; ce < compactCount; ce++) {
        await prisma.sessionEvent.create({
          data: {
            sessionId: session.id,
            eventType: 'compact',
            eventSubtype: null,
            eventData: JSON.stringify({
              summary_length: randomInt(200, 800),
              tokens_before: randomInt(80000, 150000),
              tokens_after: randomInt(20000, 40000),
            }),
            occurredAt: addMs(sessionStart, randomInt(60000, sessionDurationMinutes * 60 * 1000)),
          },
        });
        totalEvents++;
      }

      // Create session events: error
      for (let ee = 0; ee < errorCount; ee++) {
        const errorSubtype = randomChoice(['tool_error', 'api_error', 'timeout']);
        await prisma.sessionEvent.create({
          data: {
            sessionId: session.id,
            eventType: 'error',
            eventSubtype: errorSubtype,
            eventData: JSON.stringify({
              message: randomChoice([
                'Tool execution failed: ENOENT',
                'API rate limit exceeded',
                'Request timeout after 30s',
                'Permission denied: /etc/passwd',
                'ECONNREFUSED: connection refused',
                'Heap out of memory',
              ]),
              tool: errorSubtype === 'tool_error' ? randomChoice(['Bash', 'Read', 'Write', 'Edit']) : undefined,
            }),
            occurredAt: addMs(sessionStart, randomInt(60000, sessionDurationMinutes * 60 * 1000)),
          },
        });
        totalEvents++;
      }

      // Occasionally add tool_error events
      if (Math.random() > 0.7) {
        await prisma.sessionEvent.create({
          data: {
            sessionId: session.id,
            eventType: 'tool_error',
            eventSubtype: 'non_zero_exit',
            eventData: JSON.stringify({
              tool: 'Bash',
              command: randomChoice(['npm test', 'npm run build', 'npx prisma db push', 'git push']),
              exit_code: randomChoice([1, 2, 127]),
            }),
            occurredAt: addMs(sessionStart, randomInt(60000, sessionDurationMinutes * 60 * 1000)),
          },
        });
        totalEvents++;
      }
    }
  }

  console.log('');
  console.log('  Seed summary:');
  console.log(`    Members:      ${createdMembers.length}`);
  console.log(`    Sessions:     ${totalSessions}`);
  console.log(`    Turns:        ${totalTurns}`);
  console.log(`    Tool uses:    ${totalToolUses}`);
  console.log(`    Subagents:    ${totalSubagents}`);
  console.log(`    File changes: ${totalFileChanges}`);
  console.log(`    Events:       ${totalEvents}`);
  console.log('');
  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
