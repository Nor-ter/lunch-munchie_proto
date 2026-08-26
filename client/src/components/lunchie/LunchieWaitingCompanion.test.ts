import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const companionSource = readFileSync(join(import.meta.dirname, 'LunchieWaitingCompanion.tsx'), 'utf8');
const appSource = readFileSync(join(import.meta.dirname, '..', '..', 'App.tsx'), 'utf8');
const swipeSource = readFileSync(join(import.meta.dirname, '..', '..', 'pages', 'LunchieSwipePage.tsx'), 'utf8');

describe('Lunchie waiting companion', () => {
  it('is mounted globally but activated only for the exact current session', () => {
    expect(appSource).toContain('<LunchieWaitingCompanion />');
    expect(companionSource).toContain('activeSessionId === currentSession.id');
    expect(companionSource).toContain("location !== '/lunchie/swipe'");
    expect(companionSource).toContain("phase !== 'PRELIM' || me?.completed");
  });

  it('observes results without mutating session or vote data', () => {
    expect(companionSource).toContain('/results`');
    expect(companionSource).not.toContain("method: 'POST'");
    expect(companionSource).not.toContain('setCurrentSession');
  });

  it('alerts for the final and returns to the existing vote page', () => {
    expect(companionSource).toContain('결승전 투표가 열렸어요!');
    expect(companionSource).toContain("navigate('/lunchie/swipe')");
    expect(companionSource).toContain("chickenAssetKeyOverride={isHappy || hasFinalOutcome ? 'happy' : needsFinalVote ? 'surprised' : 'idle'}");
  });

  it('keeps the companion visible when the result arrives and returns to the result flow', () => {
    expect(companionSource).toContain("const hasFinalOutcome = phase === 'DONE' || phase === 'NO_CONSENSUS'");
    expect(companionSource).toContain('Lunchie 결과가 나왔어요!');
    expect(companionSource).toContain('눌러서 결과를 확인해요');
    expect(companionSource).toContain('if (hasFinalOutcome || needsFinalVote || isReroll)');
    expect(companionSource).not.toContain("if (data.phase === 'DONE' || data.phase === 'NO_CONSENSUS') clearLunchieWaitingCompanion()");
  });

  it('can be launched from the group waiting screen', () => {
    expect(swipeSource).toContain('activateLunchieWaitingCompanion(currentSession.id)');
    expect(swipeSource).toContain('기다리는 동안 먼치피드 같이 둘러봐요');
  });
});
