#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const target = process.argv[2] || 'main';
const git = (args, fallback = '') => { try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return fallback; } };
const current = git(['branch', '--show-current']);
if (!current || !git(['rev-parse', '--verify', target])) { console.error(`FAIL  Require a current branch and target '${target}'.`); process.exit(1); }
const status = git(['status', '--short']);
const changed = git(['diff', '--name-status', `${target}...HEAD`]);
const files = changed ? changed.split('\n').map((line) => line.split('\t').at(-1)) : [];
const migrations = files.filter((file) => /(^|\/)(migrations|migration)\//i.test(file));
const secretLike = files.filter((file) => /(^|\/)(\.dev\.vars|\.env($|\.)|.*secret.*)/i.test(file));
console.log(`Branch: ${current} -> ${target}`);
console.log(`Worktree: ${status ? 'DIRTY' : 'clean'}`);
console.log(`Changed files: ${files.length}`);
console.log(`Migrations: ${migrations.join(', ') || 'none'}`);
console.log(`Secret-like paths: ${secretLike.join(', ') || 'none'}`);
if (changed) console.log(`\n${changed}`);
if (secretLike.length) { console.error('\nFAIL  Remove secret-like paths before opening a PR.'); process.exitCode = 1; }
console.log('\nNEXT  Confirm manifest, tests, CI, review, and deployment/rollback notes; use $merge-branches-safely for the merge.');
