import type { User } from '@/types/db';

// 서버 계정이 아닌 샘플 피드 작성자도 눌렀을 때 멈추지 않도록 공개 프로필을 둔다.
// 이들은 팔로우/개인 데이터 대상이 아닌 데모 콘텐츠 작성자다.
export const DEMO_AUTHORS: Record<string, User> = {
  demo_jimin: { id: 'demo_jimin', username: "Jimin", profile_image_url: null, bio: "Capturing today's meal.", location: 'Melbourne', created_at: '2026-07-01T00:00:00.000Z' },
  demo_jenny: { id: 'demo_jenny', username: "Jenny", profile_image_url: null, bio: "A fan of cafes and desserts.", location: 'Melbourne', created_at: '2026-07-01T00:00:00.000Z' },
  demo_minsu: { id: 'demo_minsu', username: "Minsu", profile_image_url: null, bio: "Always looking for weekend brunch.", location: 'Melbourne', created_at: '2026-07-01T00:00:00.000Z' },
  demo_haneul: { id: 'demo_haneul', username: "Haneul", profile_image_url: null, bio: "Sharing neighborhood food spots.", location: 'Melbourne', created_at: '2026-07-01T00:00:00.000Z' },
  demo_doyun: { id: 'demo_doyun', username: "Doyun", profile_image_url: null, bio: "A fan of after-work drinks.", location: 'Melbourne', created_at: '2026-07-01T00:00:00.000Z' },
  demo_seoa: { id: 'demo_seoa', username: "Seoa", profile_image_url: null, bio: "Collecting delicious moments.", location: 'Melbourne', created_at: '2026-07-01T00:00:00.000Z' },
};

const idByName: Record<string, string> = {
  지민: 'demo_jimin', 제니: 'demo_jenny', 민수: 'demo_minsu', 하늘: 'demo_haneul', 도윤: 'demo_doyun', 서아: 'demo_seoa',
};

export const demoAuthorIdFor = (name: string) => idByName[name];
