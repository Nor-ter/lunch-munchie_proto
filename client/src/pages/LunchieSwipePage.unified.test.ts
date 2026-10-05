import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const swipeSource = readFileSync(join(import.meta.dirname, 'LunchieSwipePage.tsx'), 'utf8');
const introSource = swipeSource.slice(
  swipeSource.indexOf('{/* Intro overlay */}'),
  swipeSource.indexOf('{/* Card stack'),
);
const shareCardSource = readFileSync(join(import.meta.dirname, '..', 'components', 'lunchie', 'WinnerShareCard.tsx'), 'utf8');
const themeSource = readFileSync(join(import.meta.dirname, '..', 'contexts', 'ThemeContext.tsx'), 'utf8');

describe('unified Lunchie group flow', () => {
  it('uses the solo diagonal battle component for group finals', () => {
    expect(swipeSource).toContain('finalist1={finalistRs[0]}');
    expect(swipeSource).toContain('finalist2={finalistRs[1] ?? null}');
    expect(swipeSource).not.toContain('결승! 어디로 갈까요?');
  });

  it('uses the personalized chicken on waiting, result, and share surfaces', () => {
    expect(swipeSource).toContain('loadout={lunchmateLoadout}');
    expect(swipeSource).not.toContain('/assets/lunchie-wordmark.png');
    expect(shareCardSource).toContain('<LunchmateCharacterRenderer');
    expect(shareCardSource).not.toContain('src="/assets/lunchie-wordmark.png"');
  });

  it('keeps the Quick Match intro focused on loading status', () => {
    expect(introSource).toContain('role="status"');
    expect(introSource).toContain('aria-live="polite"');
    expect(introSource).toContain('Getting the Vote Ready!');
    expect(introSource).toContain('Other choices stay private');
    expect(introSource).not.toContain('Swipe gesture demo card');
    expect(introSource).not.toContain('NOPE');
    expect(introSource).not.toContain('LIKE');
    expect(introSource).not.toContain('<button');
  });

  it('builds the reject effect from staged glass fracture layers', () => {
    expect(swipeSource).toContain('primaryCrackOp');
    expect(swipeSource).toContain('branchCrackOp');
    expect(swipeSource).toContain('microCrackOp');
    expect(swipeSource).toContain('/assets/effects/cracking-glass.png');
    expect(swipeSource).toContain("mixBlendMode: 'screen'");
  });

  it('opens the shared restaurant details without coupling the action to a swipe', () => {
    expect(swipeSource).toContain("import QuickMatchRestaurantDetailSheet from '@/components/lunchie/QuickMatchRestaurantDetailSheet'");
    expect(swipeSource).not.toContain("import RestaurantDetailSheet from '@/components/munchie/RestaurantDetailSheet'");
    expect(swipeSource).toContain('aria-label={englishText(`${restaurant.name} View Details`)}');
    expect(swipeSource).toContain('onOpenRestaurantDetails(restaurant)');
    expect(swipeSource).toContain('lunchieQuickMatchDetail');
    expect(swipeSource).toContain('restaurant={detailRestaurant}');
    expect(swipeSource).toContain('onClose={closeRestaurantDetails}');
  });

  it('advertises a light-only browser color scheme', () => {
    expect(themeSource).toContain('only light');
  });

  it('locks private answers, shows only completion totals, and records slider satisfaction', () => {
    expect(swipeSource).toContain('ANSWERS LOCKED');
    expect(swipeSource).toContain('Individual choices stay private. Only total responses are shown.');
    expect(swipeSource).toContain('Names and individual choices stay private');
    expect(swipeSource).not.toContain('max-h-[190px] space-y-2 overflow-y-auto');
    expect(swipeSource).toContain("event_type: 'SURVEY'");
    expect(swipeSource).toContain("moment: 'shared_session_reveal'");
    expect(swipeSource).toContain('aria-label="Choice Satisfaction"');
    expect(swipeSource).toContain('satisfaction_score: satisfaction');
  });

  it('carries four actual game stages through solo and group sessions', () => {
    expect(swipeSource).toContain('ROUND 1 · PICK A TYPE');
    expect(swipeSource).toContain('Choose all the cuisines you like, then confirm.');
    expect(swipeSource).toContain('Choose multiple cuisines. Results appear after confirmation.');
    expect(swipeSource).toContain('aria-pressed={isSelected}');
    expect(swipeSource).toContain('ROUND 2 · RECOMMENDATION VOTE');
    expect(swipeSource).toContain('>Dislike</span>');
    expect(swipeSource).toContain('>Like</span>');
    expect(swipeSource).toContain("drag={!isRevealed && !interactionDisabled && !isSwipeCommitting}");
    expect(swipeSource).toContain('← Dislike · ↓ Neutral · Like →');
    expect(swipeSource).toContain("backgroundColor: '#DC2626'");
    expect(swipeSource).toContain("backgroundColor: '#FACC15'");
    expect(swipeSource).toContain("backgroundColor: '#16A34A'");
    expect(swipeSource).toContain("onClick={() => requestButtonSwipe('dislike')}");
    expect(swipeSource).toContain("onClick={() => requestButtonSwipe('neutral')}");
    expect(swipeSource).toContain("onClick={() => requestButtonSwipe('like')}");
    expect(swipeSource).toContain("commitSwipeWithAnimation(requestedSwipe.action, 'button')");
    expect(swipeSource).toContain("duration: source === 'button' ? 0.38 : 0.3");
    expect(swipeSource).toContain('lunchieButtonSwipePreview(action)');
    expect(swipeSource).toContain('requestedSwipe?.restaurantId === restaurant.id');
    expect(swipeSource).toContain("bg-[#FEE2E2] text-[#B91C1C]");
    expect(swipeSource).toContain("bg-[#FEF9C3] text-[#854D0E]");
    expect(swipeSource).toContain("bg-[#DCFCE7] text-[#15803D]");
    expect(swipeSource).toContain('SOLO LUNCH GAME');
    expect(swipeSource).toContain('SOLO SHOWDOWN');
    expect(swipeSource).toContain('SOLO WINNER!');
    expect(swipeSource).toContain('Top 2 Final Results');
  });

  it('reveals anonymous statistics after every game round', () => {
    expect(swipeSource).toContain('ROUND 1 RESULT');
    expect(swipeSource).toContain("Today's Cravings");
    expect(swipeSource).toContain('ROUND 2 RESULT');
    expect(swipeSource).toContain('Group Recommendation Results');
    expect(swipeSource).toContain('ROUND 3 RESULT');
    expect(swipeSource).toContain('Top 2 Final Votes');
    expect(swipeSource).toContain('ROUND 4 RESULT');
    expect(swipeSource).toContain('Average Satisfaction');
    expect(swipeSource).toContain('Anonymous responses');
  });

  it('separates decision satisfaction from anonymous after-meal star statistics', () => {
    expect(swipeSource).toContain('Rate your actual meal separately from your satisfaction with the choice.');
    expect(swipeSource).toContain('aria-label="Rate Your Meal"');
    expect(swipeSource).toContain("moment: 'after_meal'");
    expect(swipeSource).toContain('people visited');
    expect(swipeSource).toContain('mealRatingDistribution');
  });

  it('persists a solo final vote and completes the session before showing winner statistics', () => {
    expect(swipeSource).toContain('await completeSoloSessionChoice({');
    expect(swipeSource).toContain('const round = 2 * (currentSession.generation ?? 1);');
    expect(swipeSource).toContain('const byServerRank = (list: any[]) => [...list].sort((a, b) => a.id.localeCompare(b.id));');
    expect(swipeSource).toContain('setPhase(\'final-stats\');');
    expect(swipeSource.indexOf('await completeSoloSessionChoice({')).toBeLessThan(
      swipeSource.indexOf("setPhase('final-stats');", swipeSource.indexOf('await completeSoloSessionChoice({')),
    );
    expect(swipeSource).toContain('isSubmitting={isSubmittingFinalChoice}');
  });
});
