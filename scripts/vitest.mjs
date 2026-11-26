// Runs `vitest run` with the drive letter of the working directory upper-cased.
// On Windows, a terminal opened at "c:\..." (lowercase, as VS Code does) makes Vitest load two
// copies of itself and fail with "failed to find the current suite".
import { spawnSync } from 'node:child_process';

const cwd = process.cwd().replace(/^[a-z]:/, (d) => d.toUpperCase());
const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...process.argv.slice(2)], {
  cwd,
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
