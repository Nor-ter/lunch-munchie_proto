/**
 * Lunchie Munchie — Quick Match Page
 * Design: Soft Coral (Option 8) + Pubfish Reference
 * Flow: 스와이프 → 결과 발표
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { ArrowLeft, Heart, X, Triangle, Star, MapPin } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type SwipeAction = 'like' | 'maybe' | 'dislike';

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
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const opacity = useTransform(x, [-200, -80, 0, 80, 200], [0, 1, 1, 1, 0]);
  const likeOp = useTransform(x, [0, 70], [0, 1]);
  const dislikeOp = useTransform(x, [-70, 0], [1, 0]);

  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 100) onAction('like');
    else if (info.offset.x < -100) onAction('dislike');
  }, [onAction]);

  const catColor = restaurant.category === '카페' ? '#3E719B'
    : restaurant.category === '치킨' ? '#EB5053'
    : restaurant.category === '일식' ? '#3CBA44'
    : '#D94447';

  if (!isTop) {
    return (
      <div
        className="absolute inset-0 rounded-3xl overflow-hidden"
        style={{
          transform: `scale(${1 - stackIndex * 0.05}) translateY(${stackIndex * 16}px)`,
          zIndex: 10 - stackIndex,
          opacity: 1 - stackIndex * 0.2,
          background: stackIndex === 1 ? '#EFD0D4' : '#FFD6D6',
        }}
      />
    );
  }

  return (
    <motion.div
      className="absolute inset-0 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ x, rotate, opacity, zIndex: 20 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.02 }}
    >
      <div className="w-full h-full relative" style={{ background: 'linear-gradient(160deg, #c8956c 0%, #a0522d 100%)' }}>
        <div className="flex items-center justify-center h-[55%] relative">
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="w-40 h-40 object-cover rounded-full border-4 border-white/30 shadow-2xl"
            draggable={false}
          />
          <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-5">
            <span className="text-white/80 text-[12px] font-semibold">{progress}/{total}</span>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: catColor }}>
              {restaurant.category}
            </span>
          </div>
          <h2 className="text-white font-black text-[22px] leading-tight">{restaurant.name}</h2>
          <p className="text-white/70 text-[12px] mt-1 leading-relaxed">{restaurant.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <Star size={12} fill="#FFD700" color="#FFD700" />
              <span className="text-white text-[12px] font-semibold">{restaurant.rating}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={11} color="rgba(255,255,255,0.6)" />
              <span className="text-white/60 text-[11px]">{restaurant.distance || '500m'}</span>
            </div>
          </div>
        </div>

        <motion.div
          className="absolute top-6 left-5 border-4 border-[#3CBA44] rounded-2xl px-4 py-2 rotate-[-12deg]"
          style={{ opacity: likeOp }}
        >
          <span className="text-[#3CBA44] font-black text-[18px]">좋아요 ○</span>
        </motion.div>
        <motion.div
          className="absolute top-6 right-5 border-4 border-[#EB5053] rounded-2xl px-4 py-2 rotate-[12deg]"
          style={{ opacity: dislikeOp }}
        >
          <span className="text-[#EB5053] font-black text-[18px]">싫어요 ✕</span>
        </motion.div>
      </div>
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
    const score = record?.action === 'like' ? 14 : record?.action === 'maybe' ? 8 : 0;
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
  
  // Find group winner (first item in results looked up in restaurants list)
  const winnerId = liveResults.results[0]?.restaurantId;
  const winner = restaurants.find(r => r.id === winnerId) || currentSession?.restaurants[0];

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

    addSwipe(restaurant.id, action === 'like' ? 'like' : action === 'maybe' ? 'save' : 'skip');
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

  return (
    <div className="min-h-dvh bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button onClick={() => navigate('/session/lobby')}
          className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center active:scale-95">
          <ArrowLeft size={18} color="#1A1A1A" />
        </button>
        <span className="font-bold text-[17px] text-[#1A1A1A]">스와이프 투표</span>
        <div className="w-10" />
      </div>

      <div className="px-4">
        {/* Intro overlay */}
        <AnimatePresence>
          {showIntro && (
            <motion.div
              className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center"
              exit={{ opacity: 0 }}
            >
              <motion.div
                animate={{ x: [-50, 50, -50], rotate: [-15, 15, -15] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-6xl mb-4"
              >
                🍱
              </motion.div>
              <p className="font-bold text-[18px] text-[#1A1A1A]">카드를 스와이프하세요!</p>
              <div className="flex gap-6 mt-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-[#FFF5F5] border-2 border-[#EB5053] flex items-center justify-center">
                    <X size={22} color="#EB5053" />
                  </div>
                  <span className="text-[11px] text-[#9B9B9B]">싫어요</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-[#FFF0EE] border-2 border-[#D94447] flex items-center justify-center">
                    <Triangle size={20} color="#D94447" />
                  </div>
                  <span className="text-[11px] text-[#9B9B9B]">그냥봄</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-[#F0FFF4] border-2 border-[#3CBA44] flex items-center justify-center">
                    <Heart size={22} color="#3CBA44" fill="#3CBA44" />
                  </div>
                  <span className="text-[11px] text-[#9B9B9B]">좋아요</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card stack */}
        <div className="relative h-[420px] mb-6">
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

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-5">
          <motion.button
            onClick={() => handleAction('dislike')}
            className="w-16 h-16 rounded-full bg-white shadow-lg border border-[#E5E5E5] flex items-center justify-center active:scale-90"
            whileTap={{ scale: 0.85 }}
          >
            <X size={26} color="#EB5053" strokeWidth={2.5} />
          </motion.button>
          <motion.button
            onClick={() => handleAction('maybe')}
            className="w-14 h-14 rounded-full bg-white shadow-md border border-[#E5E5E5] flex items-center justify-center active:scale-90"
            whileTap={{ scale: 0.85 }}
          >
            <Triangle size={22} color="#D94447" />
          </motion.button>
          <motion.button
            onClick={() => handleAction('like')}
            className="w-16 h-16 rounded-full shadow-lg flex items-center justify-center active:scale-90"
            style={{ background: '#3CBA44' }}
            whileTap={{ scale: 0.85 }}
          >
            <Heart size={26} color="white" fill="white" />
          </motion.button>
        </div>

        <p className="text-[11px] text-[#9B9B9B] text-center mt-3">
          싫어요 · 그냥봄 · 좋아요
        </p>
      </div>
    </div>
  );
}
