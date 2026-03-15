import { search } from '../api.js';

export async function searchCommand(query: string, flags: Record<string, string>): Promise<void> {
  if (!query.trim()) {
    process.stderr.write('Usage: kybernesis search <query>\n');
    process.exitCode = 1;
    return;
  }

  const limit = flags.limit ? parseInt(flags.limit, 10) : 10;
  const results = await search(query, limit);

  if (results.length === 0) {
    process.stdout.write('No memories found.\n');
    return;
  }

  process.stdout.write(`Found ${results.length} memor${results.length === 1 ? 'y' : 'ies'}:\n\n`);

  for (const memory of results) {
    process.stdout.write(`  ${memory.id}\n`);
    process.stdout.write(`  ${memory.title}\n`);
    if (memory.summary) {
      process.stdout.write(`  ${memory.summary.slice(0, 120)}\n`);
    }
    if (memory.tags?.length) {
      process.stdout.write(`  tags: ${memory.tags.join(', ')}\n`);
    }
    process.stdout.write(`  ${memory.layer} | ${memory.source} | ${memory.createdAt}\n`);
    process.stdout.write('\n');
  }
}
