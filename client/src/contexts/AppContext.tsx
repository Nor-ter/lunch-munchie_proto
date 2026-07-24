/**
 * Lunchie Munchie — App Context
 * Design: Soft Coral (Option 8)
 * Manages: courses, restaurants, sessions, profile, swipe data
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { normalizeDiet, isHardRestriction, type DietTag } from '@shared/const';
import { intentForHour, type Intent } from '@shared/intent';
import { normalizeFoodTag, type TagType } from '@/constants/foodTags';
import { isWebAuthConfigured } from '@/contexts/AuthContext';
import { MAX_MUNCHIE_FEED_PHOTOS } from '@/lib/coursemapDecor';
import type {
  LunchmateProfileLoadout,
  LunchmateRoomLoadout,
} from '@/types/lunchmateCustomization';
import {
  normalizeLunchmateOwnedItemIds,
  normalizeLunchmateProfileLoadout,
  normalizeLunchmateRewardClaims,
  type LunchmateRewardClaim,
} from '@/utils/lunchmateProfile';
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
  /** 런치메이트룸의 독립 wall/floor/furniture/props 선택. 없으면 foodieSkin preset 사용. */
  lunchmateRoomLoadout?: LunchmateRoomLoadout;
  /** 런치메이트룸에서 적용한 네 slot 코스튬 조합 */
  lunchmateLoadout?: LunchmateProfileLoadout;
  /** 보유한 런치메이트 코스튬 manifest ID 목록 */
  lunchmateOwnedItemIds?: string[];
  /** 현재 브라우저 preview에서 지급한 레벨별 코스튬 이력 */
  lunchmateRewardClaims?: LunchmateRewardClaim[];
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
  courseId: string;
  photos: string[];
  caption: string;
  skinId: string;
  likes: number;
  dislikes?: number;
  saves: number;
  comments: FeedComment[];
  createdAt: string;
  tags: TagType[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: 'r1', name: '카페 레이아웃', category: '카페',
    tags: ['데이트코스', '카페'], rating: 4.8, reviewCount: 2341,
    distance: '350m', address: '서울 성동구 성수이로7길 26',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80',
    lat: 37.5447, lng: 127.0561, priceRange: 2, openHours: '09:00–22:00',
    dietary: ['비건 옵션'], description: '성수동 감성 카페. 빈티지 인테리어와 정원이 아름다운 곳.',
  },
  {
    id: 'r2', name: '성수연방', category: '복합문화공간',
    tags: ['데이트코스', '디저트'], rating: 4.6, reviewCount: 1892,
    distance: '520m', address: '서울 성동구 연무장5가길 7',
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663322273601/2bdpbPnYmCuK9PccZ3SWKc/lm-course-seongsu-hGTsaQPMJotuBpuyBnE5dN.webp',
    lat: 37.5441, lng: 127.0571, priceRange: 2, openHours: '11:00–21:00',
    dietary: [], description: '성수동 복합문화공간. 다양한 팝업스토어와 카페가 모여있는 곳.',
  },
  {
    id: 'r3', name: '어니언 성수', category: '베이커리',
    tags: ['카페', '디저트'], rating: 4.9, reviewCount: 5621,
    distance: '680m', address: '서울 성동구 아차산로9길 8',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80',
    lat: 37.5451, lng: 127.0551, priceRange: 2, openHours: '08:00–22:00',
    dietary: ['비건 옵션'], description: '성수동 대표 베이커리 카페. 시그니처 소금빵이 유명.',
  },
  {
    id: 'r4', name: '대림창고', category: '레스토랑',
    tags: ['데이트코스', '맛집'], rating: 4.7, reviewCount: 3201,
    distance: '900m', address: '서울 성동구 성수이로 78',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    lat: 37.5438, lng: 127.0581, priceRange: 3, openHours: '11:30–22:00',
    dietary: [], description: '창고를 개조한 감성 레스토랑. 브런치와 파스타가 인기.',
  },
  {
    id: 'r5', name: '서울숲 피크닉', category: '공원',
    tags: ['펍나이트', '데이트코스'], rating: 4.5, reviewCount: 8901,
    distance: '1.2km', address: '서울 성동구 뚝섬로 273',
    image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&q=80',
    lat: 37.5445, lng: 127.0611, priceRange: 1, openHours: '06:00–22:00',
    dietary: [], description: '서울 도심 속 자연. 피크닉과 산책을 즐길 수 있는 도심 공원.',
  },
  {
    id: 'r6', name: '한남 브런치 클럽', category: '브런치',
    tags: ['맛집', '혼밥'], rating: 4.6, reviewCount: 1234,
    distance: '2.1km', address: '서울 용산구 이태원로 240',
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663322273601/2bdpbPnYmCuK9PccZ3SWKc/lm-course-hannam-EMhDLXHPSYVSTV5cbEekLC.webp',
    lat: 37.5349, lng: 126.9990, priceRange: 3, openHours: '10:00–21:00',
    dietary: ['글루텐프리 옵션', '비건 옵션'], description: '한남동 감성 브런치 카페. 에그베네딕트와 아보카도 토스트가 시그니처.',
  },
  {
    id: 'r7', name: '북촌 한옥 찻집', category: '전통찻집',
    tags: ['브런치', '혼밥'], rating: 4.8, reviewCount: 2109,
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
    tags: ['맛집', '데이트코스'], rating: 4.9, reviewCount: 891,
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
    tags: ['맛집', '혼밥'], rating: 4.7, reviewCount: 1043,
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
    tags: ['맛집', '데이트코스'], rating: 4.8, reviewCount: 1567,
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
    tags: ['혼밥', '가성비'], rating: 4.1, reviewCount: 980,
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
    tags: ['맛집', '데이트코스'], rating: 4.5, reviewCount: 2670,
    distance: '1.5km', address: '서울 마포구 연남로 30',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80',
    lat: 37.5620, lng: 126.9230, priceRange: 3, openHours: '11:30–22:30',
    dietary: ['채식'], description: '화덕에서 구운 정통 나폴리 피자. 쫄깃한 도우.',
  },
  {
    id: 'r20', name: '디저트 카페 슈가', category: '카페',
    tags: ['카페', '디저트'], rating: 4.7, reviewCount: 3340,
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
    tags: ['데이트코스', '카페'],
    hashtags: ['#데이트', '#카페', '#분위기', '#성수핫플'],
    region: '성수동',
    metadata: { distance: 3.2, duration: 300, placeCount: 3 },
    stops: [
      { placeId: 'r1', order: 1, startTime: '10:00', endTime: '11:00', isBookmarked: false },
      { placeId: 'r2', order: 2, startTime: '11:20', endTime: '12:30', isBookmarked: false },
      { placeId: 'r3', order: 3, startTime: '12:40', endTime: '14:00', isBookmarked: true },
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
    tags: ['브런치', '혼밥'],
    hashtags: ['#브런치', '#한남', '#주말'],
    region: '한남동',
    metadata: { distance: 2.7, duration: 240, placeCount: 3 },
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
    tags: ['카페', '디저트'],
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
    tags: ['맛집', '펍나이트'],
    hashtags: ['#연남동', '#맛집', '#투어'],
    region: '연남동',
    metadata: { distance: 3.8, duration: 360, placeCount: 3 },
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

export const MOCK_FEED_POSTS: FeedPost[] = [
  {
    id: 'f1',
    authorName: '지민',
    authorEmoji: '😊',
    courseId: 'c1',
    photos: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80',
      'https://d2xsxph8kpxj0f.cloudfront.net/310519663322273601/2bdpbPnYmCuK9PccZ3SWKc/lm-course-seongsu-hGTsaQPMJotuBpuyBnE5dN.webp',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
    ],
    caption: '성수 골목을 다 걸었다. 카페부터 공원까지 완벽한 하루~! 추천 💕',
    skinId: 'pink-picnic',
    likes: 23,
    saves: 18,
    comments: [
      { id: 'cm1', authorName: '제니', authorEmoji: '🐳', text: '코스 순서까지 완벽해요! 바로 저장했습니다 👍', createdAt: '2026-07-09T13:00:00.000Z' },
      { id: 'cm2', authorName: '민수', authorEmoji: '🍜', text: '2번 카페 웨이팅 심한가요?', createdAt: '2026-07-09T14:10:00.000Z' },
      { id: 'cm3', authorName: '익명123', authorEmoji: '😈', text: '광고글 티난다ㅋ 노잼 코스', createdAt: '2026-07-09T15:22:00.000Z' },
    ],
    createdAt: '2026-07-09T12:30:00.000Z',
    tags: ['데이트코스', '카페'],
  },
  {
    id: 'f2',
    authorName: '제니',
    authorEmoji: '🐳',
    courseId: 'c2',
    photos: [
      'https://d2xsxph8kpxj0f.cloudfront.net/310519663322273601/2bdpbPnYmCuK9PccZ3SWKc/lm-course-hannam-EMhDLXHPSYVSTV5cbEekLC.webp',
      'https://d2xsxph8kpxj0f.cloudfront.net/310519663322273601/2bdpbPnYmCuK9PccZ3SWKc/lm-course-bukchon-ATNXaSXg79mMDT2jnbpMuD.webp',
    ],
    caption: '주말 브런치는 역시 한남. 에그베네딕트가 진리 😋',
    skinId: 'vintage-frame',
    likes: 41,
    saves: 27,
    comments: [
      { id: 'cm4', authorName: '지민', authorEmoji: '😊', text: '빈티지 스킨 너무 잘 어울려요 🎞️', createdAt: '2026-07-08T12:00:00.000Z' },
      { id: 'cm5', authorName: '수아', authorEmoji: '🥐', text: '다음 주말에 그대로 따라가볼게요!', createdAt: '2026-07-08T15:30:00.000Z' },
    ],
    createdAt: '2026-07-08T11:00:00.000Z',
    tags: ['브런치', '혼밥'],
  },
  {
    id: 'f3',
    authorName: '민수',
    authorEmoji: '🍜',
    courseId: 'c4',
    photos: [
      'https://d2xsxph8kpxj0f.cloudfront.net/310519663322273601/2bdpbPnYmCuK9PccZ3SWKc/lm-course-yeonnam-eiXe5dfjEAvbX6RscXaFtr.webp',
      'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800&q=80',
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
    ],
    caption: '연남동 맛집 3연타… 배 터질 뻔했지만 후회는 없다!',
    skinId: 'blue-note',
    likes: 15,
    saves: 9,
    comments: [
      { id: 'cm6', authorName: '제니', authorEmoji: '🐳', text: '마라탕 국물 진하죠 ㅠㅠ 최고', createdAt: '2026-07-07T14:00:00.000Z' },
    ],
    createdAt: '2026-07-07T13:20:00.000Z',
    tags: ['맛집', '펍나이트'],
  },
];

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
  addFeedPost: (post: Omit<FeedPost, 'id' | 'likes' | 'saves' | 'comments' | 'createdAt'>) => FeedPost;
  updateFeedPost: (postId: string, updates: Partial<Pick<FeedPost, 'courseId' | 'caption' | 'skinId' | 'photos' | 'tags'>>) => void;
  deleteFeedPost: (postId: string) => void;
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
   * 서버(Supabase restaurants 테이블)에는 Edge Function이 이미 upsert 해뒀으니
   * 다음 부팅 시 /api/restaurants 로 자연히 들어옴 — 이건 같은 세션 내 즉시 반영용. */
  registerRestaurants: (newRestaurants: Restaurant[]) => void;
  getRestaurantById: (id: string) => Restaurant | undefined;
  getCourseById: (id: string) => Course | undefined;
  isLoading: boolean;
  apiAvailable: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export type ApiRequestAuth =
  | {
      status: 'authenticated';
      accessToken: string;
    }
  | {
      status: 'anonymous';
    }
  | {
      status: 'blocked';
    };

interface ApiAuthEnvironment {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ApiAuthClient {
  auth: {
    getSession: () => Promise<{
      data: {
        session: {
          access_token: string;
        } | null;
      };
      error: unknown;
    }>;
  };
}

interface ApiRequestAuthOptions {
  environment?: ApiAuthEnvironment;
  loadClient?: () => Promise<ApiAuthClient>;
}

export async function resolveApiRequestAuth(
  options: ApiRequestAuthOptions = {},
): Promise<ApiRequestAuth> {
  const environment = options.environment ?? {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY:
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
  const configured = Boolean(
    environment.VITE_SUPABASE_URL?.trim()
    && environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );

  if (!configured) {
    return { status: 'anonymous' };
  }

  try {
    const client = await (
      options.loadClient
      ?? (async () => (await import('@/lib/supabase')).supabase)
    )();
    const { data, error } = await client.auth.getSession();

    if (error) {
      return { status: 'blocked' };
    }

    if (!data.session) {
      return { status: 'anonymous' };
    }

    if (!data.session.access_token) {
      return { status: 'blocked' };
    }

    return {
      status: 'authenticated',
      accessToken: data.session.access_token,
    };
  } catch {
    return { status: 'blocked' };
  }
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
    matchesDiet(r.category, r.dietary, filters.dietary),
  );
  if (base.length === 0) return { restaurants: base };
  try {
    const auth = await (
      dependencies.resolveRequestAuth ?? resolveApiRequestAuth
    )();
    if (auth.status === 'blocked') {
      return { restaurants: base };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (auth.status === 'authenticated') {
      headers.Authorization = `Bearer ${auth.accessToken}`;
    }

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
    if (!res.ok) return { restaurants: base };
    const data = await res.json();
    const meta: GroupSession['recMeta'] = {};
    const slate: Restaurant[] = [];
    for (const s of data.slate as { id: string; propensity: number; rank: number }[]) {
      meta![s.id] = { propensity: s.propensity, position: s.rank };
      const r = base.find(x => x.id === s.id);
      if (r) slate.push(r);
    }
    // 덱 = 슬레이트(top-7)만. 노출(IMPRESSION)·스와이프가 정확히 일치한다.
    return { restaurants: slate.length ? slate : base, slateId: data.slate_id, recMeta: meta, modelVersion: data.model_version };
  } catch {
    return { restaurants: base };
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
  const isFirstAuthAdoption = Boolean(initialAuthUserId && !lastAuthUidRef.current);
  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const s = localStorage.getItem('lm_courses');
      const stored = s ? JSON.parse(s) as Course[] : [];
      const merged = new Map(MOCK_COURSES.map(course => [course.id, course]));
      stored.forEach(course => {
        const baseline = merged.get(course.id);
        const hasResolvableStops = course.stops?.some(stop => (
          MOCK_RESTAURANTS.some(restaurant => restaurant.id === stop.placeId)
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
    catch { return MOCK_COURSES; }
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
    // v2: comments가 배열로 바뀌면서 키를 올렸다. 구버전(lm_feed) 데이터는 버리고 재시드.
    try {
      const s = localStorage.getItem('lm_feed_v2');
      if (s) {
        const parsed = JSON.parse(s) as FeedPost[];
        return parsed.map(p => ({
          ...p,
          authorId: isFirstAuthAdoption && p.authorId === legacyProfileIdRef.current
            ? initialAuthUserId ?? p.authorId
            : p.authorId,
          tags: p.tags.map(tag => normalizeFoodTag(tag)),
          photos: p.photos.slice(0, MAX_MUNCHIE_FEED_PHOTOS),
          comments: Array.isArray(p.comments) ? p.comments : [],
          dislikes: p.dislikes ?? 0,
        }));
      }
    } catch { /* fall through */ }
    return MOCK_FEED_POSTS.map((post, index) => ({
      ...post,
      ...(index === 0 && initialAuthUserId ? { authorId: initialAuthUserId } : {}),
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

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/restaurants').then(r => (r.ok ? r.json() : Promise.reject())),
      fetch('/api/courses').then(r => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([resData, courseData]) => {
        if (Array.isArray(resData) && resData.length > 0) {
          setRestaurants(previous => {
            const merged = new Map(previous.map(restaurant => [restaurant.id, restaurant]));
            resData.forEach((restaurant: Restaurant) => merged.set(restaurant.id, {
              ...restaurant,
              tags: restaurant.tags.map(tag => normalizeFoodTag(tag)),
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
        setApiAvailable(true);
      })
      .catch(() => setApiAvailable(false))
      .finally(() => setIsLoading(false));
  }, []);

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

    if (initialAuthUserId) adoptUid(initialAuthUserId);

    if (!isWebAuthConfigured()) return;

    let active = true;
    let unsubscribe: (() => void) | undefined;

    void import('@/lib/supabase').then(({ supabase }) => {
      if (!active) return;

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) adoptUid(session.user.id);
      });
      unsubscribe = () => subscription.unsubscribe();
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
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
        // 동일 사용자의 legacy profile read는 쓰기를 유발하지 않는다.
        // 신규 profile, legacy "me" migration, auth uid adoption은 기존처럼 즉시 저장한다.
        if (initiallyStoredProfile?.id === profile.id) return;
      } catch {
        // 손상된 값은 아래의 정상 profile로 교체한다.
      }
    }
    localStorage.setItem('lm_profile', JSON.stringify(profile));
  }, [profile]);
  useEffect(() => {
    // 업로드 사진(data URL)이 크면 quota 초과가 날 수 있다 — 실패해도 앱은 계속 동작.
    try { localStorage.setItem('lm_feed_v2', JSON.stringify(feedPosts)); } catch { /* noop */ }
  }, [feedPosts]);
  useEffect(() => { localStorage.setItem('lm_feed_likes', JSON.stringify(likedFeedIds)); }, [likedFeedIds]);
  useEffect(() => { localStorage.setItem('lm_feed_dislikes', JSON.stringify(dislikedFeedIds)); }, [dislikedFeedIds]);
  useEffect(() => { localStorage.setItem('lm_course_skins', JSON.stringify(courseSkins)); }, [courseSkins]);

  const saveCourse = useCallback((id: string) => {
    setSavedCourseIds(prev => prev.includes(id) ? prev : [...prev, id]);
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

  const deleteProfileTemplate = useCallback((courseId: string) => {
    setHiddenTemplateCourseIds(previous => previous.includes(courseId) ? previous : [...previous, courseId]);
  }, []);

  const addFeedPost = useCallback((post: Omit<FeedPost, 'id' | 'likes' | 'saves' | 'comments' | 'createdAt'>) => {
    const full: FeedPost = {
      ...post,
      photos: post.photos.slice(0, MAX_MUNCHIE_FEED_PHOTOS),
      id: `f_${Date.now()}`,
      likes: 0,
      dislikes: 0,
      saves: 0,
      comments: [],
      createdAt: new Date().toISOString(),
    };
    setFeedPosts(prev => [full, ...prev]);
    return full;
  }, []);

  const updateFeedPost = useCallback((postId: string, updates: Partial<Pick<FeedPost, 'courseId' | 'caption' | 'skinId' | 'photos' | 'tags'>>) => {
    setFeedPosts(posts => posts.map(p => p.id === postId
      ? { ...p, ...updates, photos: (updates.photos ?? p.photos).slice(0, MAX_MUNCHIE_FEED_PHOTOS) }
      : p));
  }, []);

  const deleteFeedPost = useCallback((postId: string) => {
    setFeedPosts(posts => posts.filter(p => p.id !== postId));
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
            filterBudget: filters.budget,
            filterCategories: filters.categories,
            filterDietary: filters.dietary,
            deadlineMinutes,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const deck = await buildDeck(filters, restaurants, profile.id);
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
            restaurants: deck.restaurants,
            slateId: deck.slateId,
            recMeta: deck.recMeta,
            modelVersion: deck.modelVersion,
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
    const deck = await buildDeck(filters, restaurants, profile.id);
    session.restaurants = deck.restaurants;
    session.slateId = deck.slateId;
    session.recMeta = deck.recMeta;
    session.modelVersion = deck.modelVersion;
    session.deadlineMinutes = deadlineMinutes;
    setCurrentSession(session);
    return session;
  }, [profile, restaurants]);

  const fetchSession = useCallback(async (token: string): Promise<GroupSession> => {
    const res = await fetch(`/api/sessions/${token}`);
    if (!res.ok) throw new Error('Session not found');
    const data = await res.json();
    const status = (data.session.status as string).toLowerCase() as GroupSession['status'];
    // 서버 sessions 테이블에 intent 컬럼이 없어 서버 응답엔 안 실려옴 — 직전 로컬 세션의 intent를 승계.
    const prevIntent = currentSessionRef.current?.inviteCode === token ? currentSessionRef.current.filters.intent : undefined;
    const sessFilters = {
      partySize: data.session.group_size,
      dietary: data.session.filter_dietary || [],
      budget: data.session.filter_budget,
      radius: data.session.filter_distance,
      categories: data.session.filter_vibe || [],
      intent: prevIntent,
    };
    const deck = await buildDeck(sessFilters, restaurants, profile.id);
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

  const startSession = useCallback(async (token: string, deadlineMinutes?: number) => {
    const minutes = deadlineMinutes ?? currentSession?.deadlineMinutes ?? 10;

    // 1) 서버에 상태 변경을 시도한다 (DB가 살아 있을 때 정상 동작).
    //    마감 타이머는 이 시점(투표 시작)부터 적용된다.
    try {
      const res = await fetch(`/api/sessions/${token}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SWIPING_1', deadlineMinutes: minutes }),
      });
      if (res.ok) {
        try {
          return await fetchSession(token);
        } catch {
          // 서버 상태는 바꿨지만 재동기화 실패 → 아래 로컬 진행으로 폴백
        }
      }
    } catch {
      // 네트워크/DB 사용 불가 → 아래 로컬(오프라인) 세션으로 폴백
    }

    // 2) 로컬 폴백: 백엔드(DB)가 없어도 투표를 시작할 수 있게 메모리상의
    //    세션 상태를 직접 진행시킨다. (restaurants/courses의 mock 폴백과 동일한 취지)
    if (!currentSession) throw new Error('No active session to start');
    const next: GroupSession = {
      ...currentSession,
      status: 'voting',
      deadline: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
    };
    setCurrentSession(next);
    return next;
  }, [currentSession, fetchSession]);

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
          round: 2 * (currentSession.generation ?? 1) - 1, // 세대별 예선 라운드 (gen1=1, gen2=3, …)
          swipe_action: action === 'like' || action === 'save' ? 'LIKE' : 'DISLIKE',
          created_at: new Date(),
        }),
      }).catch(() => {});
    }
  }, [apiAvailable, currentSession, profile.id]);

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
  }, []);

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
      courses, savedCourseIds, saveCourse, unsaveCourse, addCourse, updateCourse,
      hiddenTemplateCourseIds, deleteProfileTemplate,
      currentSession, setCurrentSession, createSession, joinSession, fetchSession, toggleReady, startSession,
      swipeRecords, addSwipe, clearSessionSwipes, rerollSession, likedRestaurantIds,
      savedRestaurantIds, saveRestaurant, unsaveRestaurant,
      profile, updateProfile,
      feedPosts, addFeedPost, updateFeedPost, deleteFeedPost,
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
