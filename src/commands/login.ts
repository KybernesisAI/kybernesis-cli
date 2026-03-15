import { login } from '../auth.js';

export async function loginCommand(): Promise<void> {
  const tokens = await login();

  process.stdout.write(`\nLogged in successfully!\n`);
  process.stdout.write(`  Workspace: ${tokens.workspace || tokens.orgId}\n`);
  process.stdout.write(`  User:      ${tokens.userId}\n`);
  process.stdout.write(`  Org:       ${tokens.orgId}\n\n`);
}
