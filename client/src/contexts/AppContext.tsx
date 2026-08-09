/**
 * Lunchie Munchie — App Context
 * Design: Soft Coral (Option 8)
 * Manages: courses, restaurants, sessions, profile, swipe data
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { normalizeDiet, isHardRestriction, type DietTag } from '@shared/const';
import { categoryMatchesIntent, intentForHour, type Intent } from '@shared/intent';
import { distanceMetres, isWithinRadius } from '@shared/geo';
import { normalizeFoodTag, type TagType } from '@/constants/foodTags';
import { DRIVE_COURSES, DRIVE_FEED_POSTS } from '@/data/driveFeed';
import { demoAuthorIdFor } from '@/data/demoAuthors';
import { getCoursemapDecor, MAX_MUNCHIE_FEED_PHOTOS, type CoursemapCanvasStroke, type FeedPhotoPlacement } from '@/lib/coursemapDecor';
import type { LunchmateProfileLoadout, LunchmateRoomLoadout } from '@/types/lunchmateCustomization';
import type { LunchboxInventory } from '@/constants/lunchboxFoods';
import {
  normalizeLunchmateOwnedItemIds,
  normalizeLunchmateProfileLoadout,
  normalizeLunchmateRewardClaims,
  type LunchmateRewardClaim,
} from '@/utils/lunchmateProfile';
import { logCourseSave, logFeedLike } from '@/lib/eventLogger';
export type { TagType } from '@/constants/foodTags';

// ─── Types ────────────────────────────────────────────────────────────────────

// diet 하드 제약 매칭: 필터('비건')와 식당 태그('비건 옵션')를 enum으로 정규화해 비교.
const SEAFOOD_RE = /해산물|seafood|스시|sushi|초밥|회|sashimi|오마카세|omakase/i;
function matchesDiet(category: string, restaurantDietary: string[], filterDietary: string[]): boolean {
  const required: DietTag[] = [];
  for (const raw of filterDietary || []) {
    const n = normalizeDiet(raw);
    if (n && isHardRestriction(n)) required.push(n);
  }
  if (required.length === 0) return true;
  const offered = (restaurantDietary || []).map(normalizeDiet);
  return required.every((tag) =>
    tag === 'NO_SEAFOOD' ? !SEAFOOD_RE.test(category) : offered.includes(tag),
  );
}

// TagType은 @/constants/foodTags 로 이동(위 import+re-export). 인라인 정의 제거 — 태그 taxonomy 단일화.
export interface MenuItem {
  name: string;
  price: number | null;
  image?: string;
  dietary?: string[];
  /** 소스 메뉴판의 섹션 헤더 그대로(예: "Mains", "Pizzas"). 없으면 미분류. */
  category?: string;
  /** 재료/상세 설명 (소스에 있을 때만) */
  description?: string;
}

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
  photos?: string[];
  menuItems?: MenuItem[];
  lat: number;
  lng: number;
  priceRange: 1 | 2 | 3 | 4;
  openHours: string;
  dietary: string[];
  description: string;
}

function hasSessionOrigin(filters: GroupSession['filters']) {
  return (
    typeof filters.originLatitude === 'number' &&
    typeof filters.originLongitude === 'number' &&
    Number.isFinite(filters.originLatitude) &&
    Number.isFinite(filters.originLongitude)
  );
}

function formatSessionDistance(metres: number) {
  const rounded = metres < 1_000
    ? `${Math.round(metres / 10) * 10}m`
    : `${(metres / 1_000).toFixed(metres < 10_000 ? 1 : 0)}km`;
  return `내 위치에서 ${rounded}`;
}

function withSessionDistances(
  restaurants: Restaurant[],
  filters: GroupSession['filters'],
) {
  if (!hasSessionOrigin(filters)) return restaurants;
  return restaurants.map((restaurant) => ({
    ...restaurant,
    distance: formatSessionDistance(
      distanceMetres(
        filters.originLatitude!,
        filters.originLongitude!,
        restaurant.lat,
        restaurant.lng,
      ),
    ),
  }));
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

export const MAX_COURSE_STOPS = 3;

function limitCourseToThreeStops(course: Course): Course {
  const stops = course.stops
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_COURSE_STOPS)
    .map((stop, index) => ({ ...stop, order: index + 1 }));
  return {
    ...course,
    stops,
    metadata: { ...course.metadata, placeCount: stops.length },
  };
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
    /** 세션을 만든 호스트의 1회성 기준 위치. 공유 카드 덱의 공통 원점이다. */
    originLatitude?: number;
    originLongitude?: number;
    categories: string[];
    /** 명시적으로 고른 밥/카페/디저트. 없으면(undefined) 시간대로 자동 판정. */
    intent?: Intent;
  };
  deadline: string | null;
  /** 마감 타이밍(분) — 투표 시작 시점에 deadline으로 변환 적용 */
  deadlineMinutes?: number;
  status: 'waiting' | 'voting' | 'completed';
  restaurants: Restaurant[];
  results: { restaurantId: string; score: number }[];
  /** 런치 엔진 추천 슬레이트 식별자 (로깅 propensity 승계용) */
  slateId?: string;
  /** restaurant_id → {추천 propensity, 노출 position} (스와이프 로깅에 사용) */
  recMeta?: Record<string, { propensity: number; position: number }>;
  /** 슬레이트를 만든 엔진 정책 버전 (스와이프 로깅의 model_version) */
  modelVersion?: string;
  /** 그룹 결정 세대 (reroll마다 +1). 예선 swipe round = 2*gen-1. 미설정=1. */
  generation?: number;
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
  /** 업로드한 프로필 사진(data URL) — 있으면 emoji 대신 이 사진을 아바타로 보여준다 */
  avatarPhoto?: string;
  dietary: string[];
  categoryPrefs: { category: string; score: number; rank: number }[];
  totalSwipes: number;
  totalLikes: number;
  joinedAt: string;
  isLoggedIn?: boolean;
  /** 프로필 다마고치 — 커스텀 푸디 캐릭터 이모지 */
  foodieChar?: string;
  /** 푸디 캐릭터 방 스킨 (먼치 스킨 id) */
  foodieSkin?: string;
  lunchmateRoomLoadout?: LunchmateRoomLoadout;
  /** 런치메이트룸에서 적용한 네 slot 코스튬 조합 */
  lunchmateLoadout?: LunchmateProfileLoadout;
  /** 보유한 런치메이트 코스튬 manifest ID 목록 */
  lunchmateOwnedItemIds?: string[];
  /** 현재 브라우저 preview에서 지급한 레벨별 코스튬 이력 */
  lunchmateRewardClaims?: LunchmateRewardClaim[];
  lunchboxInventory?: LunchboxInventory;
  lunchmateXp?: number;
  lunchmateTotalXp?: number;
}

export interface SwipeRecord {
  restaurantId: string;
  action: 'like' | 'save' | 'skip';
  timestamp: string;
  sessionId?: string;
}

