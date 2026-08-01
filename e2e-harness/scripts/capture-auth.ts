import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { harnessConfig } from '../config';

// Direct Google OAuth cannot be automated with stored credentials. This captures a
// user-completed browser session for a local E2E run; the state file is gitignored.
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(`${harnessConfig.baseUrl}/profile`);
console.log('Complete Google login in the opened browser, then press Enter here.');
await new Promise<void>(resolve => process.stdin.once('data', () => resolve()));
mkdirSync(dirname(harnessConfig.storageStatePath), { recursive: true });
await context.storageState({ path: harnessConfig.storageStatePath });
await browser.close();
console.log(`Saved local E2E storage state: ${harnessConfig.storageStatePath}`);
