import { save } from '../api.js';

export async function saveCommand(content: string, flags: Record<string, string>): Promise<void> {
  if (!content.trim()) {
    process.stderr.write('Usage: kybernesis save <content> [--title <title>] [--tags <t1,t2>]\n');
    process.exitCode = 1;
    return;
  }

  const tags = flags.tags ? flags.tags.split(',').map((t) => t.trim()) : undefined;

  const memory = await save(content, {
    title: flags.title,
    tags,
  });

  process.stdout.write(`Memory saved: ${memory.id}\n`);
  if (memory.title) {
    process.stdout.write(`  Title: ${memory.title}\n`);
  }
  if (memory.tags?.length) {
    process.stdout.write(`  Tags:  ${memory.tags.join(', ')}\n`);
  }
}
