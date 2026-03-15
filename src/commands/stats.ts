import { stats } from '../api.js';

export async function statsCommand(): Promise<void> {
  const s = await stats();

  process.stdout.write(`Memory Statistics\n`);
  process.stdout.write(`─────────────────\n`);
  process.stdout.write(`Total memories:     ${s.total}\n`);
  process.stdout.write(`Recently accessed:  ${s.recentlyAccessed}\n\n`);
  process.stdout.write(`By Tier:\n`);
  process.stdout.write(`  Hot:     ${s.byTier.hot}\n`);
  process.stdout.write(`  Warm:    ${s.byTier.warm}\n`);
  process.stdout.write(`  Archive: ${s.byTier.archive}\n\n`);
  process.stdout.write(`By Source:\n`);
  process.stdout.write(`  Upload:    ${s.bySource.upload}\n`);
  process.stdout.write(`  Chat:      ${s.bySource.chat}\n`);
  process.stdout.write(`  Connector: ${s.bySource.connector}\n`);
}
