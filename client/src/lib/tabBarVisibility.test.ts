import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { shouldShowTabBar } from './tabBarVisibility';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../index.css', import.meta.url), 'utf8');

describe('tab bar visibility', () => {
  it('keeps navigation visible throughout the Lunchie flow', () => {
    expect(shouldShowTabBar('/lunchie/settings')).toBe(true);
    expect(shouldShowTabBar('/session/lobby')).toBe(true);
    expect(shouldShowTabBar('/lunchie/swipe')).toBe(true);
    expect(shouldShowTabBar('/lunchie/results')).toBe(true);
    expect(shouldShowTabBar('/lunchie/results/restaurant-1')).toBe(true);
    expect(shouldShowTabBar('/lunchie/map')).toBe(true);
  });

  it('preserves focused routes that intentionally hide navigation', () => {
    expect(shouldShowTabBar('/auth/login')).toBe(false);
    expect(shouldShowTabBar('/onboarding')).toBe(false);
    expect(shouldShowTabBar('/join/ABC123')).toBe(false);
  });

  it('reserves the tab bar viewport whenever navigation is rendered', () => {
    expect(appSource).toContain('<SlideTransitionRoutes reserveTabBar={showTabBar}>');
    expect(appSource).toContain('{showTabBar && <TabBar />}');
    expect(cssSource).toMatch(/\.app-content-with-tab-bar\s*\{[\s\S]{0,160}padding-bottom: 0/);
  });
});
