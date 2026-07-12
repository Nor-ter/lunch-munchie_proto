/** 코스맵 작성자 표시 이름 (프로토타입 mock) — creatorId → 이름 */
export const CREATOR_NAMES: Record<string, string> = { user1: 'Jenny', user2: 'Mia', user3: 'Sooa' };

export function getCreatorName(creatorId: string): string {
  return CREATOR_NAMES[creatorId] ?? 'Jenny';
}
