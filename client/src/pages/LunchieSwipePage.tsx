/**
 * Lunchie Munchie — Quick Match Page
 * Design: Soft Coral (Option 8) + Pubfish Reference
 * Flow: 스와이프 → 결과 발표
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { ArrowLeft, Heart, X, Star, MapPin, Clock, Phone, Navigation, Share2, Download, Link2, Home } from 'lucide-react';
import { toast } from 'sonner';
import { useApp, type Restaurant } from '@/contexts/AppContext';
import { getFoodPhotos } from '@/lib/foodPhotos';
import { useCourseShare } from '@/hooks/useCourseShare';
import WinnerShareCard from '@/components/lunchie/WinnerShareCard';

// ─── Types ────────────────────────────────────────────────────────────────────

type SwipeAction = 'like' | 'dislike';

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

// ─── Winner Screen ────────────────────────────────────────────────────────────

function WinnerScreen({ selectedWinner, onReset }: { selectedWinner?: Restaurant | null; onReset: () => void }) {
  const [, navigate] = useLocation();
  const { currentSession, restaurants } = useApp();
  const { captureCard, downloadImage } = useCourseShare();
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [showShare, setShowShare] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [liveResults, setLiveResults] = useState<{
    results: { restaurantId: string; score: number; likeCount: number; dislikeCount: number }[];
  }>({ results: [] });

  // Poll server results to determine the winning restaurant (skipped once the user has picked one in the finals)
  useEffect(() => {
    if (!currentSession || selectedWinner) return;

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
  }, [currentSession, selectedWinner]);

  const winnerId = liveResults.results[0]?.restaurantId;
  const winner = selectedWinner || restaurants.find(r => r.id === winnerId) || currentSession?.restaurants[0];

  if (!winner) return null;

  const foodPhotos = getFoodPhotos(winner.category).slice(0, 4);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(winner.address);
    toast.success('주소가 복사됐어요! 📋');
  };

  const handleSaveImage = async () => {
    setIsCapturing(true);
    try {
      const dataUrl = await captureCard(shareCardRef);
      await downloadImage(dataUrl, `lunchie-${winner.name}.png`);
      toast.success('이미지가 저장됐어요! 🎉');
    } catch (e) {
      console.error('Failed to save share card:', e);
      toast.error('이미지 저장에 실패했어요');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleShareImage = async () => {
    setIsCapturing(true);
    try {
      const dataUrl = await captureCard(shareCardRef);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `lunchie-${winner.name}.png`, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Lunchie Munchie',
          text: `오늘의 점심은 ${winner.name}! 🍽️`,
        });
      } else {
        await downloadImage(dataUrl, `lunchie-${winner.name}.png`);
        toast.success('이미지가 저장됐어요. 갤러리에서 공유해보세요! 📤');
      }
    } catch (e) {
      console.error('Failed to share card:', e);
      toast.error('공유에 실패했어요');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-dvh bg-[#FCF4EE] pb-10"
    >
      {/* Hero */}
      <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
        <img src={winner.image} alt={winner.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5 text-center">
          <div className="text-[40px] leading-none mb-1">🏆</div>
          <span className="inline-block text-[11px] font-black text-white bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mb-1.5">
            오늘의 점심 당첨!
          </span>
          <h1 className="text-white font-black text-[24px] leading-tight">{winner.name}</h1>
        </div>
      </div>

      {/* Detail Card */}
      <div className="px-5 -mt-5 relative">
        <div className="bg-white rounded-3xl p-5 shadow-lg space-y-4">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-[#FFF5F5] rounded-full px-2.5 py-1">
              <Star size={12} fill="#EB5053" color="#EB5053" />
              <span className="text-[12px] font-bold text-[#EB5053]">{winner.rating}</span>
            </div>
            <span className="text-[12px] font-semibold text-[#4A4A4A] bg-[#F5F5F5] rounded-full px-2.5 py-1">
              📍 {winner.distance}
            </span>
            <span className="text-[12px] font-semibold text-[#4A4A4A] bg-[#F5F5F5] rounded-full px-2.5 py-1">
              {'₩'.repeat(winner.priceRange)}
            </span>
            <span className="text-[12px] font-semibold text-white rounded-full px-2.5 py-1" style={{ background: '#EB5053' }}>
              {winner.category}
            </span>
          </div>

          {/* Address */}
          <div className="flex items-start gap-1.5">
            <MapPin size={14} className="text-[#9B9B9B] mt-0.5 flex-shrink-0" />
            <p className="text-[13px] text-[#4A4A4A]">{winner.address}</p>
          </div>

          {/* Tags */}
          <div className="flex gap-1.5 flex-wrap">
            {winner.tags.map(tag => (
              <span key={tag} className="tag tag-hash">#{tag}</span>
            ))}
          </div>

          {/* Description */}
          <p className="text-[13px] text-[#4A4A4A] leading-relaxed">{winner.description}</p>

          {/* Menu Photos */}
          <div>
            <p className="text-[12px] font-bold text-[#9B9B9B] mb-2">메뉴 사진</p>
            <div className="grid grid-cols-4 gap-2">
              {foodPhotos.map((url, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-[#F5F5F5]">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => toast.info('예약 기능은 준비 중이에요 🙏')}
              className="flex-1 py-3 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-1.5 border border-[#E5E5E5] text-[#4A4A4A] active:scale-[0.98] transition-all"
            >
              <Phone size={15} /> 예약하기
            </button>
            <button
              onClick={() => navigate(`/lunchie/map?id=${winner.id}`)}
              className="flex-1 py-3 rounded-2xl font-bold text-white text-[14px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              style={{ background: '#EB5053' }}
            >
              <Navigation size={15} /> 길찾기
            </button>
          </div>

          {/* Share Card Button */}
          <button
            onClick={() => setShowShare(true)}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg"
            style={{ background: 'linear-gradient(135deg, #F09D09 0%, #EB5053 100%)' }}
          >
            <Share2 size={16} /> 공유 카드 만들기
          </button>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="px-5 mt-3 flex gap-2">
        <button
          onClick={handleCopyAddress}
          className="flex-1 py-3 rounded-2xl font-bold text-[13px] flex items-center justify-center gap-1.5 bg-white border border-[#E5E5E5] text-[#4A4A4A] active:scale-[0.98] transition-all"
        >
          <Link2 size={14} /> 주소 복사
        </button>
        <button
          onClick={() => { onReset(); navigate('/'); }}
          className="flex-1 py-3 rounded-2xl font-bold text-[13px] flex items-center justify-center gap-1.5 bg-white border border-[#E5E5E5] text-[#4A4A4A] active:scale-[0.98] transition-all"
        >
          <Home size={14} /> 홈으로
        </button>
      </div>

      {/* Share Overlay */}
      <AnimatePresence>
        {showShare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#1A1A1A]/90 backdrop-blur-sm flex flex-col items-center justify-center px-6 py-10 overflow-y-auto"
          >
            <WinnerShareCard ref={shareCardRef} restaurant={winner} />

            <div className="flex gap-3 mt-6 w-full max-w-[300px]">
              <button
                onClick={handleSaveImage}
                disabled={isCapturing}
                className="flex-1 py-3.5 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-1.5 bg-white/10 text-white active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Download size={16} /> 저장
              </button>
              <button
                onClick={handleShareImage}
                disabled={isCapturing}
                className="flex-1 py-3.5 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-1.5 text-white active:scale-[0.98] transition-all disabled:opacity-50"
                style={{ background: '#EB5053' }}
              >
                <Share2 size={16} /> 이미지 공유하기
              </button>
            </div>

            <button
              onClick={() => setShowShare(false)}
              className="mt-5 text-white/60 text-[13px] font-semibold active:scale-95"
            >
              닫기
            </button>
          </motion.div>
        )}
      </AnimatePresence>
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
  onContinue: (winner?: any) => void;
}) {
  const [selected, setSelected] = useState<1 | 2 | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-dvh flex flex-col bg-[#1A1A1A]"
    >
      {/* Header */}
      <div className="px-5 pt-12 pb-4 text-center">
        <p className="font-black text-white text-[22px]">결승전 🏆</p>
        <p className="text-white/50 text-[13px] mt-1">모두의 투표로 결정된 최후의 2곳 · 마음에 드는 곳을 골라보세요</p>
      </div>

      {/* Diagonal split layout */}
      <div className="flex-1 relative overflow-hidden">
        {/* Finalist 1 — top-left triangle */}
        <button
          onClick={() => setSelected(1)}
          className="absolute inset-0 text-left"
          style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
        >
          <img src={finalist1.image} alt={finalist1.name} className="w-full h-full object-cover" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/45 to-black/70" />
          {selected !== null && (
            <div
              className="absolute inset-0 transition-opacity"
              style={{ background: selected === 1 ? 'transparent' : 'rgba(0,0,0,0.55)' }}
            />
          )}
          {selected === 1 && (
            <div className="absolute inset-0 ring-4 ring-inset" style={{ boxShadow: 'inset 0 0 0 4px #F09D09' }} />
          )}
          <div className="absolute top-6 left-5 right-20 text-left">
            <span className="inline-block bg-[#FFD700] text-[#1A1A1A] text-[11px] font-black px-3 py-1 rounded-full mb-2">
              🏆 1위 후보
            </span>
            {selected === 1 && (
              <span className="inline-block bg-[#F09D09] text-white text-[11px] font-black px-3 py-1 rounded-full mb-2 ml-1.5">
                ✓ 선택됨
              </span>
            )}
            <p className="text-white font-black text-[19px] leading-tight">{finalist1.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Star size={12} fill="#FFD700" color="#FFD700" />
              <span className="text-white/85 text-[12px]">{finalist1.rating}</span>
              <span className="text-white/60 text-[11px]">{finalist1.distance}</span>
            </div>
          </div>
        </button>

        {/* Finalist 2 — bottom-right triangle */}
        <button
          onClick={() => setSelected(2)}
          className="absolute inset-0 text-right"
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: selected === 1 ? 0.4 : selected === 2 ? 1 : 0.55 }}
        >
          <img src={finalist2.image} alt={finalist2.name} className="w-full h-full object-cover" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/45 to-black/30" />
          {selected === 2 && (
            <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 0 4px #F09D09' }} />
          )}
          <div className="absolute bottom-6 right-5 left-20 text-right">
            <span className="inline-block bg-white/20 text-white text-[11px] font-black px-3 py-1 rounded-full mb-2">
              2위 후보
            </span>
            {selected === 2 && (
              <span className="inline-block bg-[#F09D09] text-white text-[11px] font-black px-3 py-1 rounded-full mb-2 mr-1.5">
                ✓ 선택됨
              </span>
            )}
            <p className="text-white font-black text-[19px] leading-tight">{finalist2.name}</p>
            <div className="flex items-center gap-2 mt-1 justify-end">
              <Star size={12} fill="#FFD700" color="#FFD700" />
              <span className="text-white/85 text-[12px]">{finalist2.rating}</span>
              <span className="text-white/60 text-[11px]">{finalist2.distance}</span>
            </div>
          </div>
        </button>

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
          onClick={() => onContinue(selected === 1 ? finalist1 : selected === 2 ? finalist2 : undefined)}
          disabled={selected === null}
          className="w-full py-4 rounded-2xl font-bold text-white text-[15px] active:scale-[0.98] shadow-xl transition-opacity disabled:opacity-40"
          style={{ background: '#F09D09' }}
        >
          {selected === null ? '음식점을 선택해주세요 👆' : '이 곳으로 결정! 🎉'}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Decided Screen ───────────────────────────────────────────────────────────

function WaitingOrDecidedScreen({ onContinue }: { onContinue: (winner?: any) => void }) {
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
              결과 확인하기 🎉
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
  const [selectedWinner, setSelectedWinner] = useState<Restaurant | null>(null);
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
      const t = setTimeout(() => setShowIntro(false), 2800);
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
    return <WaitingOrDecidedScreen onContinue={(winner) => { if (winner) setSelectedWinner(winner); setPhase('results'); }} />;
  }
  if (phase === 'results') {
    return <WinnerScreen selectedWinner={selectedWinner} onReset={() => { setCurrentIndex(0); setSwipeData([]); setSelectedWinner(null); }} />;
  }

  // Countdown formatting for header badge
  const totalSec = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  const urgent = remainingMs > 0 && remainingMs <= 30000;

  return (
    <div className="min-h-dvh bg-[#FCF4EE] relative">
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
            <div className="flex flex-col items-center">
              <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center overflow-hidden mb-3">
                <img
                  src="/Logo 004.png"
                  alt="Lunchie Munchie Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <p className="font-black text-white text-[22px]">예선전 시작! 🍽️</p>
            </div>
            <p className="text-white/60 text-[14px] mt-2">카드를 좌우로 스와이프 해보세요</p>

            {/* Swipe gesture demo card */}
            <div className="relative w-36 h-48 mt-8 flex items-center justify-center">
              <motion.div
                className="absolute w-32 h-44 rounded-2xl shadow-2xl flex items-center justify-center text-6xl overflow-hidden"
                style={{ background: '#FFF1E0' }}
                animate={{
                  x: [0, -90, -90, 0, 90, 90, 0],
                  rotate: [0, -16, -16, 0, 16, 16, 0],
                }}
                transition={{ duration: 2.6, times: [0, 0.2, 0.32, 0.5, 0.7, 0.82, 1], repeat: Infinity, ease: 'easeInOut' }}
              >
                🍱
                <motion.div
                  className="absolute top-4 right-4 border-[3px] rounded-lg px-2 py-0.5 font-black text-[13px]"
                  style={{ borderColor: '#EB5053', color: '#EB5053', transform: 'rotate(15deg)' }}
                  animate={{ opacity: [0, 0, 1, 1, 0, 0] }}
                  transition={{ duration: 2.6, times: [0, 0.15, 0.18, 0.34, 0.37, 1], repeat: Infinity, ease: 'easeInOut' }}
                >
                  NOPE
                </motion.div>
                <motion.div
                  className="absolute top-4 left-4 border-[3px] rounded-lg px-2 py-0.5 font-black text-[13px]"
                  style={{ borderColor: '#3CBA44', color: '#3CBA44', transform: 'rotate(-15deg)' }}
                  animate={{ opacity: [0, 0, 1, 1, 0, 0] }}
                  transition={{ duration: 2.6, times: [0, 0.65, 0.68, 0.84, 0.87, 1], repeat: Infinity, ease: 'easeInOut' }}
                >
                  LIKE
                </motion.div>
              </motion.div>
            </div>

            <div className="flex gap-8 mt-8">
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                  <X size={24} color="#EB5053" strokeWidth={2.5} />
                </div>
                <span className="text-white/70 text-[12px]">← 싫어요</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#EB5053' }}>
                  <Heart size={24} color="white" fill="white" />
                </div>
                <span className="text-white/70 text-[12px]">좋아요 →</span>
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
