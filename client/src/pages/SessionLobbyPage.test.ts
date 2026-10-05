import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveInviteOrigin } from './SessionLobbyPage';

const lobbySource = readFileSync(new URL('./SessionLobbyPage.tsx', import.meta.url), 'utf8');

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

  it('explains the independent-choice shared reveal before a group starts', () => {
    expect(lobbySource).toContain('PRIVATE PICK');
    expect(lobbySource).toContain('NO LIVE SCORE');
    expect(lobbySource).toContain('GROUP REVEAL');
  });

  it('keeps every lobby inviteable and explains that starting alone becomes solo', () => {
    expect(lobbySource).toContain('Anyone with this link can join before you start. Start now to play solo.');
    expect(lobbySource).toContain("presentation.memberCount === 1 ? 'person' : 'people'");
    expect(lobbySource).not.toContain('This Is a Solo Lunchie');
    expect(lobbySource).not.toContain('Solo sessions don\'t support invitations');
    expect(lobbySource).not.toContain('{presentation.memberCount}/{presentation.capacity}');
  });

  it('keeps the voting action visible above the persistent navigation without scrolling', () => {
    expect(lobbySource).toContain('flex-1 pb-28');
    expect(lobbySource).toContain('createPortal(<footer');
    expect(lobbySource).toContain('fixed bottom-[var(--lm-tab-bar-height)]');
    expect(lobbySource).toContain('border-t border-[#E8E6E7] bg-white px-5 py-4');
    expect(lobbySource).toContain('className="lunchie-session-primary-action"');
  });

  it('uses one inline recovery action when no restaurants match', () => {
    expect(lobbySource).toContain("failure.code !== 'NO_ELIGIBLE_RESTAURANTS'");
    expect(lobbySource).toContain("startFailure?.code !== 'NO_ELIGIBLE_RESTAURANTS'");
    expect(lobbySource).toContain('Adjust Radius & Preferences');
  });
});
