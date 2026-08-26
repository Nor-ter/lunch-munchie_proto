import { describe, expect, it } from 'vitest';
import { resolveInviteOrigin } from './SessionLobbyPage';

describe('resolveInviteOrigin', () => {
  it('opens invite links through the Pages dev port when launched from Vite on a LAN host', () => {
    expect(resolveInviteOrigin(undefined, 'http://10.132.88.194:5173')).toBe('http://10.132.88.194:8788');
  });

  it('keeps an explicit configured invite origin ahead of the browser origin', () => {
    expect(resolveInviteOrigin('http://10.132.88.194:8788', 'http://10.132.88.194:5173')).toBe('http://10.132.88.194:8788');
  });

  it('normalizes an accidentally configured Vite port for QR invite links', () => {
    expect(resolveInviteOrigin('http://10.132.88.194:5173', 'http://10.132.88.194:5173')).toBe('http://10.132.88.194:8788');
  });

  it('leaves non-Vite browser origins unchanged', () => {
    expect(resolveInviteOrigin(undefined, 'https://lunchie.example.com')).toBe('https://lunchie.example.com');
  });
});
