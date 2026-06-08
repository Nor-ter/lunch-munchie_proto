/**
 * Lunchie Munchie — App Context
 * Design: Soft Coral (Option 8)
 * Manages: courses, restaurants, sessions, profile, swipe data
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TagType = '데이트 코스' | '맛집' | '카페' | '전시/문화' | '액티비티' | '혼자 여행' | '맛집 투어' | '가성비';

export interface Restaurant {
  id: string;
  name: string;
  category: string;
  tags: TagType[];
  rating: number;
  reviewCount: number;
  distance: string;
  address: string;
  image: string;
  lat: number;
  lng: number;
  priceRange: 1 | 2 | 3 | 4;
  openHours: string;
  dietary: string[];
  description: string;
}

export interface CourseStop {
  placeId: string;
  order: number;
  startTime: string;
  endTime: string;
  isBookmarked: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  heroImage: string;
  tags: TagType[];
  hashtags: string[];
  region: string;
  metadata: {
    distance: number;
    duration: number;
    placeCount: number;
  };
  stops: CourseStop[];
  createdAt: string;
  isPublic: boolean;
  creatorId: string;
  savedCount: number;
}

export interface GroupSession {
  id: string;
  name: string;
  inviteCode: string;
  hostId: string;
  members: SessionMember[];
  filters: {
    partySize: number;
    dietary: string[];
    budget: 1 | 2 | 3 | 4;
    radius: number;
    categories: string[];
  };
  deadline: string | null;
  status: 'waiting' | 'voting' | 'completed';
  restaurants: Restaurant[];
  results: { restaurantId: string; score: number }[];
}

export interface SessionMember {
  id: string;
  name: string;
  emoji: string;
  hasVoted: boolean;
  preferences: { categoryId: string; score: number }[];
  ready?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  emoji: string;
  dietary: string[];
  categoryPrefs: { category: string; score: number; rank: number }[];
  totalSwipes: number;
  totalLikes: number;
  joinedAt: string;
}

export interface SwipeRecord {
  restaurantId: string;
  action: 'like' | 'save' | 'skip';
  timestamp: string;
  sessionId?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: 'r1', name: '카페 레이아웃', category: '카페',
    tags: ['데이트 코스', '카페'], rating: 4.8, reviewCount: 2341,
    distance: '350m', address: '서울 성동구 성수이로7길 26',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80',
    lat: 37.5447, lng: 127.0561, priceRange: 2, openHours: '09:00–22:00',
    dietary: ['비건 옵션'], description: '성수동 감성 카페. 빈티지 인테리어와 정원이 아름다운 곳.',
  },
  {
    id: 'r2', name: '성수연방', category: '복합문화공간',
    tags: ['데이트 코스', '전시/문화'], rating: 4.6, reviewCount: 1892,
    distance: '520m', address: '서울 성동구 연무장5가길 7',
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663322273601/2bdpbPnYmCuK9PccZ3SWKc/lm-course-seongsu-hGTsaQPMJotuBpuyBnE5dN.webp',
    lat: 37.5441, lng: 127.0571, priceRange: 2, openHours: '11:00–21:00',
    dietary: [], description: '성수동 복합문화공간. 다양한 팝업스토어와 카페가 모여있는 곳.',
  },
  {
    id: 'r3', name: '어니언 성수', category: '베이커리',
    tags: ['카페', '데이트 코스'], rating: 4.9, reviewCount: 5621,
    distance: '680m', address: '서울 성동구 아차산로9길 8',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80',
    lat: 37.5451, lng: 127.0551, priceRange: 2, openHours: '08:00–22:00',
    dietary: ['비건 옵션'], description: '성수동 대표 베이커리 카페. 시그니처 소금빵이 유명.',
  },
  {
    id: 'r4', name: '대림창고', category: '레스토랑',
    tags: ['데이트 코스', '맛집'], rating: 4.7, reviewCount: 3201,
    distance: '900m', address: '서울 성동구 성수이로 78',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    lat: 37.5438, lng: 127.0581, priceRange: 3, openHours: '11:30–22:00',
    dietary: [], description: '창고를 개조한 감성 레스토랑. 브런치와 파스타가 인기.',
  },
  {
    id: 'r5', name: '서울숲 피크닉', category: '공원',
    tags: ['액티비티', '데이트 코스'], rating: 4.5, reviewCount: 8901,
    distance: '1.2km', address: '서울 성동구 뚝섬로 273',
    image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&q=80',
    lat: 37.5445, lng: 127.0611, priceRange: 1, openHours: '06:00–22:00',
    dietary: [], description: '서울 도심 속 자연. 피크닉과 산책을 즐길 수 있는 도심 공원.',
  },
  {
    id: 'r6', name: '한남 브런치 클럽', category: '브런치',
    tags: ['맛집', '혼자 여행'], rating: 4.6, reviewCount: 1234,
    distance: '2.1km', address: '서울 용산구 이태원로 240',
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663322273601/2bdpbPnYmCuK9PccZ3SWKc/lm-course-hannam-EMhDLXHPSYVSTV5cbEekLC.webp',
    lat: 37.5349, lng: 126.9990, priceRange: 3, openHours: '10:00–21:00',
    dietary: ['글루텐프리 옵션', '비건 옵션'], description: '한남동 감성 브런치 카페. 에그베네딕트와 아보카도 토스트가 시그니처.',
  },
  {
    id: 'r7', name: '북촌 한옥 찻집', category: '전통찻집',
    tags: ['전시/문화', '혼자 여행'], rating: 4.8, reviewCount: 2109,
    distance: '3.5km', address: '서울 종로구 계동길 37',
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663322273601/2bdpbPnYmCuK9PccZ3SWKc/lm-course-bukchon-ATNXaSXg79mMDT2jnbpMuD.webp',
    lat: 37.5825, lng: 126.9844, priceRange: 2, openHours: '10:00–20:00',
    dietary: ['비건 옵션'], description: '북촌 한옥마을 전통 찻집. 한복 체험과 함께 즐기는 전통차.',
  },
  {
    id: 'r8', name: '연남동 파스타', category: '이탈리안',
    tags: ['맛집', '가성비'], rating: 4.5, reviewCount: 3456,
    distance: '4.2km', address: '서울 마포구 연남로 48',
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663322273601/2bdpbPnYmCuK9PccZ3SWKc/lm-course-yeonnam-eiXe5dfjEAvbX6RscXaFtr.webp',
    lat: 37.5614, lng: 126.9237, priceRange: 2, openHours: '11:00–22:00',
    dietary: ['비건 옵션'], description: '연남동 감성 파스타 레스토랑. 수제 파스타와 피자가 인기.',
  },
  {
    id: 'r9', name: '마라탕 천국', category: '중식',
    tags: ['맛집', '가성비'], rating: 4.4, reviewCount: 4567,
    distance: '1.8km', address: '서울 마포구 홍대입구역 2번 출구',
    image: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80',
    lat: 37.5571, lng: 126.9240, priceRange: 1, openHours: '11:00–23:00',
    dietary: ['할랄 옵션'], description: '홍대 마라탕 맛집. 매운 국물과 다양한 재료로 인기.',
  },
  {
    id: 'r10', name: '스시 오마카세 료', category: '일식',
    tags: ['맛집', '데이트 코스'], rating: 4.9, reviewCount: 891,
    distance: '2.8km', address: '서울 마포구 연남동 228-15',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80',
    lat: 37.5614, lng: 126.9237, priceRange: 4, openHours: '12:00–22:00',
    dietary: [], description: '연남동 프리미엄 오마카세. 신선한 제철 재료로 만드는 코스 요리.',
  },
  {
    id: 'r11', name: '버거 조인트 성수', category: '버거',
    tags: ['맛집', '가성비'], rating: 4.3, reviewCount: 2780,
    distance: '420m', address: '서울 성동구 성수일로 56',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
    lat: 37.5449, lng: 127.0558, priceRange: 2, openHours: '11:00–21:00',
    dietary: ['육식'], description: '성수동 수제버거 맛집. 두툼한 패티와 직접 만든 번이 일품.',
  },
  {
    id: 'r12', name: '비건 테이블', category: '비건',
    tags: ['맛집', '혼자 여행'], rating: 4.7, reviewCount: 1043,
    distance: '760m', address: '서울 성동구 연무장길 18',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
    lat: 37.5432, lng: 127.0566, priceRange: 3, openHours: '11:30–21:00',
    dietary: ['비건', '채식', '글루텐프리'], description: '식물성 재료로만 만드는 건강한 비건 레스토랑.',
  },
  {
    id: 'r13', name: '타코 아미고', category: '멕시칸',
    tags: ['맛집', '가성비'], rating: 4.4, reviewCount: 1890,
    distance: '1.1km', address: '서울 마포구 와우산로 29길',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
    lat: 37.5538, lng: 126.9255, priceRange: 2, openHours: '11:00–23:00',
    dietary: ['할랄'], description: '정통 멕시칸 타코와 부리토. 매콤한 살사가 매력.',
  },
  {
    id: 'r14', name: '라멘 텐푸라', category: '일식',
    tags: ['맛집', '가성비'], rating: 4.5, reviewCount: 3421,
    distance: '640m', address: '서울 마포구 동교로 174',
    image: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600&q=80',
    lat: 37.5601, lng: 126.9244, priceRange: 2, openHours: '11:00–22:00',
    dietary: [], description: '진한 돈코츠 라멘 전문점. 바삭한 텐푸라와 함께.',
  },
  {
    id: 'r15', name: '그릴 스테이크 하우스', category: '스테이크',
    tags: ['맛집', '데이트 코스'], rating: 4.8, reviewCount: 1567,
    distance: '2.3km', address: '서울 용산구 이태원로 200',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80',
    lat: 37.5340, lng: 126.9945, priceRange: 4, openHours: '17:00–23:00',
    dietary: ['육식'], description: '드라이에이징 스테이크 전문. 특별한 날을 위한 곳.',
  },
  {
    id: 'r16', name: '쌀국수 사이공', category: '베트남',
    tags: ['맛집', '가성비'], rating: 4.2, reviewCount: 2210,
    distance: '880m', address: '서울 마포구 양화로 23길',
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&q=80',
    lat: 37.5556, lng: 126.9221, priceRange: 1, openHours: '10:30–21:30',
    dietary: ['해산물 제외'], description: '깊은 육수의 정통 베트남 쌀국수. 든든한 한 끼.',
  },
  {
    id: 'r17', name: '샐러드 보울', category: '샐러드',
    tags: ['혼자 여행', '가성비'], rating: 4.1, reviewCount: 980,
    distance: '310m', address: '서울 성동구 성수이로 99',
    image: 'https://images.unsplash.com/photo-1512852939750-1305098529bf?w=600&q=80',
    lat: 37.5450, lng: 127.0560, priceRange: 2, openHours: '09:00–20:00',
    dietary: ['비건', '채식', '글루텐프리'], description: '신선한 채소로 만드는 커스텀 샐러드 전문점.',
  },
  {
    id: 'r18', name: '국밥 한그릇', category: '한식',
    tags: ['맛집', '가성비'], rating: 4.6, reviewCount: 5120,
    distance: '540m', address: '서울 성동구 아차산로 11길',
    image: 'https://images.unsplash.com/photo-1583224944844-5b268c057b72?w=600&q=80',
    lat: 37.5455, lng: 127.0549, priceRange: 1, openHours: '06:00–22:00',
    dietary: [], description: '24시간 든든한 돼지국밥. 진한 국물이 일품.',
  },
  {
    id: 'r19', name: '피자 나폴리', category: '이탈리안',
    tags: ['맛집', '데이트 코스'], rating: 4.5, reviewCount: 2670,
    distance: '1.5km', address: '서울 마포구 연남로 30',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80',
    lat: 37.5620, lng: 126.9230, priceRange: 3, openHours: '11:30–22:30',
    dietary: ['채식'], description: '화덕에서 구운 정통 나폴리 피자. 쫄깃한 도우.',
  },
  {
    id: 'r20', name: '디저트 카페 슈가', category: '카페',
    tags: ['카페', '데이트 코스'], rating: 4.7, reviewCount: 3340,
    distance: '450m', address: '서울 성동구 서울숲길 42',
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80',
    lat: 37.5446, lng: 127.0573, priceRange: 2, openHours: '11:00–22:00',
    dietary: ['채식', '글루텐프리'], description: '수제 디저트와 스페셜티 커피. 인스타 핫플.',
  },
];

export const MOCK_COURSES: Course[] = [
  {
    id: 'c1',
    title: '성수동 감성 데이트 코스',
    description: '감성 가득한 성수동에서 특별한 하루를 보내세요.',
    heroImage: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663322273601/2bdpbPnYmCuK9PccZ3SWKc/lm-course-seongsu-hGTsaQPMJotuBpuyBnE5dN.webp',
    tags: ['데이트 코스', '카페'],
    hashtags: ['#데이트', '#카페', '#분위기', '#성수핫플'],
    region: '성수동',
    metadata: { distance: 3.2, duration: 300, placeCount: 5 },
    stops: [
      { placeId: 'r1', order: 1, startTime: '10:00', endTime: '11:00', isBookmarked: false },
      { placeId: 'r2', order: 2, startTime: '11:20', endTime: '12:30', isBookmarked: false },
      { placeId: 'r3', order: 3, startTime: '12:40', endTime: '14:00', isBookmarked: true },
      { placeId: 'r4', order: 4, startTime: '14:20', endTime: '15:30', isBookmarked: false },
      { placeId: 'r5', order: 5, startTime: '15:30', endTime: '16:40', isBookmarked: false },
    ],
    createdAt: '2026-05-20',
    isPublic: true,
    creatorId: 'user1',
    savedCount: 234,
  },
  {
    id: 'c2',
    title: '한남동 브런치 코스',
    description: '여유로운 주말 브런치를 즐기는 한남동 코스.',
    heroImage: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663322273601/2bdpbPnYmCuK9PccZ3SWKc/lm-course-hannam-EMhDLXHPSYVSTV5cbEekLC.webp',
    tags: ['맛집', '혼자 여행'],
    hashtags: ['#브런치', '#한남', '#주말'],
    region: '한남동',
    metadata: { distance: 2.7, duration: 240, placeCount: 4 },
    stops: [
      { placeId: 'r6', order: 1, startTime: '10:30', endTime: '12:00', isBookmarked: false },
      { placeId: 'r7', order: 2, startTime: '12:30', endTime: '14:00', isBookmarked: false },
      { placeId: 'r8', order: 3, startTime: '14:30', endTime: '16:00', isBookmarked: false },
    ],
    createdAt: '2026-05-18',
    isPublic: true,
    creatorId: 'user2',
    savedCount: 156,
  },
  {
    id: 'c3',
    title: '북촌 한옥 감성 코스',
    description: '전통과 현대가 공존하는 북촌의 아름다운 코스.',
    heroImage: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663322273601/2bdpbPnYmCuK9PccZ3SWKc/lm-course-bukchon-ATNXaSXg79mMDT2jnbpMuD.webp',
    tags: ['전시/문화', '혼자 여행'],
    hashtags: ['#북촌', '#한옥', '#전통', '#감성'],
    region: '북촌',
    metadata: { distance: 2.1, duration: 180, placeCount: 3 },
    stops: [
      { placeId: 'r7', order: 1, startTime: '10:00', endTime: '12:00', isBookmarked: false },
      { placeId: 'r6', order: 2, startTime: '12:30', endTime: '14:00', isBookmarked: false },
    ],
    createdAt: '2026-05-15',
    isPublic: true,
    creatorId: 'user3',
    savedCount: 89,
  },
  {
    id: 'c4',
    title: '연남동 맛집 투어',
    description: '연남동 골목 구석구석 숨어있는 맛집 탐방.',
    heroImage: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663322273601/2bdpbPnYmCuK9PccZ3SWKc/lm-course-yeonnam-eiXe5dfjEAvbX6RscXaFtr.webp',
    tags: ['맛집', '맛집 투어'],
    hashtags: ['#연남동', '#맛집', '#투어'],
    region: '연남동',
    metadata: { distance: 3.8, duration: 360, placeCount: 5 },
    stops: [
      { placeId: 'r8', order: 1, startTime: '11:00', endTime: '12:30', isBookmarked: false },
      { placeId: 'r9', order: 2, startTime: '13:00', endTime: '14:30', isBookmarked: false },
      { placeId: 'r10', order: 3, startTime: '15:00', endTime: '17:00', isBookmarked: false },
    ],
    createdAt: '2026-05-10',
    isPublic: true,
    creatorId: 'user1',
    savedCount: 312,
  },
];

const THEMES = [
  { id: 'date', label: '데이트 코스', emoji: '💕', color: '#EB5053', tag: '데이트 코스' as TagType },
  { id: 'solo', label: '혼자 여유 코스', emoji: '☕', color: '#F09D09', tag: '혼자 여행' as TagType },
  { id: 'budget', label: '가성비 맛집', emoji: '💰', color: '#3CBA44', tag: '가성비' as TagType },
  { id: 'special', label: '특별한 날', emoji: '🎁', color: '#3E719B', tag: '전시/문화' as TagType },
];

export { THEMES };

const DEFAULT_PROFILE: UserProfile = {
  id: 'me',
  name: '지민',
  emoji: '😊',
  dietary: [],
  categoryPrefs: [
    { category: '카페', score: 0.9, rank: 1 },
    { category: '브런치', score: 0.8, rank: 2 },
    { category: '이탈리안', score: 0.7, rank: 3 },
    { category: '일식', score: 0.6, rank: 4 },
    { category: '중식', score: 0.5, rank: 5 },
  ],
  totalSwipes: 0,
  totalLikes: 0,
  joinedAt: new Date().toISOString(),
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  courses: Course[];
  savedCourseIds: string[];
  saveCourse: (courseId: string) => void;
  unsaveCourse: (courseId: string) => void;
  addCourse: (course: Course) => void;

  currentSession: GroupSession | null;
  setCurrentSession: (s: GroupSession | null) => void;
  createSession: (
    name: string,
    filters: GroupSession['filters'],
    hostName?: string,
    emoji?: string,
    deadlineMinutes?: number,
  ) => Promise<GroupSession>;
  joinSession: (token: string, name?: string, emoji?: string) => Promise<GroupSession>;
  fetchSession: (token: string) => Promise<GroupSession>;
  toggleReady: (token: string, isReady: boolean) => Promise<GroupSession>;
  startSession: (token: string) => Promise<GroupSession>;

  swipeRecords: SwipeRecord[];
  addSwipe: (restaurantId: string, action: SwipeRecord['action']) => void;
  likedRestaurantIds: string[];

  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;

  restaurants: Restaurant[];
  getRestaurantById: (id: string) => Restaurant | undefined;
  getCourseById: (id: string) => Course | undefined;
  isLoading: boolean;
  apiAvailable: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

function buildLocalSession(
  name: string,
  filters: GroupSession['filters'],
  profile: UserProfile,
  restaurants: Restaurant[],
): GroupSession {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  return {
    id: `session_${Date.now()}`,
    name,
    inviteCode: code,
    hostId: profile.id,
    members: [{
      id: profile.id,
      name: profile.name,
      emoji: profile.emoji,
      hasVoted: false,
      preferences: profile.categoryPrefs.map(p => ({ categoryId: p.category, score: p.score })),
    }],
    filters,
    deadline: null,
    status: 'waiting',
    restaurants: restaurants.filter(r =>
      filters.categories.length === 0 || filters.categories.includes(r.category),
    ),
    results: [],
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>(() => {
    try { const s = localStorage.getItem('lm_courses'); return s ? JSON.parse(s) : MOCK_COURSES; }
    catch { return MOCK_COURSES; }
  });

  const [restaurants, setRestaurants] = useState<Restaurant[]>(MOCK_RESTAURANTS);
  const [isLoading, setIsLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(false);

  const [savedCourseIds, setSavedCourseIds] = useState<string[]>(() => {
    try { const s = localStorage.getItem('lm_saved'); return s ? JSON.parse(s) : ['c1']; }
    catch { return ['c1']; }
  });

  const [currentSession, setCurrentSession] = useState<GroupSession | null>(() => {
    try { const s = localStorage.getItem('lm_session'); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });

  const [swipeRecords, setSwipeRecords] = useState<SwipeRecord[]>(() => {
    try { const s = localStorage.getItem('lm_swipes'); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    try { const s = localStorage.getItem('lm_profile'); return s ? JSON.parse(s) : DEFAULT_PROFILE; }
    catch { return DEFAULT_PROFILE; }
  });

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/restaurants').then(r => (r.ok ? r.json() : Promise.reject())),
      fetch('/api/courses').then(r => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([resData, courseData]) => {
        if (Array.isArray(resData) && resData.length > 0) setRestaurants(resData);
        if (Array.isArray(courseData) && courseData.length > 0) setCourses(courseData);
        setApiAvailable(true);
      })
      .catch(() => setApiAvailable(false))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { localStorage.setItem('lm_courses', JSON.stringify(courses)); }, [courses]);
  useEffect(() => { localStorage.setItem('lm_saved', JSON.stringify(savedCourseIds)); }, [savedCourseIds]);
  useEffect(() => {
    if (currentSession) localStorage.setItem('lm_session', JSON.stringify(currentSession));
    else localStorage.removeItem('lm_session');
  }, [currentSession]);
  useEffect(() => { localStorage.setItem('lm_swipes', JSON.stringify(swipeRecords)); }, [swipeRecords]);
  useEffect(() => { localStorage.setItem('lm_profile', JSON.stringify(profile)); }, [profile]);

  const saveCourse = useCallback((id: string) => {
    setSavedCourseIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const unsaveCourse = useCallback((id: string) => {
    setSavedCourseIds(prev => prev.filter(i => i !== id));
  }, []);

  const addCourse = useCallback((course: Course) => {
    setCourses(prev => [course, ...prev]);
  }, []);

  const createSession = useCallback(async (
    name: string,
    filters: GroupSession['filters'],
    hostName?: string,
    emoji?: string,
    deadlineMinutes?: number,
  ): Promise<GroupSession> => {
    const actualHostName = hostName || profile.name;
    const actualEmoji = emoji || profile.emoji;

    if (apiAvailable) {
      try {
        const res = await fetch('/api/sessions/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hostId: profile.id,
            hostName: actualHostName,
            emoji: actualEmoji,
            name,
            groupSize: filters.partySize,
            filterDistance: filters.radius,
            filterBudget: filters.budget,
            filterCategories: filters.categories,
            filterDietary: filters.dietary,
            deadlineMinutes,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const session: GroupSession = {
            id: data.session.id,
            name,
            inviteCode: data.token,
            hostId: profile.id,
            members: [{
              id: profile.id,
              name: actualHostName,
              emoji: actualEmoji,
              hasVoted: false,
              preferences: profile.categoryPrefs.map(p => ({ categoryId: p.category, score: p.score })),
              ready: false,
            }],
            filters,
            deadline: data.session.deadline_at,
            status: 'waiting',
            restaurants: restaurants.filter(r =>
              filters.categories.length === 0 || filters.categories.includes(r.category),
            ),
            results: [],
          };
          setCurrentSession(session);
          return session;
        }
      } catch {
        // fall through to local session
      }
    }

    const session = buildLocalSession(name, filters, { ...profile, name: actualHostName, emoji: actualEmoji }, restaurants);
    setCurrentSession(session);
    return session;
  }, [apiAvailable, profile, restaurants]);

  const fetchSession = useCallback(async (token: string): Promise<GroupSession> => {
    const res = await fetch(`/api/sessions/${token}`);
    if (!res.ok) throw new Error('Session not found');
    const data = await res.json();
    const session: GroupSession = {
      id: data.session.id,
      name: '점심 세션',
      inviteCode: token,
      hostId: data.session.host_user_id,
      members: data.members.map((m: { user_id: string; user_name: string; emoji: string; is_ready: boolean }) => ({
        id: m.user_id,
        name: m.user_name,
        emoji: m.emoji,
        hasVoted: false,
        preferences: [],
        ready: m.is_ready,
      })),
      filters: {
        partySize: data.session.group_size,
        dietary: data.session.filter_dietary || [],
        budget: data.session.filter_budget,
        radius: data.session.filter_distance,
        categories: data.session.filter_vibe || [],
      },
      deadline: data.session.deadline_at,
      status: (data.session.status as string).toLowerCase() as GroupSession['status'],
      restaurants: restaurants.filter(r =>
        (data.session.filter_vibe || []).length === 0 ||
        (data.session.filter_vibe || []).includes(r.category),
      ),
      results: [],
    };
    setCurrentSession(session);
    return session;
  }, [restaurants]);

  const joinSession = useCallback(async (token: string, name?: string, emoji?: string) => {
    await fetch(`/api/sessions/${token}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: profile.id,
        userName: name || profile.name,
        emoji: emoji || profile.emoji,
      }),
    });
    return fetchSession(token);
  }, [profile, fetchSession]);

  const toggleReady = useCallback(async (token: string, isReady: boolean) => {
    await fetch(`/api/sessions/${token}/ready`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id, isReady }),
    });
    return fetchSession(token);
  }, [profile, fetchSession]);

  const startSession = useCallback(async (token: string) => {
    await fetch(`/api/sessions/${token}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SWIPING_1' }),
    });
    return fetchSession(token);
  }, [fetchSession]);

  const addSwipe = useCallback((restaurantId: string, action: SwipeRecord['action']) => {
    const record: SwipeRecord = {
      restaurantId,
      action,
      timestamp: new Date().toISOString(),
      sessionId: currentSession?.id,
    };
    setSwipeRecords(prev => [...prev, record]);
    setProfile(prev => ({
      ...prev,
      totalSwipes: prev.totalSwipes + 1,
      totalLikes: action === 'like' ? prev.totalLikes + 1 : prev.totalLikes,
    }));

    if (apiAvailable && currentSession) {
      fetch('/api/swipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `swipe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          session_id: currentSession.id,
          user_id: profile.id,
          restaurant_id: restaurantId,
          round: 1,
          swipe_action: action === 'like' || action === 'save' ? 'LIKE' : 'DISLIKE',
          created_at: new Date(),
        }),
      }).catch(() => {});
    }
  }, [apiAvailable, currentSession, profile.id]);

  const likedRestaurantIds = swipeRecords
    .filter(s => s.action === 'like' || s.action === 'save')
    .map(s => s.restaurantId);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const getRestaurantById = useCallback((id: string) => restaurants.find(r => r.id === id), [restaurants]);
  const getCourseById = useCallback((id: string) => courses.find(c => c.id === id), [courses]);

  return (
    <AppContext.Provider value={{
      courses, savedCourseIds, saveCourse, unsaveCourse, addCourse,
      currentSession, setCurrentSession, createSession, joinSession, fetchSession, toggleReady, startSession,
      swipeRecords, addSwipe, likedRestaurantIds,
      profile, updateProfile,
      restaurants,
      getRestaurantById, getCourseById,
      isLoading, apiAvailable,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
