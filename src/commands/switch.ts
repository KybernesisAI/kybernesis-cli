import { clearTokens } from '../auth.js';
import { loginCommand } from './login.js';

export async function switchCommand(): Promise<void> {
  process.stdout.write('Switching workspace — clearing current session...\n');
  await clearTokens();
  await loginCommand();
}
