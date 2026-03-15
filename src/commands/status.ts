import { loadTokens } from '../auth.js';
import { validate } from '../api.js';

export async function statusCommand(): Promise<void> {
  const tokens = await loadTokens();

  if (!tokens) {
    process.stdout.write('Not logged in. Run `kybernesis login` to authenticate.\n');
    return;
  }

  process.stdout.write(`Workspace:  ${tokens.workspace || tokens.orgId}\n`);
  process.stdout.write(`User:       ${tokens.userId}\n`);
  process.stdout.write(`Org ID:     ${tokens.orgId}\n`);

  const expiresIn = tokens.expiresAt - Date.now();
  if (expiresIn > 0) {
    const minutes = Math.floor(expiresIn / 60000);
    process.stdout.write(`Token:      valid (expires in ${minutes}m)\n`);
  } else {
    process.stdout.write(`Token:      expired (will auto-refresh on next command)\n`);
  }

  // Verify token is actually valid server-side
  try {
    const info = await validate();
    process.stdout.write(`Server:     connected (scopes: ${info.scopes.join(', ')})\n`);
  } catch {
    process.stdout.write(`Server:     unable to validate token\n`);
  }
}
