import type { User } from '@/types/db';

// 서버 계정이 아닌 샘플 피드 작성자도 눌렀을 때 멈추지 않도록 공개 프로필을 둔다.
// 이들은 팔로우/개인 데이터 대상이 아닌 데모 콘텐츠 작성자다.
export const DEMO_AUTHORS: Record<string, User> = {
  demo_jimin: { id: 'demo_jimin', username: '지민', profile_image_url: null, bio: 'Always thinking about the next good lunch.', location: 'Melbourne', created_at: '2026-07-01T00:00:00.000Z' },
  demo_jenny: { id: 'demo_jenny', username: '제니', profile_image_url: null, bio: 'Here for cafés and desserts.', location: 'Melbourne', created_at: '2026-07-01T00:00:00.000Z' },
  demo_minsu: { id: 'demo_minsu', username: '민수', profile_image_url: null, bio: 'Weekends are for brunch.', location: 'Melbourne', created_at: '2026-07-01T00:00:00.000Z' },
  demo_haneul: { id: 'demo_haneul', username: '하늘', profile_image_url: null, bio: 'Sharing neighbourhood favourites.', location: 'Melbourne', created_at: '2026-07-01T00:00:00.000Z' },
  demo_doyun: { id: 'demo_doyun', username: '도윤', profile_image_url: null, bio: 'Good food and an after-work drink.', location: 'Melbourne', created_at: '2026-07-01T00:00:00.000Z' },
  demo_seoa: { id: 'demo_seoa', username: '서아', profile_image_url: null, bio: 'Good food, better memories.', location: 'Melbourne', created_at: '2026-07-01T00:00:00.000Z' },
};

const idByName: Record<string, string> = {
  지민: 'demo_jimin', 제니: 'demo_jenny', 민수: 'demo_minsu', 하늘: 'demo_haneul', 도윤: 'demo_doyun', 서아: 'demo_seoa',
};

export const demoAuthorIdFor = (name: string) => idByName[name];
