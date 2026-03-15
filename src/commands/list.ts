import { list } from '../api.js';

export async function listCommand(flags: Record<string, string>): Promise<void> {
  const limit = flags.limit ? parseInt(flags.limit, 10) : 20;
  const offset = flags.offset ? parseInt(flags.offset, 10) : 0;

  const results = await list(limit, offset);

  if (results.length === 0) {
    process.stdout.write('No memories found.\n');
    return;
  }

  process.stdout.write(`Showing ${results.length} memor${results.length === 1 ? 'y' : 'ies'}${offset > 0 ? ` (offset ${offset})` : ''}:\n\n`);

  for (const memory of results) {
    const tags = memory.tags?.length ? ` [${memory.tags.join(', ')}]` : '';
    process.stdout.write(`  ${memory.id}  ${memory.title}${tags}\n`);
    process.stdout.write(`    ${memory.layer} | ${memory.source} | ${memory.createdAt}\n`);
  }
}
