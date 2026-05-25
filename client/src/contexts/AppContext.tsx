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
  // Courses
  courses: Course[];
  savedCourseIds: string[];
  saveCourse: (courseId: string) => void;
  unsaveCourse: (courseId: string) => void;
  addCourse: (course: Course) => void;

  // Session
  currentSession: GroupSession | null;
  setCurrentSession: (s: GroupSession | null) => void;
  createSession: (name: string, filters: GroupSession['filters']) => GroupSession;

  // Swipe
  swipeRecords: SwipeRecord[];
  addSwipe: (restaurantId: string, action: SwipeRecord['action']) => void;
  likedRestaurantIds: string[];

  // Profile
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;

  // Restaurants
  restaurants: Restaurant[];
  getRestaurantById: (id: string) => Restaurant | undefined;
  getCourseById: (id: string) => Course | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>(() => {
    try { const s = localStorage.getItem('lm_courses'); return s ? JSON.parse(s) : MOCK_COURSES; }
    catch { return MOCK_COURSES; }
  });

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

  const createSession = useCallback((name: string, filters: GroupSession['filters']): GroupSession => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const session: GroupSession = {
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
      restaurants: MOCK_RESTAURANTS.filter(r =>
        filters.categories.length === 0 || filters.categories.includes(r.category)
      ),
      results: [],
    };
    setCurrentSession(session);
    return session;
  }, [profile]);

  const addSwipe = useCallback((restaurantId: string, action: SwipeRecord['action']) => {
    const record: SwipeRecord = { restaurantId, action, timestamp: new Date().toISOString() };
    setSwipeRecords(prev => [...prev, record]);
    setProfile(prev => ({
      ...prev,
      totalSwipes: prev.totalSwipes + 1,
      totalLikes: action === 'like' ? prev.totalLikes + 1 : prev.totalLikes,
    }));
  }, []);

  const likedRestaurantIds = swipeRecords
    .filter(s => s.action === 'like' || s.action === 'save')
    .map(s => s.restaurantId);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const getRestaurantById = useCallback((id: string) => MOCK_RESTAURANTS.find(r => r.id === id), []);
  const getCourseById = useCallback((id: string) => courses.find(c => c.id === id), [courses]);

  return (
    <AppContext.Provider value={{
      courses, savedCourseIds, saveCourse, unsaveCourse, addCourse,
      currentSession, setCurrentSession, createSession,
      swipeRecords, addSwipe, likedRestaurantIds,
      profile, updateProfile,
      restaurants: MOCK_RESTAURANTS,
      getRestaurantById, getCourseById,
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
