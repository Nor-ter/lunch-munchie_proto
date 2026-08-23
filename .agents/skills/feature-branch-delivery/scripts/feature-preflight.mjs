#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const target = process.argv[2] || 'main';
const git = (args, fallback = '') => { try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return fallback; } };
const root = git(['rev-parse', '--show-toplevel']);
if (!root) { console.error('FAIL  Run inside a Git repository.'); process.exit(1); }
const current = git(['branch', '--show-current']);
const targetSha = git(['rev-parse', '--verify', target]);
const status = git(['status', '--short']);
console.log(`Repository: ${root}`);
console.log(`Current: ${current || '(detached HEAD)'}`);
console.log(`Target: ${target}${targetSha ? ` (${targetSha.slice(0, 12)})` : ' (MISSING)'}`);
console.log(`Worktree: ${status ? 'DIRTY' : 'clean'}`);
console.log(`Unique commits:\n${current && targetSha ? git(['log', '--oneline', `${target}..HEAD`]) || '(none)' : '(unavailable)'}`);
console.log(`\nBranches:\n${git(['for-each-ref', '--format=%(refname:short)  %(subject)', 'refs/heads'])}`);
console.log('\nSAFE  Read-only: no fetch, checkout, branch, merge, or commit.');
if (!targetSha) process.exitCode = 1;
