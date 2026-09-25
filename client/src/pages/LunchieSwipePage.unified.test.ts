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

  it('keeps the Quick Match intro focused on the personalized Lunchmate and loading status', () => {
    expect(introSource).toContain('role="status"');
    expect(introSource).toContain('aria-live="polite"');
    expect(introSource).toContain('artwork="chicken"');
    expect(introSource).toContain('chickenFaceSystem');
    expect(introSource).toContain('loadout={lunchmateLoadout}');
    expect(introSource).toContain('추천 투표를 준비 중!');
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
    expect(swipeSource).toContain('aria-label={`${restaurant.name} 식당 상세보기`}');
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
    expect(swipeSource).toContain('다른 사람의 답은 아직 비밀');
    expect(swipeSource).toContain('누가 무엇을 골랐는지, 몇 장을 골랐는지는 보여주지 않아요.');
    expect(swipeSource).not.toContain('max-h-[190px] space-y-2 overflow-y-auto');
    expect(swipeSource).toContain("event_type: 'SURVEY'");
    expect(swipeSource).toContain("moment: 'shared_session_reveal'");
    expect(swipeSource).toContain('aria-label="결과 만족도"');
    expect(swipeSource).toContain('satisfaction_score: satisfaction');
  });

  it('carries four actual game stages through solo and group sessions', () => {
    expect(swipeSource).toContain('ROUND 1 · PICK A TYPE');
    expect(swipeSource).toContain('음식 종류 복수 선택');
    expect(swipeSource).toContain('끌리는 종류를 모두 고른 뒤 선택을 확정해요.');
    expect(swipeSource).toContain('aria-pressed={isSelected}');
    expect(swipeSource).toContain('ROUND 2 · YES OR NO');
    expect(swipeSource).toContain('비추천이에요');
    expect(swipeSource).toContain('추천해요');
    expect(swipeSource).toContain('drag={false}');
    expect(swipeSource).toContain('SOLO LUNCH GAME');
    expect(swipeSource).toContain('SOLO SHOWDOWN');
    expect(swipeSource).toContain('SOLO WINNER!');
    expect(swipeSource).toContain('내가 고른 TOP 2');
  });

  it('reveals anonymous statistics after every game round', () => {
    expect(swipeSource).toContain('ROUND 1 RESULT');
    expect(swipeSource).toContain('오늘의 입맛 분포');
    expect(swipeSource).toContain('ROUND 2 RESULT');
    expect(swipeSource).toContain('그룹 추천 투표 결과');
    expect(swipeSource).toContain('ROUND 3 RESULT');
    expect(swipeSource).toContain('TOP 2 최종 득표');
    expect(swipeSource).toContain('ROUND 4 RESULT');
    expect(swipeSource).toContain('전체 만족도 평균');
    expect(swipeSource).toContain('익명 집계');
  });

  it('separates decision satisfaction from anonymous after-meal star statistics', () => {
    expect(swipeSource).toContain('결정 만족도와 별개로, 실제 식사 경험을 별점으로 남겨주세요.');
    expect(swipeSource).toContain('aria-label="식사 후 별점 선택"');
    expect(swipeSource).toContain("moment: 'after_meal'");
    expect(swipeSource).toContain('명이 다녀왔어요');
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