/** 피드 댓글 — hidden은 게시물 작성자가 숨김 처리한 것 (메인 피드에서 일괄 미노출) */
export interface FeedComment {
  id: string;
  authorName: string;
  authorEmoji: string;
  text: string;
  createdAt: string;
  hidden?: boolean;
  likes?: number;
  dislikes?: number;
  myReaction?: 'like' | 'dislike';
  reported?: boolean;
  parentId?: string;
}

/** 과거 로컬 저장 데이터의 문자열/숫자 값까지 포함해 숨김 상태를 일관되게 판정한다. */
export function isFeedCommentHidden(comment: FeedComment) {
  const hidden = comment.hidden as unknown;
  return hidden === true || hidden === 'true' || hidden === 1 || hidden === '1';
}

/** Munchie Feed 게시물 — 코스에 사진+한줄평+템플릿 스킨을 입힌 정성 기록 */
export interface FeedPost {
  id: string;
  /** 작성자 기기 ID — 내 게시물 판별(수정/삭제/댓글 숨김 권한) */
  authorId?: string;
  authorName: string;
  authorEmoji: string;
  authorLevel?: number;
  authorLevelName?: string;
  courseId: string;
  photos: string[];
  /** Original user media is absent on a legacy post; never substitute a restaurant cover. */
  missingOriginalMedia?: boolean;
  /** 서버에 보존한 템플릿·사진 배치. 다른 기기/다른 사용자도 같은 카드로 렌더링한다. */
  templateId?: string;
  decor?: import('@/lib/coursemapDecor').PlacedPhoto[];
  photoPlacements?: FeedPhotoPlacement[];
  canvasStrokes?: CoursemapCanvasStroke[];
  caption: string;
  skinId: string;
  likes: number;
  shares?: number;
  dislikes?: number;
  saves: number;
  comments: FeedComment[];
  createdAt: string;
  tags: TagType[];
}

export const MOCK_RESTAURANTS: Restaurant[] = [];

export const MOCK_COURSES: Course[] = [];

export const MOCK_FEED_POSTS: FeedPost[] = [];

const THEMES = [
  { id: 'date', label: '데이트코스', emoji: '💕', color: '#EB5053', tag: '데이트코스' as TagType },
  { id: 'solo', label: '혼밥 코스', emoji: '🍚', color: '#D94447', tag: '혼밥' as TagType },
  { id: 'budget', label: '가성비 맛집', emoji: '💰', color: '#3CBA44', tag: '가성비' as TagType },
  { id: 'special', label: '펍나이트', emoji: '🍸', color: '#3E719B', tag: '펍나이트' as TagType },
];

export { THEMES };

// 그룹 세션은 userId로 멤버를 구분하므로, 기기마다 고유 ID가 있어야 한다.
// (모두 'me'였던 과거 값은 서버에서 한 명으로 합쳐져 멀티유저 투표가 깨진다.)
function generateUserId() {
  return 'user_' + Math.random().toString(36).substring(2, 15);
}

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
  lunchmateOwnedItemIds: normalizeLunchmateOwnedItemIds(undefined),
  lunchmateRewardClaims: [],
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  courses: Course[];
  savedCourseIds: string[];
  saveCourse: (courseId: string) => void;
  unsaveCourse: (courseId: string) => void;
  addCourse: (course: Course) => void;
  updateCourse: (courseId: string, updates: Partial<Course>) => void;
  deleteCourseWithFeed: (courseId: string) => void;
  /** 프로필의 나의 템플릿에서만 숨긴 코스 ID — 원본 코스와 피드는 유지한다. */
  hiddenTemplateCourseIds: string[];
  deleteProfileTemplate: (courseId: string) => void;

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
  startSession: (token: string, deadlineMinutes?: number) => Promise<GroupSession>;

  swipeRecords: SwipeRecord[];
  addSwipe: (restaurantId: string, action: SwipeRecord['action']) => void;
  /** 세션의 로컬 스와이프 기록을 지운다 — "다시 고르기"로 카드를 처음부터 다시 보여주기 위한 용도 */
  clearSessionSwipes: (sessionId: string) => void;
  /** 그룹 reroll: 거절·다수미움 제외한 fresh 덱으로 다음 세대 예선 시작 */
  rerollSession: (excludeIds: string[]) => Promise<void>;
  likedRestaurantIds: string[];

  /** Lunchie Mode(Quick Match) 결과에서 "저장"한 맛집 — 저장 목록 페이지에 노출 */
  savedRestaurantIds: string[];
  saveRestaurant: (restaurantId: string) => void;
  unsaveRestaurant: (restaurantId: string) => void;

  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;

  /** Munchie Feed */
  feedPosts: FeedPost[];
  /** 서버 원본을 다시 읽어 현재 세션의 피드 캐시를 동기화한다. */
  refreshFeedPosts: () => Promise<void>;
  addFeedPost: (post: Omit<FeedPost, 'id' | 'likes' | 'shares' | 'saves' | 'comments' | 'createdAt'>) => FeedPost;
  updateFeedPost: (postId: string, updates: Partial<Pick<FeedPost, 'courseId' | 'caption' | 'skinId' | 'photos' | 'photoPlacements' | 'canvasStrokes' | 'tags'>>) => void;
  deleteFeedPost: (postId: string) => void;
  incrementFeedShare: (postId: string) => void;
  likedFeedIds: string[];
  dislikedFeedIds: string[];
  toggleFeedLike: (postId: string) => void;
  toggleFeedDislike: (postId: string) => void;
  addFeedComment: (postId: string, text: string, parentId?: string) => void;
  reactToFeedComment: (postId: string, commentId: string, reaction: 'like' | 'dislike') => void;
  reportFeedComment: (postId: string, commentId: string) => void;
  /** 내 게시물의 악성 댓글 숨김 토글 — 메인 피드에 일괄 반영 */
  toggleCommentHidden: (postId: string, commentId: string) => void;
  /** 게시물이 내 것인지 (수정/삭제/댓글 숨김 권한) */
  isMyPost: (post: FeedPost) => boolean;

  /** 코스맵 템플릿 스킨 (courseId → skinId) */
  courseSkins: Record<string, string>;
  setCourseSkin: (courseId: string, skinId: string | null) => void;

  restaurants: Restaurant[];
  /** Google Places로 새로 가져온 식당을 로컬 풀에 병합(id 중복이면 최신으로 덮어씀) —
   * PlaceExplorePage가 place-details 직후 getRestaurantById가 바로 찾을 수 있게 한다.
   * 서버(D1 restaurants 테이블)에는 Pages API가 이미 upsert 해뒀으니
   * 다음 부팅 시 /api/restaurants 로 자연히 들어옴 — 이건 같은 세션 내 즉시 반영용. */
  registerRestaurants: (newRestaurants: Restaurant[]) => void;
  getRestaurantById: (id: string) => Restaurant | undefined;
  getCourseById: (id: string) => Course | undefined;
  isLoading: boolean;
  apiAvailable: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

