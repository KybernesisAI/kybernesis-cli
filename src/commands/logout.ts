import { clearTokens } from '../auth.js';

export async function logoutCommand(): Promise<void> {
  await clearTokens();
  process.stdout.write('Logged out. Stored credentials have been removed.\n');
}
