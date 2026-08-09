import { describe, expect, it } from 'vitest';
import { configuredAdminEmails, isAdminEmail } from './adminAccess';
import { onRequest } from './[[path]]';

describe('administrator allowlist', () => {
  it('normalizes a comma-separated secret without allowing unconfigured users', () => {
    const configured = ' Owner@Example.com , admin@example.com , invalid ';
    expect([...configuredAdminEmails(configured)]).toEqual(['owner@example.com', 'admin@example.com']);
    expect(isAdminEmail('owner@example.com', configured)).toBe(true);
    expect(isAdminEmail('member@example.com', configured)).toBe(false);
    expect(isAdminEmail(undefined, configured)).toBe(false);
  });
});

describe('admin metrics boundary', () => {
  const request = (pathname: string) => onRequest({
    request: new Request(`https://example.test${pathname}`),
    env: { AUTH_SESSION_SECRET: 'test-secret' },
  } as any);

  it('does not expose operational aggregates to an anonymous request', async () => {
    expect((await request('/api/admin/metrics')).status).toBe(401);
    expect((await request('/api/metrics')).status).toBe(410);
  });
});
