import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Runs after `pnpm install`. Hooks are versioned in the repository rather than
// copied into .git, so every developer and worktree receives the same gate.
if (!existsSync('.git')) {
  console.log('[hooks] No Git directory found; skipping hook installation.');
  process.exit(0);
}

execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'inherit' });
console.log('[hooks] Git hooks enabled from .githooks/.');
