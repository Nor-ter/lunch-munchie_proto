/**
 * Lunchie Munchie — Quick Match Page
 * Design: Soft Coral (Option 8) + Pubfish Reference
 * Flow: 세션 만들기 / 참여하기 → 스와이프 → 결과 발표
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { ArrowLeft, Copy, Heart, X, Triangle, Star, MapPin, Clock, Users } from 'lucide-react';
import { useApp, MOCK_RESTAURANTS } from '@/contexts/AppContext';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type SwipeAction = 'like' | 'maybe' | 'dislike';

interface SessionMember {
  id: string;
  name: string;
  emoji: string;
  ready: boolean;
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
  restaurant: typeof MOCK_RESTAURANTS[0];
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

  // Category color
  const catColor = restaurant.category === '카페' ? '#3E719B'
    : restaurant.category === '치킨' ? '#EB5053'
    : restaurant.category === '일식' ? '#3CBA44'
    : '#F09D09';

  if (!isTop) {
    return (
      <div
        className="absolute inset-0 rounded-3xl overflow-hidden"
        style={{
          transform: `scale(${1 - stackIndex * 0.05}) translateY(${stackIndex * 16}px)`,
          zIndex: 10 - stackIndex,
          opacity: 1 - stackIndex * 0.2,
          background: stackIndex === 1 ? '#d4a574' : '#c4956a',
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
      {/* Card background */}
      <div className="w-full h-full relative" style={{ background: 'linear-gradient(160deg, #c8956c 0%, #a0522d 100%)' }}>
        {/* Food illustration area */}
        <div className="flex items-center justify-center h-[55%] relative">
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="w-40 h-40 object-cover rounded-full border-4 border-white/30 shadow-2xl"
            draggable={false}
          />
          {/* Progress */}
          <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-5">
            <span className="text-white/80 text-[12px] font-semibold">{progress}/{total}</span>
            <div className="flex gap-1.5">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-[12px]">😊</span>
              </div>
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-[12px]">😄</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card info */}
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
              <span className="text-white/60 text-[11px]">{restaurant.distance}</span>
            </div>
          </div>
        </div>

        {/* Overlays */}
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

// ─── Session Create ───────────────────────────────────────────────────────────

