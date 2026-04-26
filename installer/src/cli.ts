#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { runInstall } from './commands/install.js';
import { runUninstall } from './commands/uninstall.js';
import { runDoctor } from './commands/doctor.js';
import {
  runConfigList,
  runConfigGet,
  runConfigSet,
  runConfigMigrate,
  type ConfigOptions,
} from './commands/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PackageJson {
  version: string;
}

function readPackageVersion(): string {
  const pkgPath = resolve(__dirname, '..', 'package.json');
  const raw = readFileSync(pkgPath, 'utf8');
  const parsed = JSON.parse(raw) as PackageJson;
  return parsed.version;
}

const program = new Command();

program
  .name('aidd-tracker')
  .description('Claude Code Activity Tracker - hook installer')
  .version(readPackageVersion());

program
  .command('install')
  .description('Install Claude Code hooks')
  .option('--api-url <url>', 'API server URL')
  .option('--api-key <key>', 'API key')
  .option('--email <email>', 'Claude account email')
  .option('--scope <scope>', 'user or project (default: user)')
  .option('--force', 'Overwrite without prompting')
  .option('--no-healthcheck', 'Skip API connectivity check')
  .option('--dry-run', 'Show plan without executing')
  .action(async (cmdOpts) => {
    try {
      await runInstall(cmdOpts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[error] ${message}`);
      process.exitCode = 1;
    }
  });

program
  .command('uninstall')
  .description('Uninstall Claude Code hooks')
  .option('--scope <scope>', 'user or project (default: user)')
  .option('--yes', 'Skip confirmation prompt')
  .option('--purge', 'Also delete config.json')
  .option('--restore-backup', 'Restore settings.json from latest backup instead of stripping')
  .action(async (cmdOpts) => {
    try {
      await runUninstall(cmdOpts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[error] ${message}`);
      process.exitCode = 1;
    }
  });

program
  .command('doctor')
  .description('Check hook health')
  .option('--scope <scope>', 'user or project (default: user)')
  .action(async (cmdOpts) => {
    try {
      const code = await runDoctor(cmdOpts);
      process.exitCode = code;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[error] ${message}`);
      process.exitCode = 2;
    }
  });

const configCmd = program
  .command('config')
  .description('Manage hook configuration');

configCmd
  .command('list')
  .description('Show current config (api_key masked)')
  .option('--scope <scope>', 'user or project')
  .action(async (cmdOpts: ConfigOptions) => {
    try {
      await runConfigList(cmdOpts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[error] ${message}`);
      process.exitCode = 1;
    }
  });

configCmd
  .command('get <key>')
  .description('Get a single config value (api_key masked)')
  .option('--scope <scope>', 'user or project')
  .action(async (key: string, cmdOpts: ConfigOptions) => {
    try {
      await runConfigGet(key, cmdOpts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[error] ${message}`);
      process.exitCode = 1;
    }
  });

configCmd
  .command('set <key> <value>')
  .description('Update a config value (api_url | api_key | claude_email)')
  .option('--scope <scope>', 'user or project')
  .action(async (key: string, value: string, cmdOpts: ConfigOptions) => {
    try {
      await runConfigSet(key, value, cmdOpts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[error] ${message}`);
      process.exitCode = 1;
    }
  });

configCmd
  .command('migrate')
  .description('Migrate config schema from older format')
  .option('--scope <scope>', 'user or project')
  .action(async (cmdOpts: ConfigOptions) => {
    try {
      await runConfigMigrate(cmdOpts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[error] ${message}`);
      process.exitCode = 1;
    }
  });

program.parse();