// 초기 데모 데이터의 `T9:15`처럼 한 자리 시각도 안전하게 처리한다. NaN 비교는
// Array.sort에서 "동일"으로 취급돼 방금 발행한 서버 게시물을 아래로 밀어낸다.
const createdAtMs = (value: string | number) => {
  const normalized = typeof value === 'string' ? value.replace(/T(\d):/, 'T0$1:') : value;
  const parsed = new Date(normalized).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export type ApiRequestAuth =
  { status: 'cookie-session' };

/** Pages Functions derive identity from the signed same-origin cookie. */
export async function resolveApiRequestAuth(): Promise<ApiRequestAuth> {
  return { status: 'cookie-session' };
}

interface BuildDeckDependencies {
  resolveRequestAuth?: () => Promise<ApiRequestAuth>;
  request?: typeof fetch;
}

// 런치 엔진 추천으로 덱을 정렬 + propensity 메타 부착. 실패 시 필터 순서 그대로(폴백).
export async function buildDeck(
  filters: GroupSession['filters'],
  allRestaurants: Restaurant[],
  userId?: string,
  dependencies: BuildDeckDependencies = {},
): Promise<{ restaurants: Restaurant[]; slateId?: string; recMeta?: GroupSession['recMeta']; modelVersion?: string }> {
  const base = allRestaurants.filter(r =>
    (filters.categories.length === 0 || filters.categories.includes(r.category)) &&
    categoryMatchesIntent(r.category, filters.intent ?? intentForHour(new Date().getHours())) &&
    matchesDiet(r.category, r.dietary, filters.dietary) &&
    (!hasSessionOrigin(filters) || isWithinRadius(
      filters.originLatitude!, filters.originLongitude!, r.lat, r.lng, filters.radius,
    )),
  );
  if (base.length === 0) return { restaurants: base };
  try {
    const auth = await (
      dependencies.resolveRequestAuth ?? resolveApiRequestAuth
    )();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const request = dependencies.request ?? fetch;
    const res = await request('/api/recommend', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        candidate_ids: base.map(r => r.id),
        // 앱이 이미 아는 맥락은 클라가 실어 보낸다 (companions=인원수). 나머지는 서버가 보강.
        context: { diet: filters.dietary, companions: filters.partySize, intent: filters.intent ?? intentForHour(new Date().getHours()) },
        // 예선 = 엔진 추천 top-7 (결정 플로우 ①). 스와이프 덱 = 슬레이트와 1:1.
        k: 7,
        slate_type: 'PRELIM',
        user_id: userId,
      }),
    });
    if (!res.ok) return { restaurants: withSessionDistances(base, filters) };
    const data = await res.json();
    const meta: GroupSession['recMeta'] = {};
    const slate: Restaurant[] = [];
    for (const s of data.slate as { id: string; propensity: number; rank: number }[]) {
      meta![s.id] = { propensity: s.propensity, position: s.rank };
      const r = base.find(x => x.id === s.id);
      if (r) slate.push(r);
    }
    // 덱 = 슬레이트(top-7)만. 노출(IMPRESSION)·스와이프가 정확히 일치한다.
    return { restaurants: withSessionDistances(slate.length ? slate : base, filters), slateId: data.slate_id, recMeta: meta, modelVersion: data.model_version };
  } catch {
    return { restaurants: withSessionDistances(base, filters) };
  }
}

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
      (filters.categories.length === 0 || filters.categories.includes(r.category)) &&
      matchesDiet(r.category, r.dietary, filters.dietary),
    ),
    results: [],
  };
}

const LAST_AUTH_UID_KEY = 'lm_last_auth_uid_v1';

