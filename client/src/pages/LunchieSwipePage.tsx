/**
 * Lunchie Munchie — Quick Match Page
 * Design: Soft Coral (Option 8) + Pubfish Reference
 * Flow: 스와이프 → 결과 발표
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { ArrowLeft, Heart, X, Star, MapPin, Clock } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type SwipeAction = 'like' | 'dislike';

// ─── Food photo references (for tap-to-reveal menu panel) ─────────────────────

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

function getFoodPhotos(category: string): string[] {
  return FOOD_PHOTOS[category] || FOOD_PHOTOS['default'];
}

// ─── Swipe Card ───────────────────────────────────────────────────────────────

function SwipeCard({
  restaurant,
  onAction,
  isTop,
  stackIndex,
  progress,
  total,
}: {
  restaurant: any;
  onAction: (a: SwipeAction) => void;
  isTop: boolean;
  stackIndex: number;
  progress: number;
  total: number;
}) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-16, 16]);
  const likeOp = useTransform(x, [0, 70], [0, 1]);
  const nopeOp = useTransform(x, [-70, 0], [1, 0]);
  const foodPhotos = getFoodPhotos(restaurant.category);

  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 90) onAction('like');
    else if (info.offset.x < -90) onAction('dislike');
  }, [onAction]);

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
      />
    );
  }

  return (
    <motion.div
      className="absolute inset-0 rounded-3xl overflow-hidden"
      style={{ x, rotate, zIndex: 20 }}
      drag={isRevealed ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      whileDrag={{ cursor: 'grabbing' }}
      onTap={() => {
        if (!isRevealed) {
          setPhotoIndex(0);
          setIsRevealed(true);
        }
      }}
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
            {(restaurant.tags || []).slice(0, 2).map((t: string) => (
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
            <span className="text-white/70 text-[11px]">{'₩'.repeat(restaurant.priceRange || 1)}</span>
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

            {/* Single food photo with left/right tap navigation */}
            <div className="flex-1 px-5 pb-4 flex flex-col min-h-0">
              <div className="rounded-2xl overflow-hidden relative flex-1">
                <img src={foodPhotos[photoIndex]} alt="" className="w-full h-full object-cover" draggable={false} />

                {/* Left tap zone — previous photo */}
                <button
                  className="absolute inset-y-0 left-0 w-1/2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoIndex(i => (i - 1 + foodPhotos.length) % foodPhotos.length);
                  }}
                  aria-label="이전 메뉴"
                />
                {/* Right tap zone — next photo */}
                <button
                  className="absolute inset-y-0 right-0 w-1/2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoIndex(i => (i + 1) % foodPhotos.length);
                  }}
                  aria-label="다음 메뉴"
                />

                {/* dot indicator */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
                  {foodPhotos.map((_, j) => (
                    <div key={j} className="w-1.5 h-1.5 rounded-full"
                      style={{ background: j === photoIndex ? 'white' : 'rgba(255,255,255,0.4)' }} />
                  ))}
                </div>
              </div>
              <div className="pt-3 flex-shrink-0">
                <p className="font-bold text-[16px] text-white">메뉴 {photoIndex + 1}</p>
                <p className="text-[12px] text-white/50 mt-0.5">{restaurant.description}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {(restaurant.tags || []).map((t: string) => (
                    <span key={t} className="text-[11px] font-semibold bg-white/15 text-white/90 px-2.5 py-1 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* hint */}
            <div className="text-center pb-2 flex-shrink-0">
              <p className="text-white/40 text-[11px]">← 이전 / 다음 메뉴 → · ✕ 눌러서 닫기</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function formatRemainingTime(deadlineStr: string | null): string {
  if (!deadlineStr) return '';
  const diffMs = new Date(deadlineStr).getTime() - Date.now();
  if (diffMs <= 0) return '00:00';
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffHours >= 24) {
    const days = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    return `${days}일 ${remainingHours}시간`;
  }
  if (diffHours >= 1) {
    const remainingMins = diffMins % 60;
    return `${diffHours}시간 ${remainingMins}분`;
  }
  const mins = diffMins % 60;
  const secs = diffSecs % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ─── Results Screen ───────────────────────────────────────────────────────────

function ResultsScreen({ swipeData, onReset }: {
  swipeData: { restaurant: any; action: SwipeAction }[];
  onReset: () => void;
}) {
  const [, navigate] = useLocation();
  const { currentSession, restaurants } = useApp();
  const [view, setView] = useState<'group' | 'personal'>('group');
  const [liveResults, setLiveResults] = useState<{
    completedCount: number;
    totalMembers: number;
    results: { restaurantId: string; score: number; likeCount: number; dislikeCount: number }[];
    isExpired?: boolean;
    deadlineAt?: string;
  }>({
    completedCount: 1,
    totalMembers: currentSession?.members.length || 1,
    results: []
  });
  const [timeLeft, setTimeLeft] = useState('');

  // Ticking effect for the remaining time in results screen
  useEffect(() => {
    const deadline = liveResults.deadlineAt || currentSession?.deadline || null;
    if (!deadline) return;
    
    const tick = () => {
      setTimeLeft(formatRemainingTime(deadline));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [liveResults.deadlineAt, currentSession?.deadline]);

  // Poll server results dynamically
  useEffect(() => {
    if (!currentSession) return;
    
    const fetchLiveResults = async () => {
      try {
        const res = await fetch(`/api/sessions/${currentSession.inviteCode}/results`);
        if (res.ok) {
          const data = await res.json();
          setLiveResults(data);
        }
      } catch (e) {
        console.error('Failed to fetch live session results:', e);
      }
    };

    fetchLiveResults();
    const interval = setInterval(fetchLiveResults, 3000);
    return () => clearInterval(interval);
  }, [currentSession]);

  // Personal scores based on local swipes
  const personalScores = restaurants.map(r => {
    const record = swipeData.find(s => s.restaurant.id === r.id);
    const score = record?.action === 'like' ? 14 : 0;
    return { restaurant: r, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  // Group scores fetched from backend
  const groupScores = liveResults.results.map(item => {
    const r = restaurants.find(x => x.id === item.restaurantId);
    return {
      restaurant: r!,
      score: item.score,
      likeCount: item.likeCount,
      dislikeCount: item.dislikeCount
    };
  }).filter(s => s.restaurant !== undefined);

  // If group scores is empty (no votes yet from anyone), fallback to personal scores or display loading
  const displayScores = view === 'personal' 
    ? personalScores 
    : (groupScores.length > 0 ? groupScores : personalScores);

  const winner = displayScores[0]?.restaurant;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-dvh bg-white pb-8"
    >
      <div className="px-5 pt-12 pb-4">
        <h1 className="font-black text-[22px] text-[#1A1A1A]">
          {liveResults.isExpired || liveResults.completedCount >= liveResults.totalMembers ? '🎉 결과 발표!' : '📊 현재 순위'}
        </h1>
        
        {/* Completion Progress & Timer */}
        <div className="mt-2 bg-[#FFF5F5] rounded-2xl p-4 border border-[#EB5053]/10 space-y-3">
          {timeLeft && !liveResults.isExpired && liveResults.completedCount < liveResults.totalMembers && (
            <div className="flex items-center justify-between pb-2.5 border-b border-[#EB5053]/10">
              <span className="text-[12px] font-bold text-[#4A4A4A]">남은 투표 시간</span>
              <span className="text-[16px] font-black text-[#EB5053] tracking-widest tabular-nums font-mono">{timeLeft}</span>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#EB5053]">투표 진행 현황</span>
              <span className="text-[13px] font-black text-[#EB5053]">
                {liveResults.completedCount} / {liveResults.totalMembers} 명 완료
              </span>
            </div>
            <div className="w-full bg-[#E5E5E5] h-2 rounded-full overflow-hidden mt-2">
              <motion.div 
                className="h-full rounded-full"
                style={{ background: '#EB5053' }}
                initial={{ width: 0 }}
                animate={{ width: `${(liveResults.completedCount / (liveResults.totalMembers || 1)) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex mx-5 mb-4 bg-[#F5F5F5] rounded-xl p-1">
        {(['group', 'personal'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all"
            style={view === v ? { background: 'white', color: '#EB5053', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: '#9B9B9B' }}>
            {v === 'group' ? '그룹 순위' : '개인 순위'}
          </button>
        ))}
      </div>

      <div className="px-5 space-y-3 mb-6">
        {displayScores.length === 0 ? (
          <p className="text-[13px] text-[#9B9B9B] text-center py-12">투표 데이터가 아직 존재하지 않습니다</p>
        ) : (
          displayScores.slice(0, 5).map((item, i) => (
            <motion.div
              key={item.restaurant.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 p-3 rounded-2xl border border-black/5"
              style={{ background: i === 0 ? '#FFF5F5' : '#F5F5F5' }}
            >
              <img src={item.restaurant.image} alt="" className="w-12 h-12 object-cover rounded-xl flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px] text-[#1A1A1A] truncate">{item.restaurant.name}</p>
                <p className="text-[11px] text-[#9B9B9B] mt-0.5">{item.restaurant.category} · {item.restaurant.address}</p>
              </div>
              <div className="text-right">
                <span className="font-black text-[20px]" style={{ color: i === 0 ? '#EB5053' : '#4A4A4A' }}>
                  {item.score}
                </span>
                <p className="text-[9px] text-[#9B9B9B]">점</p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {winner && (
        <div className="px-5">
          {liveResults.isExpired || liveResults.completedCount >= liveResults.totalMembers ? (
            <>
              <button
                onClick={() => navigate(`/lunchie/map?id=${winner.id}`)}
                className="w-full py-4 rounded-2xl font-bold text-white text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-[#EB5053]/20"
                style={{ background: '#EB5053' }}
              >
                🗺️ {winner.name} 식당 찾기
              </button>
              <button onClick={() => { onReset(); navigate('/'); }}
                className="w-full py-3 mt-2 rounded-2xl font-semibold text-[#9B9B9B] text-[14px] active:scale-[0.98]">
                처음으로
              </button>
            </>
          ) : (
            <>
              <button onClick={() => window.history.back()}
                className="w-full py-4 rounded-2xl font-bold text-[#EB5053] border border-[#EB5053] text-[15px] active:scale-[0.98] bg-white transition-all">
                대기 화면으로 돌아가기 ⏳
              </button>
              <button onClick={() => { onReset(); navigate('/'); }}
                className="w-full py-3 mt-2 rounded-2xl font-semibold text-[#9B9B9B] text-[14px] active:scale-[0.98]">
                처음으로
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Finals (결승전) Screen ──────────────────────────────────────────────────

function FinalBattleResultScreen({
  finalist1,
  finalist2,
  onContinue,
}: {
  finalist1: any;
  finalist2: any;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-dvh flex flex-col bg-[#1A1A1A]"
    >
      {/* Header */}
      <div className="px-5 pt-12 pb-4 text-center">
        <p className="font-black text-white text-[22px]">결승전 🏆</p>
        <p className="text-white/50 text-[13px] mt-1">모두의 투표로 결정된 최후의 2곳</p>
      </div>

      {/* Diagonal split layout */}
      <div className="flex-1 relative overflow-hidden">
        {/* Finalist 1 — winner, top-left triangle */}
        <div
          className="absolute inset-0"
          style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
        >
          <img src={finalist1.image} alt={finalist1.name} className="w-full h-full object-cover" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/45 to-black/70" />
          <div className="absolute top-6 left-5 right-20 text-left">
            <span className="inline-block bg-[#FFD700] text-[#1A1A1A] text-[11px] font-black px-3 py-1 rounded-full mb-2">
              🏆 1위
            </span>
            <p className="text-white font-black text-[19px] leading-tight">{finalist1.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Star size={12} fill="#FFD700" color="#FFD700" />
              <span className="text-white/85 text-[12px]">{finalist1.rating}</span>
              <span className="text-white/60 text-[11px]">{finalist1.distance}</span>
            </div>
          </div>
        </div>

        {/* Finalist 2 — runner-up, bottom-right triangle */}
        <div
          className="absolute inset-0"
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.55 }}
        >
          <img src={finalist2.image} alt={finalist2.name} className="w-full h-full object-cover" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/45 to-black/30" />
          <div className="absolute bottom-6 right-5 left-20 text-right">
            <span className="inline-block bg-white/20 text-white text-[11px] font-black px-3 py-1 rounded-full mb-2">
              2위
            </span>
            <p className="text-white font-black text-[19px] leading-tight">{finalist2.name}</p>
            <div className="flex items-center gap-2 mt-1 justify-end">
              <Star size={12} fill="#FFD700" color="#FFD700" />
              <span className="text-white/85 text-[12px]">{finalist2.rating}</span>
              <span className="text-white/60 text-[11px]">{finalist2.distance}</span>
            </div>
          </div>
        </div>

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
          <div className="w-14 h-14 rounded-full bg-[#F09D09] border-[3px] border-white flex items-center justify-center shadow-2xl">
            <span className="font-black text-white text-[15px]">VS</span>
          </div>
        </motion.div>
      </div>

      {/* Continue */}
      <div className="px-5 py-5">
        <button
          onClick={onContinue}
          className="w-full py-4 rounded-2xl font-bold text-white text-[15px] active:scale-[0.98] shadow-xl"
          style={{ background: '#F09D09' }}
        >
          최종 순위 보기 📊
        </button>
      </div>
    </motion.div>
  );
}

// ─── Decided Screen ───────────────────────────────────────────────────────────

function WaitingOrDecidedScreen({ onContinue }: { onContinue: () => void }) {
  const [, navigate] = useLocation();
  const { currentSession, restaurants } = useApp();
  const [liveResults, setLiveResults] = useState<{
    completedCount: number;
    totalMembers: number;
    memberCompletion: { id: string; name: string; emoji: string; completed: boolean; swipeCount: number; targetCount: number }[];
    results: { restaurantId: string; score: number; likeCount: number; dislikeCount: number }[];
    isExpired: boolean;
    deadlineAt: string | null;
  }>({
    completedCount: 1,
    totalMembers: currentSession?.members.length || 1,
    memberCompletion: [],
    results: [],
    isExpired: false,
    deadlineAt: currentSession?.deadline || null
  });
  const [timeLeft, setTimeLeft] = useState('');

  // Ticking effect for countdown
  useEffect(() => {
    const deadline = liveResults.deadlineAt || currentSession?.deadline || null;
    if (!deadline) return;
    
    const tick = () => {
      setTimeLeft(formatRemainingTime(deadline));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [liveResults.deadlineAt, currentSession?.deadline]);

  // Poll server results dynamically
  useEffect(() => {
    if (!currentSession) return;
    
    const fetchLiveResults = async () => {
      try {
        const res = await fetch(`/api/sessions/${currentSession.inviteCode}/results`);
        if (res.ok) {
          const data = await res.json();
          setLiveResults(data);
        }
      } catch (e) {
        console.error('Failed to fetch live session results:', e);
      }
    };

    fetchLiveResults();
    const interval = setInterval(fetchLiveResults, 3000);
    return () => clearInterval(interval);
  }, [currentSession]);

  const isAllCompleted = liveResults.completedCount >= liveResults.totalMembers || liveResults.isExpired;

  // Find group winner + runner-up (top 2 in results, looked up in restaurants list)
  const winnerId = liveResults.results[0]?.restaurantId;
  const runnerUpId = liveResults.results[1]?.restaurantId;
  const winner = restaurants.find(r => r.id === winnerId) || currentSession?.restaurants[0];
  const runnerUp = restaurants.find(r => r.id === runnerUpId);

  // 최종 음식점 두 곳이 모두 정해졌으면 결승전(VS) 화면으로 결과를 보여준다.
  if (isAllCompleted && winner && runnerUp) {
    return <FinalBattleResultScreen finalist1={winner} finalist2={runnerUp} onContinue={onContinue} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-dvh flex flex-col justify-between px-5 py-8"
      style={{
        background: isAllCompleted 
          ? 'linear-gradient(160deg, #EB5053 0%, #8B4513 100%)'
          : 'linear-gradient(160deg, #2C3E50 0%, #1a252f 100%)'
      }}
    >
      <div className="flex-1 flex flex-col justify-center text-center">
        {isAllCompleted ? (
          // Decided state (Everyone finished!)
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="space-y-6 animate-fade-in"
          >
            <div className="text-7xl">🎉</div>
            <div>
              <h2 className="text-white font-black text-[28px] mb-1">결정됐어요!</h2>
              <p className="text-white/80 text-[13px]">모든 친구들이 투표를 완료했습니다</p>
            </div>
            
            {winner && (
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/10 text-center max-w-[340px] mx-auto space-y-3 shadow-xl">
                <img src={winner.image} alt="" className="w-20 h-20 rounded-full object-cover mx-auto border-2 border-white/20" />
                <div>
                  <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">{winner.category}</span>
                  <p className="text-white font-black text-[18px] mt-1">{winner.name}</p>
                  <p className="text-white/70 text-[11px] mt-0.5 truncate">{winner.address}</p>
                </div>
                <div className="flex items-center justify-center gap-3 text-white/80 text-[11px] pt-1">
                  <span>⭐ {winner.rating}</span>
                  <span>📍 {winner.distance || '500m'}</span>
                  <span>💰 {'₩'.repeat(winner.priceRange)}</span>
                </div>
              </div>
            )}
            
            <button onClick={onContinue}
              className="w-full max-w-[340px] py-4 rounded-2xl font-bold text-[#EB5053] text-[15px] bg-white active:scale-[0.98] transition-all shadow-md mx-auto block">
              최종 순위 보기 📊
            </button>
          </motion.div>
        ) : (
          // Waiting state (Others still voting)
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="space-y-6"
          >
            <div className="text-5xl animate-bounce">⏳</div>
            <div>
              <h2 className="text-white font-black text-[24px] mb-1">다른 친구들을 기다리는 중...</h2>
              <p className="text-white/70 text-[12px]">아직 투표를 진행 중인 친구들이 있습니다</p>
            </div>

            {/* Countdown Timer */}
            {timeLeft && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 max-w-[340px] mx-auto border border-white/10">
                <span className="text-[11px] text-white/60 block mb-1 font-semibold uppercase tracking-wider">남은 투표 시간</span>
                <span className="text-[28px] font-black text-white tracking-widest tabular-nums font-mono">
                  {timeLeft}
                </span>
              </div>
            )}

            {/* Progress Bar */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 max-w-[340px] mx-auto border border-white/10">
              <div className="flex justify-between items-center mb-2 text-white/95">
                <span className="text-[12px] font-bold">투표 현황</span>
                <span className="text-[13px] font-black">{liveResults.completedCount} / {liveResults.totalMembers} 명 완료</span>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full rounded-full bg-[#EB5053]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(liveResults.completedCount / (liveResults.totalMembers || 1)) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            {/* Member List */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 max-w-[340px] mx-auto border border-white/5 text-left max-h-[180px] overflow-y-auto space-y-1.5">
              {liveResults.memberCompletion.map(member => (
                <div key={member.id} className="flex items-center justify-between p-2 bg-white/5 rounded-xl text-white">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{member.emoji}</span>
                    <span className="text-[13px] font-semibold">{member.name}</span>
                  </div>
                  {member.completed ? (
                    <span className="text-[11px] text-[#3CBA44] font-bold bg-[#3CBA44]/10 px-2 py-0.5 rounded-full">완료 ✅</span>
                  ) : (
                    <span className="text-[11px] text-white/50 font-semibold bg-white/10 px-2 py-0.5 rounded-full">
                      투표 중 ({member.swipeCount}/{member.targetCount})
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button onClick={onContinue}
              className="w-full max-w-[340px] py-4 rounded-2xl font-bold text-white text-[15px] border border-white/30 hover:bg-white/10 active:scale-[0.98] transition-all mx-auto block">
              실시간 순위 먼저 보기 📊
            </button>
          </motion.div>
        )}
      </div>

      <button onClick={() => navigate('/')}
        className="mt-6 text-white/60 hover:text-white text-[12px] active:scale-95 text-center mx-auto block">
        처음으로
      </button>
    </motion.div>
  );
}

// ─── Main Quick Match Page ────────────────────────────────────────────────────

type Phase = 'swipe' | 'decided' | 'results';

export default function QuickMatchPage() {
  const [, navigate] = useLocation();
  const { currentSession, addSwipe, swipeRecords } = useApp();
  const [phase, setPhase] = useState<Phase>('swipe');
  const targetRestaurants = currentSession?.restaurants || [];
  const currentSessionSwipes = swipeRecords.filter(s => s.sessionId === currentSession?.id);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const initialIndex = targetRestaurants.findIndex(r => !currentSessionSwipes.some(s => s.restaurantId === r.id));
    return initialIndex === -1 ? 0 : initialIndex;
  });
  const [swipeData, setSwipeData] = useState<{ restaurant: any; action: SwipeAction }[]>([]);
  const [showIntro, setShowIntro] = useState(true);
  const [remainingMs, setRemainingMs] = useState(() => {
    if (!currentSession?.deadline) return 0;
    return Math.max(0, new Date(currentSession.deadline).getTime() - Date.now());
  });

  // Countdown ticker for the header badge
  useEffect(() => {
    if (!currentSession?.deadline) return;
    const deadlineTime = new Date(currentSession.deadline).getTime();
    const iv = setInterval(() => {
      setRemainingMs(Math.max(0, deadlineTime - Date.now()));
    }, 1000);
    return () => clearInterval(iv);
  }, [currentSession?.deadline]);

  // If no session, go to create session page
  useEffect(() => {
    if (!currentSession) {
      navigate('/lunchie/settings');
    }
  }, [currentSession, navigate]);

  // Expiry check
  useEffect(() => {
    if (!currentSession?.deadline) return;
    const deadlineTime = new Date(currentSession.deadline).getTime();
    
    const checkExpiry = () => {
      if (Date.now() > deadlineTime) {
        setPhase('decided');
      }
    };
    
    checkExpiry();
    const timer = setInterval(checkExpiry, 1000);
    return () => clearInterval(timer);
  }, [currentSession?.deadline]);

  const total = Math.min(targetRestaurants.length, 10);
  const visibleCards = targetRestaurants.slice(currentIndex, currentIndex + 3);
  const progress = Math.min(currentIndex + 1, total);

  // Auto-transition to decided phase if all cards have been swiped
  useEffect(() => {
    const currentSessionSwipes = swipeRecords.filter(s => s.sessionId === currentSession?.id);
    const unswipedCount = targetRestaurants.filter(r => !currentSessionSwipes.some(s => s.restaurantId === r.id)).length;
    if (unswipedCount === 0 || currentIndex >= total) {
      setPhase('decided');
    }
  }, [currentIndex, targetRestaurants, swipeRecords, total, currentSession?.id]);

  useEffect(() => {
    if (showIntro) {
      const t = setTimeout(() => setShowIntro(false), 1800);
      return () => clearTimeout(t);
    }
  }, [showIntro]);

  const handleAction = useCallback((action: SwipeAction) => {
    const restaurant = targetRestaurants[currentIndex];
    if (!restaurant) return;

    addSwipe(restaurant.id, action === 'like' ? 'like' : 'skip');
    setSwipeData(prev => [...prev, { restaurant, action }]);

    if (currentIndex + 1 >= total) {
      setPhase('decided');
    } else {
      setCurrentIndex(i => i + 1);
    }
  }, [currentIndex, targetRestaurants, addSwipe, total]);

  const topPick = swipeData.find(s => s.action === 'like')?.restaurant || targetRestaurants[0];

  if (!currentSession) return null;

  if (phase === 'decided') {
    return <WaitingOrDecidedScreen onContinue={() => setPhase('results')} />;
  }
  if (phase === 'results') {
    return <ResultsScreen swipeData={swipeData} onReset={() => { setCurrentIndex(0); setSwipeData([]); }} />;
  }

  // Countdown formatting for header badge
  const totalSec = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  const urgent = remainingMs > 0 && remainingMs <= 30000;

  return (
    <div className="min-h-dvh bg-[#FFF8F2] relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3">
        <button onClick={() => navigate('/session/lobby')}
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center active:scale-95 flex-shrink-0">
          <ArrowLeft size={18} color="#1A1A1A" />
        </button>
        <div className="text-center">
          <p className="font-black text-[16px] text-[#1A1A1A]">예선전 🍽️</p>
          <p className="text-[11px] text-[#9B9B9B]">마음에 드는 음식을 골라보세요 · {progress}/{total}</p>
        </div>
        {currentSession?.deadline ? (
          <motion.div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
            style={{ background: urgent ? '#F09D09' : '#FFF1E0' }}
            animate={urgent ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 1, repeat: urgent ? Infinity : 0 }}
          >
            <Clock size={14} color={urgent ? 'white' : '#F09D09'} />
            <span className="font-black text-[13px] tabular-nums" style={{ color: urgent ? 'white' : '#F09D09' }}>
              {mm}:{ss}
            </span>
          </motion.div>
        ) : (
          <div className="w-10 flex-shrink-0" />
        )}
      </div>

      {/* Intro overlay */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            className="absolute inset-0 bg-[#1A1A1A] z-50 flex flex-col items-center justify-center"
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <p className="font-black text-white text-[22px]">예선전 시작! 🍽️</p>
            <p className="text-white/60 text-[14px] mt-2">카드를 스와이프 하세요</p>
            <div className="flex gap-8 mt-6">
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                  <X size={24} color="#EB5053" strokeWidth={2.5} />
                </div>
                <span className="text-white/70 text-[12px]">싫어요</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#EB5053' }}>
                  <Heart size={24} color="white" fill="white" />
                </div>
                <span className="text-white/70 text-[12px]">좋아요</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card stack — 9:12 ratio */}
      <div className="px-5 py-2 relative flex items-center justify-center">
        <div className="relative w-full" style={{ aspectRatio: '9/12', maxHeight: '64dvh' }}>
          <AnimatePresence>
            {visibleCards.map((restaurant, i) => (
              <SwipeCard
                key={restaurant.id}
                restaurant={restaurant}
                onAction={handleAction}
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
          onClick={() => handleAction('dislike')}
          className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center active:scale-90"
          whileTap={{ scale: 0.85 }}
        >
          <X size={32} color="#EB5053" strokeWidth={2.5} />
        </motion.button>
        <motion.button
          onClick={() => handleAction('like')}
          className="w-20 h-20 rounded-full shadow-xl flex items-center justify-center active:scale-90"
          style={{ background: '#EB5053' }}
          whileTap={{ scale: 0.85 }}
        >
          <Heart size={32} color="white" fill="white" />
        </motion.button>
      </div>
    </div>
  );
}