function SessionCreate({ onStart }: { onStart: (members: SessionMember[]) => void }) {
  const [sessionCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  const [selectedTime, setSelectedTime] = useState('11:30');
  const [members] = useState<SessionMember[]>([
    { id: '1', name: '나', emoji: '🦊', ready: true },
    { id: '2', name: '지민', emoji: '🐱', ready: true },
    { id: '3', name: '수현', emoji: '🐻', ready: false },
    { id: '4', name: '태양', emoji: '🐯', ready: false },
  ]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionCode);
    toast.success('세션 코드가 복사됐어요! 📋');
  };

  return (
    <div className="space-y-4">
      {/* Session Code */}
      <div className="rounded-2xl p-4" style={{ background: '#EB5053' }}>
        <p className="text-white/80 text-[11px] font-semibold mb-1">세션 코드</p>
        <div className="flex items-center justify-between">
          <span className="text-white font-black text-[28px] tracking-widest">{sessionCode}</span>
          <button onClick={handleCopy}
            className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center active:scale-95">
            <Copy size={16} color="white" />
          </button>
        </div>
        <p className="text-white/70 text-[11px] mt-1">친구들에게 이 코드를 공유하세요</p>
      </div>

      {/* Time picker */}
      <div className="rounded-2xl p-4 bg-[#F5F5F5]">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} color="#9B9B9B" />
          <p className="text-[13px] font-semibold text-[#1A1A1A]">마감 시간</p>
        </div>
        <div className="flex gap-2">
          {['11:00', '11:30', '12:00'].map(t => (
            <button key={t} onClick={() => setSelectedTime(t)}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-95"
              style={selectedTime === t
                ? { background: '#EB5053', color: 'white' }
                : { background: 'white', color: '#4A4A4A', border: '1px solid #E5E5E5' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Members */}
      <div className="rounded-2xl p-4 bg-[#F5F5F5]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={15} color="#9B9B9B" />
            <p className="text-[13px] font-semibold text-[#1A1A1A]">멤버 ({members.filter(m => m.ready).length}/{members.length})</p>
          </div>
          <button className="text-[11px] font-semibold" style={{ color: '#EB5053' }}>더보기</button>
        </div>
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[16px] shadow-sm">
                {m.emoji}
              </div>
              <span className="flex-1 text-[13px] font-semibold text-[#1A1A1A]">{m.name}</span>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                m.ready ? 'text-white' : 'text-[#9B9B9B] bg-white'
              }`} style={m.ready ? { background: '#EB5053' } : {}}>
                {m.ready ? '준비 완료' : '대기 중'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={() => onStart(members)}
        className="w-full py-4 rounded-2xl font-black text-white text-[16px] active:scale-[0.98] transition-all"
        style={{ background: '#EB5053' }}
      >
        스와이프로 시작! ({members.filter(m => m.ready).length}명 준비)
      </button>
    </div>
  );
}

// ─── Session Join ─────────────────────────────────────────────────────────────

function SessionJoin({ onJoin }: { onJoin: () => void }) {
  const [code, setCode] = useState('');

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5 bg-[#F5F5F5] text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#F09D09] flex items-center justify-center text-3xl mx-auto mb-3">
          🔑
        </div>
        <p className="text-[14px] font-semibold text-[#1A1A1A] mb-1">친구에게 받은 코드를 입력하세요</p>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="XXXXXX"
          maxLength={6}
          className="w-full mt-3 text-center text-[24px] font-black tracking-[0.3em] bg-white rounded-xl px-4 py-3 outline-none border-2 transition-all"
          style={{ borderColor: code.length === 6 ? '#EB5053' : '#E5E5E5', color: '#1A1A1A' }}
        />
      </div>
      <button
        onClick={() => { if (code.length === 6) onJoin(); else toast.error('6자리 코드를 입력해주세요'); }}
        className="w-full py-4 rounded-2xl font-bold text-white text-[15px] active:scale-[0.98] transition-all"
        style={{ background: code.length === 6 ? '#EB5053' : '#9B9B9B' }}
      >
        세션 참여하기
      </button>
    </div>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────

function ResultsScreen({ swipeData, onReset }: {
  swipeData: { restaurant: typeof MOCK_RESTAURANTS[0]; action: SwipeAction }[];
  onReset: () => void;
}) {
  const [, navigate] = useLocation();
  const [view, setView] = useState<'group' | 'personal'>('group');

  // Compute group scores
  const scores = MOCK_RESTAURANTS.map(r => {
    const record = swipeData.find(s => s.restaurant.id === r.id);
    const score = record?.action === 'like' ? 14 : record?.action === 'maybe' ? 8 : 0;
    return { restaurant: r, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  const winner = scores[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-dvh bg-white"
    >
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="font-black text-[22px] text-[#1A1A1A]">🎉 결과 발표!</h1>
        <p className="text-[13px] text-[#9B9B9B]">4명 모두 투표 완료</p>
      </div>

      {/* Tabs */}
      <div className="flex mx-5 mb-4 bg-[#F5F5F5] rounded-xl p-1">
        {(['group', 'personal'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all"
            style={view === v ? { background: 'white', color: '#EB5053', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: '#9B9B9B' }}>
            {v === 'group' ? '그룹 순위' : '개인 순위'}
          </button>
        ))}
      </div>

      {/* Scores */}
      <div className="px-5 space-y-3 mb-6">
        {scores.slice(0, 4).map((item, i) => (
          <motion.div
            key={item.restaurant.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ background: i === 0 ? '#FFF5F5' : '#F5F5F5' }}
          >
            <img src={item.restaurant.image} alt="" className="w-12 h-12 object-cover rounded-xl flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[14px] text-[#1A1A1A]">{item.restaurant.name}</p>
              <div className="flex gap-1 mt-1">
                {/* Mini vote indicators */}
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                    style={{ background: j < 2 ? '#EB5053' : '#F09D09' }}>
                    {j < 2 ? '○' : '△'}
                  </div>
                ))}
              </div>
            </div>
            <span className="font-black text-[22px]" style={{ color: i === 0 ? '#EB5053' : '#4A4A4A' }}>
              {item.score}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Winner CTA */}
      {winner && (
        <div className="px-5">
          <button
            onClick={() => navigate('/tour-map')}
            className="w-full py-4 rounded-2xl font-bold text-white text-[15px] flex items-center justify-center gap-2 active:scale-[0.98]"
            style={{ background: '#EB5053' }}
          >
            🗺️ {winner.restaurant.name} 식당 찾기
          </button>
          <button onClick={onReset}
            className="w-full py-3 mt-2 rounded-2xl font-semibold text-[#9B9B9B] text-[14px] active:scale-[0.98]">
            처음으로
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Decided Screen ───────────────────────────────────────────────────────────

function DecidedScreen({ winner, onContinue }: { winner: typeof MOCK_RESTAURANTS[0]; onContinue: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-dvh flex flex-col items-center justify-center px-5"
      style={{ background: 'linear-gradient(160deg, #c8956c 0%, #8B4513 100%)' }}
    >
      <motion.div
        animate={{ rotate: [0, -5, 5, -5, 0] }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-7xl mb-4"
      >
        ✅
      </motion.div>
      <h2 className="text-white font-black text-[28px] mb-1">결정됐어요!</h2>
      <div className="flex items-center gap-2 mb-6">
        <img src={winner.image} alt="" className="w-8 h-8 rounded-full object-cover" />
        <p className="text-white/90 font-bold text-[18px]">{winner.name}</p>
      </div>
      <div className="bg-white/20 rounded-2xl p-4 w-full mb-6 text-center">
        <p className="text-white font-semibold text-[14px]">{winner.address}</p>
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className="text-white/80 text-[12px]">⭐ {winner.rating}</span>
          <span className="text-white/80 text-[12px]">📍 {winner.distance}</span>
          <span className="text-white/80 text-[12px]">💰 {'₩'.repeat(winner.priceRange)}</span>
        </div>
      </div>
      <button onClick={onContinue}
        className="w-full py-4 rounded-2xl font-bold text-[#8B4513] text-[16px] bg-white active:scale-[0.98]">
        길 찾기 🧭
      </button>
      <button onClick={onContinue}
        className="mt-3 text-white/70 text-[13px] active:scale-95">
        처음으로
      </button>
    </motion.div>
  );
}

// ─── Main Quick Match Page ────────────────────────────────────────────────────

type Phase = 'lobby' | 'swipe' | 'decided' | 'results';

export default function QuickMatchPage() {
  const [, navigate] = useLocation();
  const { restaurants, addSwipe, swipeRecords } = useApp();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [phase, setPhase] = useState<Phase>('lobby');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeData, setSwipeData] = useState<{ restaurant: typeof MOCK_RESTAURANTS[0]; action: SwipeAction }[]>([]);
  const [showIntro, setShowIntro] = useState(true);

  const unswiped = restaurants.filter(r => !swipeRecords.some(s => s.restaurantId === r.id));
  const visibleCards = unswiped.slice(currentIndex, currentIndex + 3);
  const progress = currentIndex + 1;

  useEffect(() => {
    if (showIntro) {
      const t = setTimeout(() => setShowIntro(false), 1800);
      return () => clearTimeout(t);
    }
  }, [showIntro]);

  const handleAction = useCallback((action: SwipeAction) => {
    const restaurant = unswiped[currentIndex];
    if (!restaurant) return;

    addSwipe(restaurant.id, action === 'like' ? 'like' : action === 'maybe' ? 'save' : 'skip');
    setSwipeData(prev => [...prev, { restaurant, action }]);

    if (currentIndex + 1 >= Math.min(unswiped.length, 10)) {
      // Show decided screen with top pick
      setPhase('decided');
    } else {
      setCurrentIndex(i => i + 1);
    }
  }, [currentIndex, unswiped, addSwipe]);

  const topPick = swipeData.find(s => s.action === 'like')?.restaurant || restaurants[0]!;

  if (phase === 'decided' && topPick) {
    return <DecidedScreen winner={topPick} onContinue={() => setPhase('results')} />;
  }
  if (phase === 'results') {
    return <ResultsScreen swipeData={swipeData} onReset={() => { setPhase('lobby'); setCurrentIndex(0); setSwipeData([]); }} />;
  }

  return (
    <div className="min-h-dvh bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center active:scale-95">
          <ArrowLeft size={18} color="#1A1A1A" />
        </button>
        <span className="font-bold text-[17px] text-[#1A1A1A]">Quick Match</span>
        <div className="w-10" />
      </div>

      {phase === 'lobby' ? (
        <div className="px-5">
          {/* Tabs */}
          <div className="flex bg-[#F5F5F5] rounded-xl p-1 mb-5">
            {(['create', 'join'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all"
                style={tab === t ? { background: 'white', color: '#EB5053', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: '#9B9B9B' }}>
                {t === 'create' ? '세션 만들기' : '참여하기'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'create' ? (
              <motion.div key="create" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <SessionCreate onStart={() => setPhase('swipe')} />
              </motion.div>
            ) : (
              <motion.div key="join" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <SessionJoin onJoin={() => setPhase('swipe')} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Swipe Phase */
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
                    <div className="w-12 h-12 rounded-full bg-[#FFFBF0] border-2 border-[#F09D09] flex items-center justify-center">
                      <Triangle size={20} color="#F09D09" />
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
                  total={Math.min(unswiped.length, 10)}
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
              <Triangle size={22} color="#F09D09" />
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
      )}
    </div>
  );
}
