import type { LunchieCuisineId } from '@shared/lunchieRoundStats';

export type LunchieCuisineChoice = LunchieCuisineId;

export const LUNCHIE_CUISINE_CHOICES: ReadonlyArray<{
  id: LunchieCuisineChoice;
  label: string;
  hint: string;
  emoji: string;
  color: string;
}> = [
  { id: 'korean', label: '든든한 한식', hint: '밥 · 찌개 · 고기', emoji: '🍚', color: '#E64B55' },
  { id: 'asian', label: '아시안', hint: '면 · 딤섬 · 일식', emoji: '🍜', color: '#2474E5' },
  { id: 'western', label: '양식·브런치', hint: '파스타 · 카페 · 베이커리', emoji: '🍝', color: '#D39513' },
  { id: 'surprise', label: '오늘의 랜덤', hint: '추천 순서 그대로', emoji: '🎲', color: '#6545D8' },
] as const;

const CUISINE_KEYWORDS: Record<Exclude<LunchieCuisineChoice, 'surprise'>, string[]> = {
  korean: ['한식', 'korean', '치킨', 'bbq'],
  asian: ['아시안', 'asian', '일식', 'japanese', '중식', 'chinese', '타이', 'thai', '베트남', 'vietnam', '딤섬', '라멘'],
  western: ['양식', 'western', '이탈리', 'italian', '파스타', 'pizza', '피자', '브런치', 'brunch', '카페', 'cafe', 'coffee', '베이커리', 'bakery', '스테이크', 'burger'],
};

export function prioritizeRestaurantsForCuisine<T extends { category?: string | null }>(
  restaurants: readonly T[],
  choices: readonly LunchieCuisineChoice[],
): T[] {
  const selected = choices.filter((choice): choice is Exclude<LunchieCuisineChoice, 'surprise'> => choice !== 'surprise');
  if (selected.length === 0 || choices.includes('surprise')) return [...restaurants];
  const keywords = selected.flatMap(choice => CUISINE_KEYWORDS[choice]);
  const matches: T[] = [];
  const rest: T[] = [];

  for (const restaurant of restaurants) {
    const category = (restaurant.category ?? '').toLocaleLowerCase();
    (keywords.some(keyword => category.includes(keyword)) ? matches : rest).push(restaurant);
  }

  return [...matches, ...rest];
}
