/**
 * Lunchie Mode — Quick Match
 * Flow: Invitation & Settings → 예선전(Swipe#1) → 결승전(Swipe#2) → Winner
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Ref } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, animate } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  ArrowLeft, Link2, Users, Clock, SlidersHorizontal,
  Heart, X, MapPin, Star, Share2, Navigation, Phone, Download, Home,
} from 'lucide-react';
import { toBlob } from 'html-to-image';
import { useApp, MOCK_RESTAURANTS, Restaurant } from '@/contexts/AppContext';
import { toast } from 'sonner';

// ─── Brand Logo ─────────────────────────────────────────────────────────────────

function LunchieLogo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: 'transparent' }}
    >
      <img src="/Logo 004.png" alt="Lunchie Munchie Logo" className="w-full h-full object-contain" />
    </div>
  );
}

// ─── Food Photo Sets ──────────────────────────────────────────────────────────

const FOOD_PHOTOS: Record<string, string[]> = {
  '카페': [
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80',
    'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80',
    'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80',
  ],
  '베이커리': [
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80',
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80',
    'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=400&q=80',
    'https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?w=400&q=80',
  ],
  '이탈리안': [
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80',
    'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&q=80',
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&q=80',
    'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&q=80',
  ],
  '일식': [
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&q=80',
    'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=80',
    'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400&q=80',
    'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&q=80',
  ],
  '중식': [
    'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=80',
    'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&q=80',
    'https://images.unsplash.com/photo-1606756790138-261d2b21cd75?w=400&q=80',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80',
  ],
  'default': [
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  ],
};

function getFoodPhotos(restaurant: Restaurant): string[] {
  return FOOD_PHOTOS[restaurant.category] || FOOD_PHOTOS['default'];
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'lobby' | 'swipe1' | 'swipe2' | 'winner';
type SwipeResult = 'like' | 'dislike';

interface Friend {
  id: string;
  name: string;
  emoji: string;
  ready: boolean;
}

interface SwipeConfig {
  deadlineTs: number;
  activeFilters: string[];
  details: Record<string, string[]>;
}

// ─── Filter / Sort Logic ──────────────────────────────────────────────────────

const FILTER_OPTIONS = ['식단', '거리', '예산', '카드수', '취향', '평점'];

const DETAIL_OPTIONS: Record<string, string[]> = {
  '식단': ['비건', '채식', '육식', '글루텐프리', '할랄', '해산물 제외'],
  '거리': ['500m 이내', '1km 이내', '3km 이내', '5km 이내'],
  '예산': ['₩', '₩₩', '₩₩₩', '₩₩₩₩'],
  '카드수': ['5장', '7장', '10장', '15장'],
  '취향': ['카페', '맛집', '데이트 코스', '혼자 여행', '전시/문화', '가성비'],
  '평점': ['4.0 이상', '4.5 이상', '4.8 이상'],
};

function distanceToMeters(d: string): number {
  return d.includes('km') ? parseFloat(d) * 1000 : parseFloat(d);
}

/** Apply detail-tag filters + sort + card-count limit. Falls back to rating-sorted list if too few results. */
function applyConfig(restaurants: Restaurant[], config: SwipeConfig): Restaurant[] {
  const { activeFilters, details } = config;
  const sel = (f: string) => (activeFilters.includes(f) ? details[f] || [] : []);

  let list = restaurants.filter(r => {
    // 식단
    const diet = sel('식단');
    if (diet.length && !diet.some(d => r.dietary.includes(d))) return false;
    // 거리 — keep within the most permissive (largest) selected threshold
    const dist = sel('거리');
    if (dist.length) {
      const maxM = Math.max(...dist.map(distanceToMeters));
      if (distanceToMeters(r.distance) > maxM) return false;
    }
    // 예산 — keep restaurants whose price level is among selected
    const budget = sel('예산');
    if (budget.length && !budget.some(b => b.length === r.priceRange)) return false;
    // 평점 — keep rating >= lowest selected threshold
    const rate = sel('평점');
    if (rate.length) {
      const minR = Math.min(...rate.map(x => parseFloat(x)));
      if (r.rating < minR) return false;
    }
    // 취향 — match category or tags
    const taste = sel('취향');
    if (taste.length && !taste.some(t => r.category === t || r.tags.includes(t as never))) return false;
    return true;
  });

  // Sort by rating desc
  list = [...list].sort((a, b) => b.rating - a.rating);

  // Fallback if too few cards to run a match
  if (list.length < 3) {
    list = [...restaurants].sort((a, b) => b.rating - a.rating);
  }

  // Card count
  const countSel = sel('카드수')[0];
  const count = countSel ? parseInt(countSel) : 7;
  return list.slice(0, Math.min(count, list.length));
}

// ─── Phase 1: Invitation & Settings ──────────────────────────────────────────

const MOCK_FRIENDS: Friend[] = [
  { id: '1', name: '나', emoji: '🦊', ready: true },
  { id: '2', name: '지민', emoji: '🐱', ready: true },
  { id: '3', name: '수현', emoji: '🐻', ready: false },
  { id: '4', name: '태양', emoji: '🐯', ready: false },
];

const DEADLINE_OPTIONS = [
  { label: '5분', min: 5 },
  { label: '10분', min: 10 },
  { label: '15분', min: 15 },
];