function readStoredProfileId(): string | null {
  try {
    const stored = localStorage.getItem('lm_profile');
    if (!stored) return null;
    const id = (JSON.parse(stored) as Partial<UserProfile>).id;
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
}

export function AppProvider({
  children,
  initialAuthUserId = null,
}: {
  children: React.ReactNode;
  initialAuthUserId?: string | null;
}) {
  const legacyProfileIdRef = useRef(readStoredProfileId());
  const lastAuthUidRef = useRef(localStorage.getItem(LAST_AUTH_UID_KEY));
  // Prevent a render while an upload is in flight from creating duplicate R2 files.
  const legacyMediaMigrationRef = useRef(new Set<string>());
  const isFirstAuthAdoption = Boolean(initialAuthUserId && !lastAuthUidRef.current);
  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const s = localStorage.getItem('lm_courses');
      const stored = s ? JSON.parse(s) as Course[] : [];
      // 드라이브 실데이터 코스(피드 게시물이 참조) + 기존 샘플 코스
      const merged = new Map([...DRIVE_COURSES, ...MOCK_COURSES].map(course => [course.id, course]));
      stored.forEach(course => {
        const baseline = merged.get(course.id);
        const hasResolvableStops = course.stops?.some(stop => (
          MOCK_RESTAURANTS.some(restaurant => restaurant.id === stop.placeId)
          || DRIVE_COURSES.some(c => c.stops.some(st => st.placeId === stop.placeId))
        ));
        merged.set(course.id, {
          ...baseline,
          ...course,
          stops: hasResolvableStops ? course.stops : baseline?.stops ?? course.stops ?? [],
        });
      });
      return Array.from(merged.values()).map(course => limitCourseToThreeStops({
        ...course,
        tags: course.tags.map(tag => normalizeFoodTag(tag)),
      }));
    }
    catch { return [...DRIVE_COURSES, ...MOCK_COURSES]; }
  });

  const [restaurants, setRestaurants] = useState<Restaurant[]>(MOCK_RESTAURANTS);
  const [isLoading, setIsLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(false);

  const [savedCourseIds, setSavedCourseIds] = useState<string[]>(() => {
    try { const s = localStorage.getItem('lm_saved'); return s ? JSON.parse(s) : ['c1']; }
    catch { return ['c1']; }
  });

  const [hiddenTemplateCourseIds, setHiddenTemplateCourseIds] = useState<string[]>(() => {
    try { const s = localStorage.getItem('lm_hidden_profile_templates'); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  const [currentSession, setCurrentSession] = useState<GroupSession | null>(() => {
    try {
      const s = localStorage.getItem('lm_session');
      // 기존 random id로 만들어진 활성 서버 세션의 host/member 권한을 새 auth uid로
      // 클라이언트만 바꿔치기하지 않는다. 서버 상태와 갈라지는 것보다 로컬 연결을 종료한다.
      if (s && isFirstAuthAdoption) return null;
      return s ? JSON.parse(s) : null;
    }
    catch { return null; }
  });
  // fetchSession(폴링)이 서버 필드만으로 filters를 재구성해 intent를 잃어버리는 걸 막기 위한 최신값 스냅샷.
  // (서버 sessions 테이블에 intent 컬럼이 없어 서버 왕복으로는 못 지킴 — 클라 로컬로 보존.)
  const currentSessionRef = useRef(currentSession);
  useEffect(() => { currentSessionRef.current = currentSession; }, [currentSession]);

  const [swipeRecords, setSwipeRecords] = useState<SwipeRecord[]>(() => {
    try { const s = localStorage.getItem('lm_swipes'); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  const [savedRestaurantIds, setSavedRestaurantIds] = useState<string[]>(() => {
    try { const s = localStorage.getItem('lm_saved_restaurants'); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  const [feedPosts, setFeedPosts] = useState<FeedPost[]>(() => {
    // v3: 데모 글을 첫 로그인 사용자에게 귀속시키던 v2 캐시는 신뢰할 수 없다.
    // 로그인 사용자의 '나의 피드' 원본은 서버 author_id뿐이며, 로컬 값은 화면 캐시일 뿐이다.
    try {
      const s = localStorage.getItem('lm_feed_v3');
      if (s) {
        const parsed = JSON.parse(s) as FeedPost[];
        return parsed.map(p => ({
          ...p,
          authorId: p.authorId ?? demoAuthorIdFor(p.authorName),
          tags: p.tags.map(tag => normalizeFoodTag(tag)),
          photos: p.photos.slice(0, MAX_MUNCHIE_FEED_PHOTOS),
          comments: Array.isArray(p.comments) ? p.comments : [],
          dislikes: p.dislikes ?? 0,
        }));
      }
    } catch { /* fall through */ }
    // 실데이터 피드: 팀이 다녀와 찍은 사진·메뉴로 생성(scripts/genDriveFeed.py).
    return DRIVE_FEED_POSTS.map(post => ({
      ...post,
      authorId: post.authorId ?? demoAuthorIdFor(post.authorName),
      photos: post.photos.slice(0, MAX_MUNCHIE_FEED_PHOTOS),
    }));
  });

  const [likedFeedIds, setLikedFeedIds] = useState<string[]>(() => {
    try { const s = localStorage.getItem('lm_feed_likes'); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  const [dislikedFeedIds, setDislikedFeedIds] = useState<string[]>(() => {
    try { const s = localStorage.getItem('lm_feed_dislikes'); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  const [courseSkins, setCourseSkins] = useState<Record<string, string>>(() => {
    try { const s = localStorage.getItem('lm_course_skins'); return s ? JSON.parse(s) : {}; }
    catch { return {}; }
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const s = localStorage.getItem('lm_profile');
      if (s) {
        const parsed = JSON.parse(s) as UserProfile;
        let migratedId = false;
        // 과거 공용 ID('me')는 기기 고유 ID로 마이그레이션.
        if (!parsed.id || parsed.id === 'me') {
          parsed.id = generateUserId();
          migratedId = true;
        }
        const normalizedProfile = {
          ...parsed,
          lunchmateLoadout: normalizeLunchmateProfileLoadout(parsed.lunchmateLoadout),
          lunchmateOwnedItemIds: normalizeLunchmateOwnedItemIds(parsed.lunchmateOwnedItemIds),
          lunchmateRewardClaims: normalizeLunchmateRewardClaims(parsed.lunchmateRewardClaims),
        };
        if (migratedId) localStorage.setItem('lm_profile', JSON.stringify(normalizedProfile));
        return initialAuthUserId
          ? { ...normalizedProfile, id: initialAuthUserId }
          : normalizedProfile;
      }
    } catch { /* fall through */ }
    return { ...DEFAULT_PROFILE, id: initialAuthUserId ?? generateUserId() };
  });
  const initialStoredProfileRef = useRef(localStorage.getItem('lm_profile'));
  const isInitialProfilePersistenceRef = useRef(true);

  const refreshFeedPosts = useCallback(async () => {
    const response = await fetch('/api/feed');
    if (!response.ok) throw new Error('피드를 불러오지 못했어요.');
    const feedData = await response.json();
    if (!Array.isArray(feedData)) throw new Error('피드 형식이 올바르지 않아요.');
    const remoteFeeds = feedData.map((feed: any): FeedPost => ({
      id: feed.id,
      authorId: feed.creatorId,
      authorName: feed.authorName || (feed.creatorId === profile.id ? profile.name : feed.creatorId === 'user_minji' ? '김민지' : feed.creatorId === 'user_jenny' ? '제니' : feed.creatorId === 'user_minsu' ? '민수' : 'Lunchie 사용자'),
      authorEmoji: feed.creatorId === profile.id ? profile.emoji : feed.creatorId === 'user_minji' ? '🐰' : feed.creatorId === 'user_jenny' ? '🍓' : feed.creatorId === 'user_minsu' ? '🐻' : '🐳',
      courseId: feed.courseId,
      photos: (Array.isArray(feed.photos) ? feed.photos : []).filter((photo: unknown): photo is string => typeof photo === 'string').map((photo: string) => photo.startsWith('http') || photo.startsWith('/') ? photo : `/photos/${photo}`),
      templateId: typeof feed.templateId === 'string' ? feed.templateId : undefined,
      decor: Array.isArray(feed.decor) ? feed.decor : undefined,
      missingOriginalMedia: (!Array.isArray(feed.photos) || feed.photos.length === 0) && (!Array.isArray(feed.decor) || feed.decor.length === 0),
      caption: feed.description,
      skinId: 'default',
      likes: feed.likesCount || 0,
      saves: feed.savesCount || 0,
      dislikes: 0,
      comments: Array.isArray(feed.comments) ? feed.comments.map((comment: any) => ({
        id: comment.id, authorId: comment.authorId, authorName: comment.authorName,
        authorEmoji: comment.authorEmoji || '🐳', parentId: comment.parentId || undefined,
        text: comment.text, createdAt: typeof comment.createdAt === 'number' ? new Date(comment.createdAt).toISOString() : comment.createdAt,
        likes: 0, dislikes: 0,
      })) : [],
      tags: Array.isArray(feed.tags) ? feed.tags.map((tag: string) => normalizeFoodTag(tag)) : [],
      createdAt: feed.createdAt || new Date().toISOString(),
    }));
    setFeedPosts(previous => {
      const merged = new Map(previous.map(post => [post.id, post]));
      remoteFeeds.forEach(post => merged.set(post.id, post));
      return Array.from(merged.values()).sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt));
    });
  }, [profile.id, profile.name, profile.emoji]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/restaurants').then(r => (r.ok ? r.json() : Promise.reject())),
      fetch('/api/courses').then(r => (r.ok ? r.json() : Promise.reject())),
      fetch('/api/feed').then(r => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([resData, courseData, feedData]) => {
        if (Array.isArray(resData) && resData.length > 0) {
          setRestaurants(previous => {
            // 실데이터가 도착하면 mock 시드는 걷어낸다. 예전엔 previous(=MOCK_RESTAURANTS)에
            // 더하기만 해서 id가 안 겹치는 mock(서울 샘플)이 덱에 영구히 섞였다.
            // 세션 중 등록된 로컬 식당(registerRestaurants)은 보존한다.
            const mockIds = new Set(MOCK_RESTAURANTS.map(r => r.id));
            const merged = new Map(
              previous.filter(r => !mockIds.has(r.id)).map(restaurant => [restaurant.id, restaurant]),
            );
            resData.forEach((rawRestaurant: Restaurant & { latitude?: number; longitude?: number }) => merged.set(rawRestaurant.id, {
              ...rawRestaurant,
              // D1 uses latitude/longitude; the established browser contract
              // uses lat/lng. Normalise at this boundary so map and distance
              // UI never accidentally render a stale mock value.
              lat: Number(rawRestaurant.latitude ?? rawRestaurant.lat),
              lng: Number(rawRestaurant.longitude ?? rawRestaurant.lng),
              distance: typeof rawRestaurant.distance === 'string' ? rawRestaurant.distance : '',
              tags: Array.isArray(rawRestaurant.tags) ? rawRestaurant.tags.map(tag => normalizeFoodTag(tag)) : [],
              photos: Array.isArray(rawRestaurant.photos) ? rawRestaurant.photos.map(p => p.startsWith('http') || p.startsWith('/') ? p : `/photos/${p}`) : [],
            }));
            return Array.from(merged.values());
          });
        }
        if (Array.isArray(courseData) && courseData.length > 0) {
          const remoteCourses = courseData.map((course: Course) => limitCourseToThreeStops({
            ...course,
            tags: course.tags.map(tag => normalizeFoodTag(tag)),
          }));
          // 피드는 코스맵과 하나의 기록이다. API 갱신이 로컬 작성 코스를 지워
          // 피드 카드가 사라지지 않도록 원격 데이터와 기존 데이터를 ID 기준으로 병합한다.
          setCourses(previous => {
            const merged = new Map(previous.map(course => [course.id, course]));
            remoteCourses.forEach(course => merged.set(course.id, course));
            return Array.from(merged.values());
          });
        }
        if (Array.isArray(feedData) && feedData.length > 0) {
          const remoteFeeds = feedData.map((feed: any): FeedPost => ({
            id: feed.id,
            authorId: feed.creatorId,
            authorName: feed.authorName || (feed.creatorId === profile.id ? profile.name : feed.creatorId === 'user_minji' ? '김민지' : feed.creatorId === 'user_jenny' ? '제니' : feed.creatorId === 'user_minsu' ? '민수' : 'Lunchie 사용자'),
            authorEmoji: feed.creatorId === 'user_minji' ? '🐰' : feed.creatorId === 'user_jenny' ? '🍓' : feed.creatorId === 'user_minsu' ? '🐻' : '🐳',
            courseId: feed.courseId,
            photos: (Array.isArray(feed.photos) ? feed.photos : []).filter((photo: unknown): photo is string => typeof photo === 'string').map((photo: string) => photo.startsWith('http') || photo.startsWith('/') ? photo : `/photos/${photo}`),
            templateId: typeof feed.templateId === 'string' ? feed.templateId : undefined,
            decor: Array.isArray(feed.decor) ? feed.decor : undefined,
            missingOriginalMedia: (!Array.isArray(feed.photos) || feed.photos.length === 0) && (!Array.isArray(feed.decor) || feed.decor.length === 0),
            caption: feed.description,
            skinId: 'default',
            likes: feed.likesCount || 0,
            saves: feed.savesCount || 0,
            dislikes: 0,
            comments: Array.isArray(feed.comments) ? feed.comments.map((comment: any) => ({
              id: comment.id, authorId: comment.authorId, authorName: comment.authorName,
              authorEmoji: comment.authorEmoji || '🐳', parentId: comment.parentId || undefined,
              text: comment.text, createdAt: typeof comment.createdAt === 'number' ? new Date(comment.createdAt).toISOString() : comment.createdAt,
              likes: 0, dislikes: 0,
            })) : [],
            tags: Array.isArray(feed.tags) ? feed.tags.map((tag: string) => normalizeFoodTag(tag)) : [],
            createdAt: feed.createdAt || new Date().toISOString(),
          }));
          setFeedPosts(previous => {
            const merged = new Map(previous.map(post => [post.id, post]));
            remoteFeeds.forEach(post => merged.set(post.id, post));
            return Array.from(merged.values());
          });
        }
        setApiAvailable(true);
      })
      .catch(() => setApiAvailable(false))
      .finally(() => setIsLoading(false));
  }, []);

  // 과거 게시물의 배치는 localStorage에만 있었으므로, 작성자가 다시 접속했을 때
  // 서버로 한 번 승계한다. 다른 사용자는 이후부터 같은 R2 사진·배치를 받는다.
  useEffect(() => {
    // profile.id는 이전 익명 프로필을 잠깐 유지할 수 있다. 인증된 Google sub를
    // 우선 사용해야 과거 작성물이 실제 소유자로 판별되어 자동 복구된다.
    const ownerIds = new Set([initialAuthUserId, profile.id].filter((id): id is string => Boolean(id)));
    const legacy = feedPosts
      .filter((post): post is FeedPost & { courseId: string } => {
        const courseId = post.courseId;
        return typeof courseId === 'string' && typeof post.authorId === 'string' && ownerIds.has(post.authorId) && !post.decor?.length && !legacyMediaMigrationRef.current.has(courseId);
      })
      .map(post => ({ post, decor: getCoursemapDecor(post.courseId) }))
      .filter((item): item is { post: FeedPost; decor: NonNullable<ReturnType<typeof getCoursemapDecor>> } => Boolean(item.decor?.length));
    if (!legacy.length) return;
    void Promise.all(legacy.map(async ({ post, decor }) => {
      legacyMediaMigrationRef.current.add(post.courseId);
      try {
        // Old drafts can contain data URLs. Upload them before persisting the
        // layout so another browser receives durable R2 URLs, never local data.
        const serverDecor = await Promise.all(decor.map(async photo => {
          if (!photo.src.startsWith('data:image/')) return photo;
          const upload = await fetch('/api/uploads', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl: photo.src }),
          });
          const uploaded = await upload.json().catch(() => ({})) as { url?: string };
          if (!upload.ok || typeof uploaded.url !== 'string') throw new Error('legacy image upload failed');
          return { ...photo, src: uploaded.url };
        }));
        const response = await fetch('/api/course-media', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: post.courseId,
            feedPhotos: Array.from(new Set(serverDecor.map(photo => photo.src))),
            feedDecor: serverDecor,
            templateId: courseSkins[post.courseId],
          }),
        });
        if (!response.ok) throw new Error('legacy media migration failed');
      } catch {
        // A temporary network error may be retried after the next render.
        legacyMediaMigrationRef.current.delete(post.courseId);
        throw new Error('legacy media migration failed');
      }
    })).then(() => refreshFeedPosts()).catch(() => undefined);
  }, [courseSkins, feedPosts, initialAuthUserId, profile.id, refreshFeedPosts]);

  // 최초 legacy id → auth uid에서만 로컬 작성자 id를 승계한다. 이후 Google 충돌 계정 전환이나
  // 로그아웃→새 익명 uid에는 이전 계정의 로컬 소유권을 자동 양도하지 않는다.
  const profileIdRef = useRef(profile.id);
  useEffect(() => { profileIdRef.current = profile.id; }, [profile.id]);
  useEffect(() => {
    const adoptUid = (uid: string) => {
      const oldId = profileIdRef.current;
      const previousAuthUid = lastAuthUidRef.current;
      if (oldId !== uid) {
        profileIdRef.current = uid;
        setProfile(prev => ({ ...prev, id: uid }));
        if (previousAuthUid && previousAuthUid !== uid) setCurrentSession(null);
      }
      lastAuthUidRef.current = uid;
      localStorage.setItem(LAST_AUTH_UID_KEY, uid);
    };

    if (!initialAuthUserId) return;
    adoptUid(initialAuthUserId);
    // 기본 프로토타입 이름(지민)을 Google 계정 이름으로 덮는다. 이름이 없는
    // 계정은 사용자가 프로필에서 직접 정할 수 있다.
    void fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : null)
      .then((data: {
        user?: { sub?: string; name?: string; picture?: string };
        profile?: { username?: string | null; profile_image_url?: string | null } | null;
      } | null) => {
        const googleUser = data?.user;
        if (!googleUser || googleUser.sub !== initialAuthUserId) return;
        const serverProfile = data?.profile;
        setProfile(previous => ({
          ...previous,
          ...(serverProfile?.username || googleUser.name ? { name: serverProfile?.username || googleUser.name! } : {}),
          // A null server value is meaningful: the user deliberately removed
          // their photo and chose the emoji avatar. Never fall back to Google
          // in that case.
          ...(serverProfile ? { avatarPhoto: serverProfile.profile_image_url ?? undefined } : googleUser.picture ? { avatarPhoto: googleUser.picture } : {}),
        }));
      })
      .catch(() => { /* profile fallback remains usable */ });
  }, []);

  useEffect(() => { localStorage.setItem('lm_courses', JSON.stringify(courses)); }, [courses]);
  useEffect(() => { localStorage.setItem('lm_saved', JSON.stringify(savedCourseIds)); }, [savedCourseIds]);
  useEffect(() => { localStorage.setItem('lm_hidden_profile_templates', JSON.stringify(hiddenTemplateCourseIds)); }, [hiddenTemplateCourseIds]);
  useEffect(() => {
    if (currentSession) localStorage.setItem('lm_session', JSON.stringify(currentSession));
    else localStorage.removeItem('lm_session');
  }, [currentSession]);
  useEffect(() => { localStorage.setItem('lm_swipes', JSON.stringify(swipeRecords)); }, [swipeRecords]);
  useEffect(() => { localStorage.setItem('lm_saved_restaurants', JSON.stringify(savedRestaurantIds)); }, [savedRestaurantIds]);
  useEffect(() => {
    if (isInitialProfilePersistenceRef.current) {
      isInitialProfilePersistenceRef.current = false;
      try {
        const initiallyStoredProfile = initialStoredProfileRef.current
          ? JSON.parse(initialStoredProfileRef.current) as Partial<UserProfile>
          : null;
        if (initiallyStoredProfile?.id === profile.id) return;
      } catch { /* a corrupt legacy profile is safely replaced below */ }
    }
    localStorage.setItem('lm_profile', JSON.stringify(profile));
  }, [profile]);
  useEffect(() => {
    // 업로드 사진(data URL)이 크면 quota 초과가 날 수 있다 — 실패해도 앱은 계속 동작.
    try { localStorage.setItem('lm_feed_v3', JSON.stringify(feedPosts)); } catch { /* noop */ }
  }, [feedPosts]);
  useEffect(() => { localStorage.setItem('lm_feed_likes', JSON.stringify(likedFeedIds)); }, [likedFeedIds]);
  useEffect(() => { localStorage.setItem('lm_feed_dislikes', JSON.stringify(dislikedFeedIds)); }, [dislikedFeedIds]);
  useEffect(() => { localStorage.setItem('lm_course_skins', JSON.stringify(courseSkins)); }, [courseSkins]);

  const saveCourse = useCallback((id: string) => {
    setSavedCourseIds(prev => {
      const exists = prev.includes(id);
      if (!exists) logCourseSave(id);
      return exists ? prev : [...prev, id];
    });
  }, []);

  const unsaveCourse = useCallback((id: string) => {
    setSavedCourseIds(prev => prev.filter(i => i !== id));
  }, []);

  const addCourse = useCallback((course: Course) => {
    setCourses(prev => [limitCourseToThreeStops(course), ...prev]);
  }, []);

  const updateCourse = useCallback((courseId: string, updates: Partial<Course>) => {
    setCourses(previous => previous.map(course => course.id === courseId
      ? limitCourseToThreeStops({ ...course, ...updates })
      : course));
  }, []);

  // UI v2 keeps a local course catalogue in addition to the server feed cache.
  // The API remains authoritative for permanent deletion; this only prevents a
  // deleted course from surviving in the current client render.
  const deleteCourseWithFeed = useCallback((courseId: string) => {
    const removedPostIds = new Set(feedPosts.filter(post => post.courseId === courseId).map(post => post.id));
    setCourses(previous => previous.filter(course => course.id !== courseId));
    setSavedCourseIds(previous => previous.filter(id => id !== courseId));
    setHiddenTemplateCourseIds(previous => previous.filter(id => id !== courseId));
    setCourseSkins(previous => {
      if (!(courseId in previous)) return previous;
      const next = { ...previous };
      delete next[courseId];
      return next;
    });
    setFeedPosts(previous => previous.filter(post => post.courseId !== courseId));
    setLikedFeedIds(ids => ids.filter(id => !removedPostIds.has(id)));
    setDislikedFeedIds(ids => ids.filter(id => !removedPostIds.has(id)));
  }, [feedPosts]);

  const deleteProfileTemplate = useCallback((courseId: string) => {
    setHiddenTemplateCourseIds(previous => previous.includes(courseId) ? previous : [...previous, courseId]);
  }, []);

  const addFeedPost = useCallback((post: Omit<FeedPost, 'id' | 'likes' | 'shares' | 'saves' | 'comments' | 'createdAt'>) => {
    const full: FeedPost = {
      ...post,
      photos: post.photos.slice(0, MAX_MUNCHIE_FEED_PHOTOS),
      id: `f_${Date.now()}`,
      likes: 0,
      shares: 0,
      dislikes: 0,
      saves: 0,
      comments: [],
      createdAt: new Date().toISOString(),
    };
    setFeedPosts(prev => [full, ...prev]);
    return full;
  }, []);

  const updateFeedPost = useCallback((postId: string, updates: Partial<Pick<FeedPost, 'courseId' | 'caption' | 'skinId' | 'photos' | 'photoPlacements' | 'canvasStrokes' | 'tags'>>) => {
    setFeedPosts(posts => posts.map(p => p.id === postId
      ? { ...p, ...updates, photos: (updates.photos ?? p.photos).slice(0, MAX_MUNCHIE_FEED_PHOTOS) }
      : p));
  }, []);

  const deleteFeedPost = useCallback((postId: string) => {
    setFeedPosts(posts => posts.filter(p => p.id !== postId));
  }, []);

  const incrementFeedShare = useCallback((postId: string) => {
    setFeedPosts(posts => posts.map(post => post.id === postId
      ? { ...post, shares: (post.shares ?? 0) + 1 }
      : post));
  }, []);

  const toggleCommentHidden = useCallback((postId: string, commentId: string) => {
    setFeedPosts(posts => posts.map(p =>
      p.id === postId
        ? { ...p, comments: p.comments.map(c => c.id === commentId ? { ...c, hidden: !isFeedCommentHidden(c) } : c) }
        : p,
    ));
  }, []);

  const toggleFeedLike = useCallback((postId: string) => {
    setLikedFeedIds(prev => {
      const liked = prev.includes(postId);
      const wasDisliked = dislikedFeedIds.includes(postId);
      logFeedLike(postId, !liked);
      setFeedPosts(posts => posts.map(p =>
        p.id === postId ? {
          ...p,
          likes: Math.max(0, p.likes + (liked ? -1 : 1)),
          dislikes: Math.max(0, (p.dislikes ?? 0) - (!liked && wasDisliked ? 1 : 0)),
        } : p,
      ));
      if (!liked && wasDisliked) setDislikedFeedIds(ids => ids.filter(id => id !== postId));
      return liked ? prev.filter(i => i !== postId) : [...prev, postId];
    });
  }, [dislikedFeedIds]);

  const toggleFeedDislike = useCallback((postId: string) => {
    setDislikedFeedIds(prev => {
      const disliked = prev.includes(postId);
      const wasLiked = likedFeedIds.includes(postId);
      setFeedPosts(posts => posts.map(p =>
        p.id === postId ? {
          ...p,
          dislikes: Math.max(0, (p.dislikes ?? 0) + (disliked ? -1 : 1)),
          likes: Math.max(0, p.likes - (!disliked && wasLiked ? 1 : 0)),
        } : p,
      ));
      if (!disliked && wasLiked) setLikedFeedIds(ids => ids.filter(id => id !== postId));
      return disliked ? prev.filter(i => i !== postId) : [...prev, postId];
    });
  }, [likedFeedIds]);

  const addFeedComment = useCallback((postId: string, text: string, parentId?: string) => {
    const comment: FeedComment = {
      id: `cm_${Date.now()}`,
      authorName: profile.name,
      authorEmoji: profile.emoji,
      text,
      createdAt: new Date().toISOString(),
      likes: 0,
      dislikes: 0,
      parentId,
    };
    setFeedPosts(posts => posts.map(p =>
      p.id === postId ? { ...p, comments: [...p.comments, comment] } : p,
    ));
  }, [profile.name, profile.emoji]);

  const reactToFeedComment = useCallback((postId: string, commentId: string, reaction: 'like' | 'dislike') => {
    setFeedPosts(posts => posts.map(post => post.id !== postId ? post : {
      ...post,
      comments: post.comments.map(comment => {
        if (comment.id !== commentId) return comment;
        const previous = comment.myReaction;
        const next = previous === reaction ? undefined : reaction;
        return {
          ...comment,
          myReaction: next,
          likes: Math.max(0, (comment.likes ?? 0) + (next === 'like' ? 1 : 0) - (previous === 'like' ? 1 : 0)),
          dislikes: Math.max(0, (comment.dislikes ?? 0) + (next === 'dislike' ? 1 : 0) - (previous === 'dislike' ? 1 : 0)),
        };
      }),
    }));
  }, []);

  const reportFeedComment = useCallback((postId: string, commentId: string) => {
    setFeedPosts(posts => posts.map(post => post.id !== postId ? post : {
      ...post,
      comments: post.comments.map(comment => comment.id === commentId
        ? { ...comment, reported: true }
        : comment),
    }));
  }, []);

  const isMyPost = useCallback((post: FeedPost) => post.authorId === profile.id, [profile.id]);

  const setCourseSkin = useCallback((courseId: string, skinId: string | null) => {
    setCourseSkins(prev => {
      if (!skinId) {
        const { [courseId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [courseId]: skinId };
    });
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

    // 항상 서버 등록을 먼저 시도한다. apiAvailable로 게이트하면 안 되는 이유:
    // apiAvailable은 부팅 시 /api/restaurants·courses 응답 후에야 true가 되는데,
    // (DB 타임아웃 등으로) 그 전에 세션을 만들면 서버는 모르는 로컬 전용 세션이 되어
    // 초대 링크를 받은 다른 유저가 전부 "유효하지 않은 세션"(404)을 보게 된다.
    {
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
            originLatitude: filters.originLatitude,
            originLongitude: filters.originLongitude,
            filterBudget: filters.budget,
            filterCategories: filters.categories,
            filterDietary: filters.dietary,
            intent: filters.intent,
            hostPreferences: profile.categoryPrefs,
            hostDietary: profile.dietary,
            deadlineMinutes,
          }),
        });
        const data = await res.json().catch(() => ({})) as { session?: { id: string }; token?: string; error?: string };
        if (!res.ok || !data.session?.id || !data.token) throw new Error(data.error ?? '세션을 서버에 저장하지 못했어요.');
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
            deadline: null, // 마감 타이머는 투표 시작 시점에 적용
            deadlineMinutes,
            status: 'waiting',
            restaurants: [],
            modelVersion: 'session-group-pending-v1',
            results: [],
          };
        setCurrentSession(session);
        return session;
      } catch (error) {
        // A local-only session must never offer a QR/link: another device
        // cannot resolve it. Settings page turns this into a visible error.
        throw error;
      }
    }
  }, [profile, restaurants]);

  const fetchSession = useCallback(async (token: string): Promise<GroupSession> => {
    const res = await fetch(`/api/sessions/${token}`);
    if (!res.ok) throw new Error('Session not found');
    const data = await res.json();
    const status = (data.session.status as string).toLowerCase() as GroupSession['status'];
    const serverIntent = data.session.intent === 'meal' || data.session.intent === 'cafe' || data.session.intent === 'dessert'
      ? data.session.intent as Intent
      : undefined;
    // Migration 전 로컬 D1에서 읽은 레거시 세션만, 직전 화면의 선택을 보조적으로 유지한다.
    const prevIntent = currentSessionRef.current?.inviteCode === token ? currentSessionRef.current.filters.intent : undefined;
    const sessFilters = {
      partySize: data.session.group_size,
      dietary: data.session.filter_dietary || [],
      budget: data.session.filter_budget,
      radius: data.session.filter_distance,
      originLatitude: data.session.origin_latitude,
      originLongitude: data.session.origin_longitude,
      categories: data.session.filter_vibe || [],
      intent: serverIntent ?? prevIntent,
    };
    const sharedDeckIds: string[] = Array.isArray(data.session.deck_ids)
      ? data.session.deck_ids.filter((id: unknown): id is string => typeof id === 'string')
      : [];
    // New sessions always use the server-persisted candidate order. Waiting
    // rooms deliberately have no cards: the slate is made only after every
    // participant has supplied a preference snapshot and marked ready.
    const sharedRestaurants = sharedDeckIds
      .map(id => restaurants.find(restaurant => restaurant.id === id))
      .filter((restaurant): restaurant is Restaurant => Boolean(restaurant));
    const distanceAwareRestaurants = withSessionDistances(sharedRestaurants, sessFilters);
    const deck = distanceAwareRestaurants.length === sharedDeckIds.length && distanceAwareRestaurants.length > 0
      ? {
          restaurants: distanceAwareRestaurants,
          slateId: `session:${data.session.id}`,
          recMeta: Object.fromEntries(distanceAwareRestaurants.map((restaurant, index) => [restaurant.id, { propensity: 1 / distanceAwareRestaurants.length, position: index }])),
          modelVersion: 'session-shared-slate-v1',
        }
      : status === 'waiting'
        ? { restaurants: [], slateId: undefined, recMeta: undefined, modelVersion: 'session-group-pending-v1' }
        : await buildDeck(sessFilters, restaurants, profile.id);
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
      filters: sessFilters,
      // 대기 중에는 마감 미적용 — 투표 시작 시점에 서버가 deadline_at을 갱신한다
      deadline: status === 'waiting' ? null : data.session.deadline_at,
      status,
      restaurants: deck.restaurants,
      slateId: deck.slateId,
      recMeta: deck.recMeta,
      modelVersion: deck.modelVersion,
      results: [],
    };
    // 서버 응답에는 없는 로컬 정보(세션 이름, 마감 타이밍 설정)는 유지한다
    setCurrentSession(prev =>
      prev && prev.inviteCode === token
        ? { ...session, name: prev.name, deadlineMinutes: prev.deadlineMinutes }
        : session,
    );
    return session;
  }, [restaurants]);

  const joinSession = useCallback(async (token: string, name?: string, emoji?: string) => {
    const response = await fetch(`/api/sessions/${token}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: profile.id,
        userName: name || profile.name,
        emoji: emoji || profile.emoji,
        preferences: profile.categoryPrefs,
        dietary: profile.dietary,
      }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(payload.error ?? '세션에 참가하지 못했어요.');
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

  const startSession = useCallback(async (token: string, deadlineMinutes?: number) => {
    const minutes = deadlineMinutes ?? currentSession?.deadlineMinutes ?? 10;
    // A group session has one D1 state machine. Starting locally after a
    // failed server request split participants into different realities:
    // each person could finish cards, while the shared result never advanced.
    const res = await fetch(`/api/sessions/${token}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SWIPING_1', deadlineMinutes: minutes, userId: profile.id }),
    });
    const payload = await res.json().catch(() => ({})) as { error?: string; code?: string };
    if (!res.ok) {
      const error = new Error(payload.error ?? '세션을 시작하지 못했어요.') as Error & { code?: string };
      error.code = payload.code;
      throw error;
    }
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

    // Sessions are created server-first, so their swipes must also be sent
    // server-first.  `apiAvailable` is only a catalogue boot hint; using it
    // here used to silently turn a valid shared session into local-only votes.
    if (currentSession) {
      fetch('/api/swipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `swipe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          session_id: currentSession.id,
          user_id: profile.id,
          restaurant_id: restaurantId,
          round: 2 * (currentSession.generation ?? 1) - 1, // 세대별 예선 라운드 (gen1=1, gen2=3, …)
          swipe_action: action === 'like' || action === 'save' ? 'LIKE' : 'DISLIKE',
          created_at: new Date(),
        }),
      }).then(response => {
        if (!response.ok) console.error('Failed to persist session swipe');
      }).catch(() => { });
    }
  }, [currentSession, profile.id]);

  // "다시 고르기": 로컬 스와이프 기록을 지워야 카드가 처음부터 다시 나온다.
  // 안 지우면 예선 자동완료 감지(unswipedCount===0)가 즉시 다시 걸려 결정 화면으로 튕긴다.
  const clearSessionSwipes = useCallback((sessionId: string) => {
    setSwipeRecords(prev => prev.filter(s => s.sessionId !== sessionId));
  }, []);

  // 그룹 reroll: 거절·다수미움(excludeIds) 뺀 fresh 풀로 새 덱 → 세대 +1. 멤버 각자 재스와이프.
  const rerollSession = useCallback(async (excludeIds: string[]) => {
    if (!currentSession) return;
    const exclude = new Set(excludeIds);
    const freshPool = restaurants.filter(r => !exclude.has(r.id));
    const deck = await buildDeck(currentSession.filters, freshPool, profile.id);
    setCurrentSession(prev => prev ? {
      ...prev,
      restaurants: deck.restaurants,
      slateId: deck.slateId,
      recMeta: deck.recMeta,
      modelVersion: deck.modelVersion,
      generation: (prev.generation ?? 1) + 1,
    } : prev);
  }, [currentSession, restaurants, profile.id]);

  const likedRestaurantIds = swipeRecords
    .filter(s => s.action === 'like' || s.action === 'save')
    .map(s => s.restaurantId);

  const saveRestaurant = useCallback((id: string) => {
    setSavedRestaurantIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const unsaveRestaurant = useCallback((id: string) => {
    setSavedRestaurantIds(prev => prev.filter(i => i !== id));
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
    if (updates.name !== undefined || updates.emoji !== undefined || updates.lunchmateXp !== undefined || updates.lunchmateTotalXp !== undefined) {
      setFeedPosts(posts => posts.map(post => post.authorId === profile.id
        ? {
            ...post,
            authorName: updates.name ?? post.authorName,
            authorEmoji: updates.emoji ?? post.authorEmoji,
          }
        : post));
    }
  }, [profile.id]);

  const getRestaurantById = useCallback((id: string) => restaurants.find(r => r.id === id), [restaurants]);
  const getCourseById = useCallback((id: string) => courses.find(c => c.id === id), [courses]);

  const registerRestaurants = useCallback((newRestaurants: Restaurant[]) => {
    setRestaurants(prev => {
      const byId = new Map(prev.map(r => [r.id, r] as const));
      for (const r of newRestaurants) byId.set(r.id, r);
      return Array.from(byId.values());
    });
  }, []);

  return (
    <AppContext.Provider value={{
      courses, savedCourseIds, saveCourse, unsaveCourse, addCourse, updateCourse, deleteCourseWithFeed,
      hiddenTemplateCourseIds, deleteProfileTemplate,
      currentSession, setCurrentSession, createSession, joinSession, fetchSession, toggleReady, startSession,
      swipeRecords, addSwipe, clearSessionSwipes, rerollSession, likedRestaurantIds,
      savedRestaurantIds, saveRestaurant, unsaveRestaurant,
      profile, updateProfile,
      feedPosts, refreshFeedPosts, addFeedPost, updateFeedPost, deleteFeedPost, incrementFeedShare,
      likedFeedIds, dislikedFeedIds, toggleFeedLike, toggleFeedDislike, addFeedComment,
      reactToFeedComment, reportFeedComment, toggleCommentHidden, isMyPost,
      courseSkins, setCourseSkin,
      restaurants, registerRestaurants,
      getRestaurantById, getCourseById,
      isLoading, apiAvailable,
    }}>
      <div
        className="contents"
        data-testid="app-identity"
        data-identity-aligned={initialAuthUserId ? String(profile.id === initialAuthUserId) : 'auth-unavailable'}
      >
        {children}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
