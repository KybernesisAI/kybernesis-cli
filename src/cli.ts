#!/usr/bin/env node

import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { statusCommand } from './commands/status.js';
import { searchCommand } from './commands/search.js';
import { saveCommand } from './commands/save.js';
import { listCommand } from './commands/list.js';
import { deleteCommand } from './commands/delete.js';
import { statsCommand } from './commands/stats.js';
import { switchCommand } from './commands/switch.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')).version;

function printHelp(): void {
  process.stdout.write(`
kybernesis v${VERSION} — CLI for your Kybernesis memory workspace

Usage: kybernesis <command> [options]

Commands:
  login                 Authenticate via browser (OAuth)
  logout                Clear stored credentials
  status                Show current auth & workspace info
  search <query>        Search your memories
  save <content>        Save a new memory
    --title <title>       Memory title
    --tags <t1,t2>        Comma-separated tags
  list                  List recent memories
    --limit <n>           Number of results (default: 20)
    --offset <n>          Skip first n results
  delete <memoryId>     Delete a memory (with confirmation)
  stats                 Show memory statistics
  switch                Re-authenticate to a different workspace
  help                  Show this help message
  version               Show version

Examples:
  kybernesis login
  kybernesis search "react patterns"
  kybernesis save "We use Zustand for state" --tags react,state --title "State management"
  kybernesis list --limit 50
  kybernesis stats

`);
}

function parseArgs(args: string[]): { flags: Record<string, string>; positional: string[] } {
  const flags: Record<string, string> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--') && i + 1 < args.length) {
      flags[arg.slice(2)] = args[++i];
    } else if (arg === '-y') {
      flags['yes'] = 'true';
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'version' || command === '--version' || command === '-v') {
    process.stdout.write(`kybernesis v${VERSION}\n`);
    return;
  }

  const { flags, positional } = parseArgs(rest);

  try {
    switch (command) {
      case 'login':
        await loginCommand();
        break;
      case 'logout':
        await logoutCommand();
        break;
      case 'status':
        await statusCommand();
        break;
      case 'search':
        await searchCommand(positional.join(' '), flags);
        break;
      case 'save':
        await saveCommand(positional.join(' '), flags);
        break;
      case 'list':
        await listCommand(flags);
        break;
      case 'delete':
        await deleteCommand(positional[0], flags);
        break;
      case 'stats':
        await statsCommand();
        break;
      case 'switch':
        await switchCommand();
        break;
      default:
        process.stderr.write(`Unknown command: ${command}\n`);
        process.stderr.write(`Run "kybernesis help" for usage.\n`);
        process.exitCode = 1;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${message}\n`);
    process.exitCode = 1;
  }
}

main();
