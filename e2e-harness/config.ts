import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type HarnessConfig = {
  baseUrl: string;
  storageStatePath: string;
};

const root = resolve(import.meta.dirname, '..');

function source(): string {
  if (process.env.E2E_CONFIG_JSON) return process.env.E2E_CONFIG_JSON;
  const file = process.env.E2E_CONFIG_FILE
    ?? resolve(root, 'config/e2e.config.local.json');
  if (!existsSync(file)) {
    throw new Error('E2E config is required. Copy config/e2e.config.example.json to config/e2e.config.local.json; never commit credentials or a captured session.');
  }
  return readFileSync(file, 'utf8');
}

function load(): HarnessConfig {
  const value = JSON.parse(source()) as Partial<HarnessConfig>;
  if (!value.baseUrl || !/^https?:\/\//.test(value.baseUrl)) throw new Error('E2E config requires an absolute baseUrl.');
  return {
    baseUrl: value.baseUrl.replace(/\/$/, ''),
    storageStatePath: resolve(root, value.storageStatePath || '.e2e/lunchie-auth.json'),
  };
}

export const harnessConfig = load();
export const isCI = Boolean(process.env.CI);
