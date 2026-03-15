import { createInterface } from 'node:readline';
import { deleteMemory } from '../api.js';

async function confirm(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    rl.question(`${prompt} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export async function deleteCommand(memoryId: string | undefined, flags: Record<string, string>): Promise<void> {
  if (!memoryId) {
    process.stderr.write('Usage: kybernesis delete <memoryId>\n');
    process.exitCode = 1;
    return;
  }

  if (flags.yes !== 'true') {
    const proceed = await confirm(`Delete memory ${memoryId}?`);
    if (!proceed) {
      process.stdout.write('Cancelled.\n');
      return;
    }
  }

  const result = await deleteMemory(memoryId);

  if (result.deleted) {
    process.stdout.write(`Deleted memory ${memoryId}\n`);
  } else {
    process.stderr.write(`Memory ${memoryId} not found or could not be deleted.\n`);
    process.exitCode = 1;
  }
}