function InvitationSettings({ onStart }: { onStart: (friends: Friend[], config: SwipeConfig) => void }) {
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 10));
  const [deadlineMin, setDeadlineMin] = useState(10);
  const [activeFilters, setActiveFilters] = useState<string[]>(['취향', '평점']);
  const [details, setDetails] = useState<Record<string, string[]>>({
    '취향': ['맛집'],
    '평점': ['4.0 이상'],
  });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [friends] = useState<Friend[]>(MOCK_FRIENDS);

  const inviteLink = `${window.location.origin}/quick-match?join=${sessionId}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Lunchie Munchie — 같이 점심 정해요!',
          text: '오늘 점심 뭐 먹을지 같이 골라요 🍱',
          url: inviteLink,
        });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    navigator.clipboard.writeText(inviteLink);
    toast.success('초대 링크 복사 완료! 친구에게 보내주세요 📋');
  };

  const toggleFilter = (f: string) => {
    setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const toggleDetail = (filter: string, value: string) => {
    setDetails(prev => {
      const cur = prev[filter] || [];
      const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
      return { ...prev, [filter]: next };
    });
  };

  const handleStart = () => {
    const config: SwipeConfig = {
      deadlineTs: Date.now() + deadlineMin * 60 * 1000,
      activeFilters,
      details,
    };
    // persist for join-link expiry check
    try {
      localStorage.setItem(`lm_qm_${sessionId}`, String(config.deadlineTs));
    } catch { /* ignore */ }
    onStart(friends, config);
  };

  const readyCount = friends.filter(f => f.ready).length;
  const totalDetailCount = activeFilters.reduce((sum, f) => sum + (details[f]?.length || 0), 0);

  return (
    <div className="px-5 space-y-4 pb-8">

      {/* Invite Link */}
      <div className="rounded-2xl p-4" style={{ background: '#EB5053' }}>
        <p className="text-white/70 text-[11px] font-semibold mb-2">초대 링크</p>
        <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2.5 mb-3">
          <Link2 size={15} color="white" className="flex-shrink-0" />
          <span className="text-white text-[12px] font-medium truncate flex-1">{inviteLink}</span>
        </div>
        <button onClick={handleShare}
          className="w-full py-2.5 rounded-xl bg-white flex items-center justify-center gap-2 active:scale-[0.98]">
          <Share2 size={15} color="#EB5053" />
          <span className="text-[13px] font-bold" style={{ color: '#EB5053' }}>링크 공유하기</span>
        </button>
        <p className="text-white/60 text-[11px] mt-2 text-center">마감 전까지 링크로 참여할 수 있어요</p>
      </div>

      {/* Deadline */}
      <div className="rounded-2xl p-4 bg-white">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={15} color="#EB5053" />
          <p className="text-[13px] font-bold text-[#1A1A1A]">마감 타이밍</p>
        </div>
        <p className="text-[11px] text-[#9B9B9B] mb-3">스와이핑 종료 시점 · 마감 후엔 참여 불가</p>
        <div className="flex gap-2">
          {DEADLINE_OPTIONS.map(d => (
            <button key={d.min} onClick={() => setDeadlineMin(d.min)}
              className="flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all active:scale-95"
              style={deadlineMin === d.min
                ? { background: '#EB5053', color: 'white' }
                : { background: '#F5F5F5', color: '#4A4A4A' }}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Options */}
      <div className="rounded-2xl p-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} color="#EB5053" />
            <p className="text-[13px] font-bold text-[#1A1A1A]">옵션</p>
          </div>
          <button
            onClick={() => setShowDetailModal(true)}
            className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full active:scale-95"
            style={{ background: '#FFF5F5', color: '#EB5053' }}
          >
            상세 설정 {totalDetailCount > 0 && `· ${totalDetailCount}`}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map(f => (
            <button key={f} onClick={() => toggleFilter(f)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95"
              style={activeFilters.includes(f)
                ? { background: '#EB5053', color: 'white' }
                : { background: '#F5F5F5', color: '#4A4A4A' }}>
              {f}
            </button>
          ))}
        </div>

        {/* Selected detail chips preview */}
        {totalDetailCount > 0 && (
          <div className="mt-3 pt-3 border-t border-[#F0F0F0] flex flex-wrap gap-1.5">
            {activeFilters.flatMap(f => (details[f] || []).map(v => (
              <span key={`${f}-${v}`} className="text-[10px] font-semibold bg-[#F5F5F5] text-[#4A4A4A] px-2 py-0.5 rounded-full">
                {v}
              </span>
            )))}
          </div>
        )}
      </div>

      {/* Detail Settings Modal */}
      <AnimatePresence>
        {showDetailModal && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              className="w-full max-w-[480px] bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto scrollbar-hide"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white px-5 pt-5 pb-3 flex items-center justify-between border-b border-[#F0F0F0]">
                <div>
                  <p className="font-black text-[17px] text-[#1A1A1A]">상세 설정</p>
                  <p className="text-[11px] text-[#9B9B9B]">활성화된 옵션의 세부 태그를 골라주세요</p>
                </div>
                <button onClick={() => setShowDetailModal(false)}
                  className="w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center active:scale-90">
                  <X size={16} color="#4A4A4A" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-5">
                {activeFilters.length === 0 && (
                  <p className="text-[13px] text-[#9B9B9B] text-center py-8">
                    먼저 옵션에서 항목을 켜주세요
                  </p>
                )}
                {activeFilters.map(filter => (
                  <div key={filter}>
                    <p className="text-[13px] font-bold text-[#1A1A1A] mb-2">{filter}</p>
                    <div className="flex flex-wrap gap-2">
                      {(DETAIL_OPTIONS[filter] || []).map(value => {
                        const on = (details[filter] || []).includes(value);
                        return (
                          <button key={value} onClick={() => toggleDetail(filter, value)}
                            className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95"
                            style={on
                              ? { background: '#EB5053', color: 'white' }
                              : { background: '#F5F5F5', color: '#4A4A4A' }}>
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="sticky bottom-0 bg-white px-5 py-4 border-t border-[#F0F0F0]">
                <button onClick={() => setShowDetailModal(false)}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-[14px] active:scale-[0.98]"
                  style={{ background: '#EB5053' }}>
                  적용하기 {totalDetailCount > 0 && `(${totalDetailCount})`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friend List */}
      <div className="rounded-2xl p-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={15} color="#EB5053" />
            <p className="text-[13px] font-bold text-[#1A1A1A]">
              참여하는 친구 ({readyCount}/{friends.length})
            </p>
          </div>
          <span className="text-[11px] font-semibold" style={{ color: '#EB5053' }}>
            초대하기
          </span>
        </div>

        <div className="space-y-2.5">
          {friends.map(f => (
            <div key={f.id} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FFF5F5] flex items-center justify-center text-[18px] flex-shrink-0">
                {f.emoji}
              </div>
              <span className="flex-1 text-[13px] font-semibold text-[#1A1A1A]">{f.name}</span>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full"
                style={f.ready
                  ? { background: '#EB5053', color: 'white' }
                  : { background: '#F5F5F5', color: '#9B9B9B' }}>
                {f.ready ? '준비 완료' : '대기 중'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Start */}
      <motion.button
        onClick={handleStart}
        className="w-full py-4 rounded-2xl font-black text-white text-[16px]"
        style={{ background: '#EB5053' }}
        whileTap={{ scale: 0.97 }}
      >
        Swipe 시작하기 🍱
      </motion.button>
    </div>
  );
}

// ─── Swipe Card (예선전) ──────────────────────────────────────────────────────

function SwipeCard({
  restaurant,
  onSwipe,
  isTop,
  stackIndex,
  progress,
  total,
}: {
  restaurant: Restaurant;
  onSwipe: (r: SwipeResult) => void;
  isTop: boolean;
  stackIndex: number;
  progress: number;
  total: number;
}) {
  const [isRevealed, setIsRevealed] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-16, 16]);
  const likeOp = useTransform(x, [0, 70], [0, 1]);
  const nopeOp = useTransform(x, [-70, 0], [1, 0]);
  const likeTintOp = useTransform(x, [0, 120, 360], [0, 0.34, 0.72]);
  const nopeTintOp = useTransform(x, [-360, -120, 0], [0.72, 0.34, 0]);
  const [isLeaving, setIsLeaving] = useState(false);
  const foodPhotos = getFoodPhotos(restaurant);

  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number } }) => {
    if (isLeaving) return;

    if (info.offset.x > 90) {
      setIsLeaving(true);
      void animate(x, 520, {
        type: 'spring',
        stiffness: 210,
        damping: 24,
      }).then(() => onSwipe('like'));
      return;
    }

    if (info.offset.x < -90) {
      setIsLeaving(true);
      void animate(x, -520, {
        type: 'spring',
        stiffness: 210,
        damping: 24,
      }).then(() => onSwipe('dislike'));
      return;
    }

    void animate(x, 0, {
      type: 'spring',
      stiffness: 260,
      damping: 24,
    });
  }, [isLeaving, onSwipe, x]);

  if (!isTop) {
    return (
      <div
        className="absolute inset-0 rounded-3xl overflow-hidden"
        style={{
          transform: `scale(${1 - stackIndex * 0.04}) translateY(${stackIndex * 14}px)`,
          zIndex: 10 - stackIndex,
          background: stackIndex === 1 ? '#e8c9a0' : '#d4a574',
          opacity: 1 - stackIndex * 0.15,
        }}
      >
        <img
          src={restaurant.image}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 rounded-3xl overflow-hidden"
      style={{ x, rotate, zIndex: 20 }}
      drag={isRevealed || isLeaving ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      whileDrag={{ cursor: 'grabbing' }}
      onTap={() => !isRevealed && setIsRevealed(true)}
    >
      {/* Restaurant photo */}
      <div className="w-full h-full relative cursor-grab">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <motion.div
          className="absolute inset-0 bg-[#3CBA44] pointer-events-none"
          style={{ opacity: likeTintOp }}
        />
        <motion.div
          className="absolute inset-0 bg-[#EB5053] pointer-events-none"
          style={{ opacity: nopeTintOp }}
        />

        {/* Progress */}
        <div className="absolute top-4 left-5 right-5 flex items-center justify-between">
          <div className="flex gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className="h-1 rounded-full transition-all"
                style={{
                  width: i < progress ? 22 : 14,
                  background: i < progress ? 'white' : 'rgba(255,255,255,0.35)',
                }} />
            ))}
          </div>
          <span className="text-white/80 text-[12px] font-bold bg-black/20 px-2 py-0.5 rounded-full">
            {progress}/{total}
          </span>
        </div>

        {/* Touch hint */}
        {!isRevealed && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="bg-black/30 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full opacity-70">
              탭 → 메뉴 보기
            </div>
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {restaurant.tags.slice(0, 2).map(t => (
              <span key={t} className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                {t}
              </span>
            ))}
          </div>
          <h2 className="text-white font-black text-[24px] leading-tight">{restaurant.name}</h2>
          <p className="text-white/70 text-[12px] mt-1">{restaurant.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <Star size={12} fill="#FFD700" color="#FFD700" />
              <span className="text-white text-[12px] font-bold">{restaurant.rating}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={11} color="rgba(255,255,255,0.6)" />
              <span className="text-white/70 text-[11px]">{restaurant.distance}</span>
            </div>
            <span className="text-white/70 text-[11px]">{'₩'.repeat(restaurant.priceRange)}</span>
            <span className="text-white/60 text-[10px] bg-white/15 px-2 py-0.5 rounded-full">
              {restaurant.category}
            </span>
          </div>
        </div>

        {/* LIKE overlay */}
        <motion.div
          className="absolute top-8 left-5 border-[3px] border-[#3CBA44] rounded-2xl px-4 py-2"
          style={{ opacity: likeOp, rotate: -12 }}
        >
          <span className="text-[#3CBA44] font-black text-[18px]">LIKE ♡</span>
        </motion.div>

        {/* NOPE overlay */}
        <motion.div
          className="absolute top-8 right-5 border-[3px] border-[#EB5053] rounded-2xl px-4 py-2"
          style={{ opacity: nopeOp, rotate: 12 }}
        >
          <span className="text-[#EB5053] font-black text-[18px]">NOPE ✕</span>
        </motion.div>
      </div>

      {/* Food photos reveal panel — dark, one-photo-at-a-time vertical scroll */}
      <AnimatePresence>
        {isRevealed && (
          <motion.div
            className="absolute inset-0 flex flex-col"
            style={{ background: 'rgba(20,16,14,0.92)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <div className="min-w-0">
                <p className="font-black text-[17px] text-white truncate">{restaurant.name}</p>
                <p className="text-[11px] text-white/50 truncate">{restaurant.category} · 메뉴 둘러보기</p>
              </div>
              <button
                onClick={() => setIsRevealed(false)}
                className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center active:scale-90 flex-shrink-0 ml-2">
                <X size={16} color="white" />
              </button>
            </div>

            {/* Vertical snap-scroll food feed */}
            <div className="flex-1 min-h-0 overflow-y-auto snap-y snap-mandatory scrollbar-hide">
              {foodPhotos.map((url, i) => (
                <div
                  key={i}
                  className="snap-start h-[92%] min-h-[92%] px-5 pb-3 flex flex-col justify-center"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div
                    className="rounded-2xl overflow-hidden relative bg-black flex-1 min-h-0 w-full"
                    onClick={() => setIsRevealed(false)}>
                    <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
                    {/* dot indicator */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {foodPhotos.map((_, j) => (
                        <div key={j} className="w-1.5 h-1.5 rounded-full"
                          style={{ background: j === i ? 'white' : 'rgba(255,255,255,0.4)' }} />
                      ))}
                    </div>
                  </div>
                  <div className="pt-2.5 shrink-0">
                    <p className="font-bold text-[15px] text-white leading-tight">메뉴 {i + 1}</p>
                    <p className="text-[11px] text-white/50 mt-0.5 line-clamp-2 leading-snug">{restaurant.description}</p>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {restaurant.tags.map(t => (
                        <span key={t} className="text-[10px] font-semibold bg-white/15 text-white/90 px-2.5 py-0.5 rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* scroll hint */}
            <div className="text-center pb-2 flex-shrink-0">
              <p className="text-white/40 text-[11px]">↕ 스크롤로 메뉴 넘기기 · 탭하면 돌아가기</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Phase 2: Swipe #1 예선전 ──────────────────────────────────────────────────

function Swipe1Screen({
  restaurants,
  config,
  onComplete,
}: {
  restaurants: Restaurant[];
  config: SwipeConfig;
  onComplete: (top2: Restaurant[]) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedList, setLikedList] = useState<Restaurant[]>([]);
  const [showIntro, setShowIntro] = useState(true);
  const [logoDirection, setLogoDirection] = useState<'right' | 'left'>('right');
  const [logoVisible, setLogoVisible] = useState(true);
  const [logoKey, setLogoKey] = useState(0);
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, config.deadlineTs - Date.now()));
  // Filtered + sorted + count-limited cards from settings
  const cardRestaurants = useRef(applyConfig(restaurants, config)).current;
  const likedRef = useRef<Restaurant[]>([]);
  likedRef.current = likedList;
  const introTimers = useRef<number[]>([]);

  const finish = useCallback((liked: Restaurant[]) => {
    const top2 = liked.slice(0, 2);
    if (top2.length < 2) {
      const remaining = cardRestaurants.filter(r => !top2.includes(r));
      top2.push(...remaining.slice(0, 2 - top2.length));
    }
    onComplete(top2);
  }, [cardRestaurants, onComplete]);

  useEffect(() => {
    introTimers.current.push(window.setTimeout(() => setLogoVisible(false), 900));
    introTimers.current.push(window.setTimeout(() => {
      setLogoDirection('left');
      setLogoKey(prev => prev + 1);
      setLogoVisible(true);
    }, 1200));
    introTimers.current.push(window.setTimeout(() => setLogoVisible(false), 2100));
    introTimers.current.push(window.setTimeout(() => setShowIntro(false), 2800));

    return () => {
      introTimers.current.forEach(id => window.clearTimeout(id));
      introTimers.current = [];
    };
  }, []);

  // Countdown ticker — auto-finish when deadline hits
  useEffect(() => {
    const iv = setInterval(() => {
      const left = config.deadlineTs - Date.now();
      setRemainingMs(Math.max(0, left));
      if (left <= 0) {
        clearInterval(iv);
        toast.info('마감! 지금까지 고른 메뉴로 결정해요 ⏰');
        finish(likedRef.current);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [config.deadlineTs, finish]);

  const handleSwipe = useCallback((result: SwipeResult) => {
    const restaurant = cardRestaurants[currentIndex];
    if (!restaurant) return;

    const newLiked = result === 'like' ? [...likedList, restaurant] : likedList;

    if (currentIndex + 1 >= cardRestaurants.length) {
      finish(newLiked);
    } else {
      setLikedList(newLiked);
      setCurrentIndex(i => i + 1);
    }
  }, [currentIndex, likedList, cardRestaurants, finish]);

  const handleButtonSwipe = (result: SwipeResult) => {
    handleSwipe(result);
  };

  const visibleCards = cardRestaurants.slice(currentIndex, currentIndex + 3);
  const progress = currentIndex + 1;
  const total = cardRestaurants.length;

  // Countdown formatting
  const totalSec = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  const urgent = remainingMs <= 30000;

  return (
    <div className="min-h-dvh flex flex-col bg-[#FFF8F2]">
      {/* Intro overlay */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            className="absolute inset-0 bg-[#1A1A1A] z-50 flex flex-col items-center justify-center"
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="flex flex-col items-center mb-6"
            >
              <div className="relative w-22 h-22 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {logoVisible && (
                    <motion.div
                      key={logoKey}
                      initial={{ opacity: 0, x: 0, scale: 0.85 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{
                        opacity: 0,
                        x: logoDirection === 'right' ? 450 : -450,
                        transition: { duration: 0.8, ease: 'easeInOut' },
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 140,
                        damping: 18,
                      }}
                      className="absolute"
                    >
                      <LunchieLogo size={88} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span className="font-black text-[22px] mt-3" style={{ color: '#EB5053' }}>
                Lunchie Munchie
              </span>
            </motion.div>
            <p className="font-black text-white text-[22px]">예선전 시작!</p>
            <p className="text-white/60 text-[14px] mt-2">카드를 스와이프 하세요</p>
            <div className="flex gap-8 mt-6">
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full border-2 border-[#EB5053] bg-[#EB5053]/20 flex items-center justify-center">
                  <X size={24} color="#EB5053" strokeWidth={2.5} />
                </div>
                <span className="text-white/70 text-[12px]">싫어요</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full border-2 border-[#3CBA44] bg-[#3CBA44]/20 flex items-center justify-center">
                  <Heart size={24} color="#3CBA44" fill="#3CBA44" />
                </div>
                <span className="text-white/70 text-[12px]">좋아요</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3">
        <div>
          <p className="font-black text-[18px] text-[#1A1A1A]">예선전 🍽️</p>
          <p className="text-[12px] text-[#9B9B9B]">
            마음에 드는 음식을 골라보세요 · {progress}/{total}
          </p>
        </div>
        {/* Countdown */}
        <motion.div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: urgent ? '#EB5053' : '#FFF5F5' }}
          animate={urgent ? { scale: [1, 1.08, 1] } : {}}
          transition={{ duration: 1, repeat: urgent ? Infinity : 0 }}
        >
          <Clock size={14} color={urgent ? 'white' : '#EB5053'} />
          <span className="font-black text-[15px] tabular-nums"
            style={{ color: urgent ? 'white' : '#EB5053' }}>
            {mm}:{ss}
          </span>
        </motion.div>
      </div>

      {/* Card stack — 9:12 ratio */}
      <div className="flex-1 px-5 py-2 relative flex items-center justify-center">
        <div className="relative w-full" style={{ aspectRatio: '9/12', maxHeight: '100%' }}>
          <AnimatePresence>
            {visibleCards.map((restaurant, i) => (
              <SwipeCard
                key={restaurant.id}
                restaurant={restaurant}
                onSwipe={handleSwipe}
                isTop={i === 0}
                stackIndex={i}
                progress={progress}
                total={total}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-8 pb-10 pt-4 flex items-center justify-center gap-8">
        <motion.button
          onClick={() => handleButtonSwipe('dislike')}
          className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center border border-[#E5E5E5] active:scale-90"
          whileTap={{ scale: 0.85 }}
        >
          <X size={26} color="#EB5053" strokeWidth={2.5} />
        </motion.button>
        <motion.button
          onClick={() => handleButtonSwipe('like')}
          className="w-20 h-20 rounded-full shadow-xl flex items-center justify-center active:scale-90"
          style={{ background: '#EB5053' }}
          whileTap={{ scale: 0.85 }}
        >
          <Heart size={26} color="white" fill="white" />
        </motion.button>
      </div>
    </div>
  );
}

// ─── Phase 3: 결승전 ────────────────────────────────────────────────────────────

function FinalBattleScreen({
  finalist1,
  finalist2,
  onPick,
}: {
  finalist1: Restaurant;
  finalist2: Restaurant;
  onPick: (winner: Restaurant) => void;
}) {
  const [selected, setSelected] = useState<Restaurant | null>(null);

  const handlePick = (r: Restaurant) => {
    setSelected(r);
    setTimeout(() => onPick(r), 600);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#1A1A1A]">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 text-center">
        <p className="font-black text-white text-[22px]">결승전 🏆</p>
        <p className="text-white/50 text-[13px] mt-1">최후의 2곳 — 하나를 선택하세요</p>
      </div>

      {/* Diagonal split layout */}
      <div className="flex-1 relative overflow-hidden">
        {/* Finalist 1 — top-left triangle */}
        <motion.button
          onClick={() => handlePick(finalist1)}
          className="absolute inset-0"
          style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
          whileTap={{ scale: 0.98 }}
          animate={selected === finalist1 ? { scale: 1.05 } : selected === finalist2 ? { opacity: 0.35 } : {}}
        >
          <img src={finalist1.image} alt={finalist1.name} className="w-full h-full object-cover" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/45 to-black/70" />
          {/* info top-left */}
          <div className="absolute top-6 left-5 right-20 text-left">
            <span className="inline-block bg-white/20 text-white text-[11px] font-black px-3 py-1 rounded-full mb-2">
              #1
            </span>
            <p className="text-white font-black text-[19px] leading-tight">{finalist1.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Star size={12} fill="#FFD700" color="#FFD700" />
              <span className="text-white/85 text-[12px]">{finalist1.rating}</span>
              <span className="text-white/60 text-[11px]">{finalist1.distance}</span>
            </div>
          </div>
        </motion.button>

        {/* Finalist 2 — bottom-right triangle */}
        <motion.button
          onClick={() => handlePick(finalist2)}
          className="absolute inset-0"
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
          whileTap={{ scale: 0.98 }}
          animate={selected === finalist2 ? { scale: 1.05 } : selected === finalist1 ? { opacity: 0.35 } : {}}
        >
          <img src={finalist2.image} alt={finalist2.name} className="w-full h-full object-cover" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/45 to-black/30" />
          {/* info bottom-right */}
          <div className="absolute bottom-6 right-5 left-20 text-right">
            <span className="inline-block bg-white/20 text-white text-[11px] font-black px-3 py-1 rounded-full mb-2">
              #2
            </span>
            <p className="text-white font-black text-[19px] leading-tight">{finalist2.name}</p>
            <div className="flex items-center gap-2 mt-1 justify-end">
              <Star size={12} fill="#FFD700" color="#FFD700" />
              <span className="text-white/85 text-[12px]">{finalist2.rating}</span>
              <span className="text-white/60 text-[11px]">{finalist2.distance}</span>
            </div>
          </div>
        </motion.button>

        {/* Diagonal divider line */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <line x1="100" y1="0" x2="0" y2="100" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
          </svg>
        </div>

        {/* VS badge center */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-14 h-14 rounded-full bg-[#EB5053] border-[3px] border-white flex items-center justify-center shadow-2xl">
            <span className="font-black text-white text-[15px]">VS</span>
          </div>
        </motion.div>
      </div>

      {/* Bottom pick buttons */}
      <div className="flex gap-3 px-5 py-5">
        <motion.button
          onClick={() => handlePick(finalist1)}
          className="flex-1 py-3.5 rounded-2xl font-bold text-white text-[14px] flex items-center justify-center gap-1.5 active:scale-95"
          style={{ background: 'rgba(255,255,255,0.15)' }}
          whileTap={{ scale: 0.95 }}
        >
          #1 {finalist1.name.slice(0, 5)}
        </motion.button>
        <motion.button
          onClick={() => handlePick(finalist2)}
          className="flex-1 py-3.5 rounded-2xl font-bold text-white text-[14px] flex items-center justify-center gap-1.5 active:scale-95"
          style={{ background: 'rgba(255,255,255,0.15)' }}
          whileTap={{ scale: 0.95 }}
        >
          #2 {finalist2.name.slice(0, 5)}
        </motion.button>
      </div>
    </div>
  );
}

// ─── Image → data URL (pre-inlines images so capture is CORS-safe) ──────────────

async function imageToDataURL(url: string): Promise<string> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return url; // fallback to original (may taint, but better than crashing)
  }
}

// ─── Shareable Story Card (Instagram Story 1080×1920) ────────────────────────────

function ShareStoryCard({ winner, cardRef, heroSrc, foodSrcs }: {
  winner: Restaurant;
  cardRef: Ref<HTMLDivElement>;
  heroSrc: string;
  foodSrcs: string[];
}) {
  return (
    // Off-screen wrapper holds the positioning offset so the captured node
    // (cardRef) itself has NO offset — otherwise html-to-image keeps the
    // -2000px and shifts all content out of the capture frame (blank result).
    <div style={{ position: 'fixed', top: 0, left: -3000, width: 1080, height: 1920, overflow: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
    <div
      ref={cardRef}
      style={{
        width: 1080,
        height: 1920,
        background: 'linear-gradient(160deg, #FFF8F2 0%, #FFE9DC 100%)',
        fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        padding: 72,
        boxSizing: 'border-box',
      }}
    >
      {/* Header: brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 48 }}>
        <div style={{ width: 76, height: 76, borderRadius: 22, background: '#EB5053', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={48} height={48} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="10" r="7" fill="white" />
            <circle cx="9.5" cy="9" r="1.2" fill="#EB5053" />
            <circle cx="14.5" cy="9" r="1.2" fill="#EB5053" />
            <path d="M9 12.5 Q12 15 15 12.5" stroke="#EB5053" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            <rect x="9" y="18" width="6" height="2.5" rx="1.2" fill="white" />
            <rect x="10.5" y="16.5" width="3" height="2" rx="0.8" fill="white" />
          </svg>
        </div>
        <span style={{ fontSize: 44, fontWeight: 900, color: '#EB5053' }}>Lunchie Munchie</span>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 36 }}>
        <p style={{ fontSize: 40, fontWeight: 700, color: '#9B9B9B', margin: 0 }}>🏆 오늘의 점심 당첨!</p>
      </div>

      {/* Hero photo */}
      <div style={{ position: 'relative', width: '100%', height: 720, borderRadius: 48, overflow: 'hidden', flexShrink: 0 }}>
        <img src={heroSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent 55%)' }} />
        <div style={{ position: 'absolute', bottom: 44, left: 48, right: 48 }}>
          <p style={{ fontSize: 76, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.1 }}>{winner.name}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 16 }}>
            <span style={{ fontSize: 36, color: 'white', fontWeight: 700 }}>⭐ {winner.rating}</span>
            <span style={{ fontSize: 36, color: 'rgba(255,255,255,0.85)' }}>📍 {winner.distance}</span>
            <span style={{ fontSize: 36, color: 'rgba(255,255,255,0.85)' }}>{'₩'.repeat(winner.priceRange)}</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 40 }}>
        {winner.tags.map(t => (
          <span key={t} style={{ fontSize: 34, fontWeight: 700, color: 'white', background: '#EB5053', padding: '14px 30px', borderRadius: 999 }}>
            {t}
          </span>
        ))}
        {winner.dietary.map(d => (
          <span key={d} style={{ fontSize: 34, fontWeight: 700, color: '#3CBA44', background: '#EAF9EC', padding: '14px 30px', borderRadius: 999 }}>
            {d}
          </span>
        ))}
      </div>

      {/* Description */}
      <p style={{ fontSize: 36, color: '#4A4A4A', marginTop: 36, lineHeight: 1.5 }}>{winner.description}</p>

      {/* Menu photos */}
      <div style={{ display: 'flex', gap: 20, marginTop: 'auto' }}>
        {foodSrcs.slice(0, 4).map((url, i) => (
          <div key={i} style={{ flex: 1, height: 220, borderRadius: 28, overflow: 'hidden' }}>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 44, textAlign: 'center' }}>
        <span style={{ fontSize: 32, color: '#9B9B9B' }}>밥은 먹어야 하니까 · Lunchie Munchie</span>
      </div>
    </div>
    </div>
  );
}

// ─── Phase 4: Winner ────────────────────────────────────────────────────────────

function WinnerScreen({ winner }: { winner: Restaurant; onReset: () => void }) {
  const [, navigate] = useLocation();
  const foodPhotos = getFoodPhotos(winner);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewBlobRef = useRef<Blob | null>(null);
  // Resolved (data-URL) images for the capture card
  const [cardImages, setCardImages] = useState<{ hero: string; foods: string[] } | null>(null);

  const handleMaps = () => {
    const query = encodeURIComponent(winner.address);
    window.open(`https://maps.google.com/?q=${query}`, '_blank');
  };

  const handleBooking = () => {
    // No real booking URL in mock data — open a Google reservation search
    // (Google surfaces "Reserve a table" / booking widgets for restaurants).
    const query = encodeURIComponent(`${winner.name} ${winner.address} reservation 예약`);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
  };

  const captureCard = async (): Promise<Blob | null> => {
    const node = shareCardRef.current;
    if (!node) return null;
    // html-to-image renders via SVG foreignObject (browser-native),
    // so oklch() theme colors work without a custom parser.
    // Known quirk: the first render(s) can come back blank before images/fonts
    // are decoded into the clone — so render a few times and keep the last.
    const opts = {
      width: 1080,
      height: 1920,
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor: '#FFF8F2',
    };
    let blob: Blob | null = null;
    for (let i = 0; i < 3; i++) {
      blob = await toBlob(node, opts);
      await new Promise(r => setTimeout(r, 150));
    }
    return blob;
  };

  // Generate card → preload images as data URLs → render → capture → preview
  const handleGenerateCard = async () => {
    setIsGenerating(true);
    try {
      // 1. Convert all images to data URLs (prevents CORS taint)
      const [hero, ...foods] = await Promise.all([
        imageToDataURL(winner.image),
        ...foodPhotos.slice(0, 4).map(imageToDataURL),
      ]);
      setCardImages({ hero, foods });

      // 2. Wait for the off-screen card to render with the new images
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await new Promise(r => setTimeout(r, 120));

      // 3. Capture
      const blob = await captureCard();
      if (!blob) throw new Error('capture failed');
      previewBlobRef.current = blob;
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error('share card error', e);
      toast.error('카드 생성에 실패했어요. 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Share the captured image
  const handleShareImage = async () => {
    const blob = previewBlobRef.current;
    if (!blob) return;
    const file = new File([blob], `lunchie-${winner.name}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Lunchie Munchie',
          text: `오늘의 점심은 ${winner.name}! 🍱`,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      toast.info('이 브라우저는 이미지 공유를 지원하지 않아 저장으로 대체해요.');
      handleSaveImage();
    }
  };

  // Save (download) the captured image
  const handleSaveImage = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `lunchie-${winner.name}.png`;
    a.click();
    toast.success('공유 카드를 저장했어요! 📸');
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    previewBlobRef.current = null;
  };

  return (
    <motion.div
      className="min-h-dvh bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Hidden share card for capture (mounted only when images resolved) */}
      {cardImages && (
        <ShareStoryCard
          winner={winner}
          cardRef={shareCardRef}
          heroSrc={cardImages.hero}
          foodSrcs={cardImages.foods}
        />
      )}

      {/* Preview modal */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePreview}
          >
            <motion.img
              src={previewUrl}
              alt="공유 카드 미리보기"
              className="max-h-[70vh] w-auto rounded-2xl shadow-2xl"
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex gap-3 mt-5 w-full max-w-[360px]" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleSaveImage}
                className="flex-1 py-3.5 rounded-2xl bg-white/15 text-white font-bold text-[14px] flex items-center justify-center gap-2 active:scale-95"
              >
                <Download size={16} /> 저장
              </button>
              <button
                onClick={handleShareImage}
                className="flex-[2] py-3.5 rounded-2xl text-white font-bold text-[14px] flex items-center justify-center gap-2 active:scale-95"
                style={{ background: '#EB5053' }}
              >
                <Share2 size={16} /> 이미지 공유하기
              </button>
            </div>
            <button onClick={closePreview} className="mt-4 text-white/60 text-[13px] active:scale-95">
              닫기
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trophy header */}
      <div className="relative h-64">
        <img src={winner.image} alt={winner.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
        >
          <motion.div
            className="text-6xl mb-2"
            animate={{ rotate: [-5, 5, -5, 0] }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            🏆
          </motion.div>
          <p className="text-white font-black text-[26px] text-center drop-shadow-lg">{winner.name}</p>
          <p className="text-white/80 text-[13px] mt-1 font-semibold">오늘의 점심 당첨!</p>
        </motion.div>
      </div>

      {/* Detail card */}
      <motion.div
        className="px-5 -mt-4 relative z-10"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <div className="bg-white rounded-3xl shadow-xl p-5">
          {/* Meta row */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <Star size={15} fill="#F09D09" color="#F09D09" />
              <span className="font-bold text-[14px]">{winner.rating}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#9B9B9B]">
              <MapPin size={14} />
              <span className="text-[13px]">{winner.distance}</span>
            </div>
            <span className="text-[13px] text-[#9B9B9B]">{'₩'.repeat(winner.priceRange)}</span>
            <span className="text-[11px] bg-[#FFF5F5] text-[#EB5053] px-2.5 py-1 rounded-full font-semibold">
              {winner.category}
            </span>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2 mb-4 p-3 bg-[#F5F5F5] rounded-xl">
            <MapPin size={14} color="#EB5053" className="flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-[#4A4A4A]">{winner.address}</p>
          </div>

          {/* Tags */}
          <div className="flex gap-2 flex-wrap mb-4">
            {winner.tags.map(t => (
              <span key={t} className="text-[11px] font-semibold bg-[#F5F5F5] text-[#4A4A4A] px-3 py-1 rounded-full">
                {t}
              </span>
            ))}
            {winner.dietary.map(d => (
              <span key={d} className="text-[11px] font-semibold bg-[#F0FFF4] text-[#3CBA44] px-3 py-1 rounded-full">
                {d}
              </span>
            ))}
          </div>

          {/* Food photos row */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-[#9B9B9B] mb-2">메뉴 사진</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {foodPhotos.map((url, i) => (
                <div key={i} className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={handleBooking}
              className="flex-1 py-3.5 rounded-2xl border border-[#E5E5E5] font-semibold text-[13px] flex items-center justify-center gap-2 active:scale-95">
              <Phone size={15} color="#4A4A4A" /> 예약하기
            </button>
            <motion.button
              onClick={handleMaps}
              className="flex-[2] py-3.5 rounded-2xl font-bold text-white text-[14px] flex items-center justify-center gap-2 active:scale-95"
              style={{ background: '#EB5053' }}
              whileTap={{ scale: 0.97 }}
            >
              <Navigation size={16} /> 길찾기
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Share Card CTA */}
      <div className="px-5 mt-4">
        <motion.button
          onClick={handleGenerateCard}
          disabled={isGenerating}
          className="w-full py-4 rounded-2xl font-bold text-white text-[15px] flex items-center justify-center gap-2 active:scale-[0.98]"
          style={{ background: isGenerating ? '#C0392B' : 'linear-gradient(135deg, #EB5053 0%, #F09D09 100%)' }}
          whileTap={{ scale: 0.97 }}
        >
          {isGenerating ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full"
              />
              카드 생성 중...
            </>
          ) : (
            <>
              <Download size={17} /> 공유 카드 만들기
            </>
          )}
        </motion.button>
      </div>

      {/* Reset */}
      <div className="px-5 mt-3 pb-10 flex gap-3">
        <button
          onClick={() => { navigator.clipboard.writeText(winner.address); toast.success('주소 복사 완료!'); }}
          className="flex-1 py-3 rounded-2xl border border-[#E5E5E5] font-semibold text-[13px] flex items-center justify-center gap-2 bg-white active:scale-95"
        >
          <Share2 size={14} /> 주소 복사
        </button>
        <button onClick={() => navigate('/')}
          className="flex-1 py-3 rounded-2xl font-bold text-white text-[13px] flex items-center justify-center gap-2 active:scale-95"
          style={{ background: '#EB5053' }}>
          <Home size={14} /> 홈으로
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuickMatchPage() {
  const [, navigate] = useLocation();
  const { restaurants } = useApp();
  const [phase, setPhase] = useState<Phase>('lobby');
  const [, setFriends] = useState<Friend[]>([]);
  const [config, setConfig] = useState<SwipeConfig | null>(null);
  const [finalists, setFinalists] = useState<Restaurant[]>([]);
  const [winner, setWinner] = useState<Restaurant | null>(null);

  // Join-link expiry check
  const [joinExpired, setJoinExpired] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');
    if (!joinId) return;
    try {
      const ts = localStorage.getItem(`lm_qm_${joinId}`);
      if (ts && Date.now() > Number(ts)) {
        setJoinExpired(true);
      }
    } catch { /* ignore */ }
  }, []);

  const handleReset = () => {
    setPhase('lobby');
    setFriends([]);
    setConfig(null);
    setFinalists([]);
    setWinner(null);
  };

  // Expired invite link → blocked screen
  if (joinExpired) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-8 text-center" style={{ background: '#FFF8F2' }}>
        <div className="text-6xl mb-5">⏰</div>
        <p className="font-black text-[22px] text-[#1A1A1A]">마감된 세션이에요</p>
        <p className="text-[14px] text-[#9B9B9B] mt-2 leading-relaxed">
          이 초대 링크는 마감 시간이 지나<br />더 이상 참여할 수 없어요.
        </p>
        <button onClick={() => navigate('/')}
          className="mt-8 px-8 py-3.5 rounded-2xl font-bold text-white text-[14px] flex items-center gap-2 active:scale-95"
          style={{ background: '#EB5053' }}>
          <Home size={16} /> 홈으로
        </button>
      </div>
    );
  }

  // Winner screen
  if (phase === 'winner' && winner) {
    return <WinnerScreen winner={winner} onReset={handleReset} />;
  }

  // Final battle
  if (phase === 'swipe2' && finalists.length >= 2) {
    return (
      <FinalBattleScreen
        finalist1={finalists[0]}
        finalist2={finalists[1]}
        onPick={(w) => { setWinner(w); setPhase('winner'); }}
      />
    );
  }

  // Swipe #1 예선전
  if (phase === 'swipe1' && config) {
    return (
      <Swipe1Screen
        restaurants={restaurants}
        config={config}
        onComplete={(top2) => { setFinalists(top2); setPhase('swipe2'); }}
      />
    );
  }

  // Lobby
  return (
    <div className="min-h-dvh" style={{ background: '#FFF8F2' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-5">
        <button onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm active:scale-95">
          <ArrowLeft size={18} color="#1A1A1A" />
        </button>
        <div className="text-center">
          <p className="font-black text-[17px] text-[#1A1A1A]">Lunchie Mode</p>
          <p className="text-[11px] text-[#9B9B9B]">Quick Match</p>
        </div>
        <div className="w-10" />
      </div>

      <InvitationSettings
        onStart={(f, cfg) => {
          setFriends(f);
          setConfig(cfg);
          setPhase('swipe1');
        }}
      />
    </div>
  );
}
