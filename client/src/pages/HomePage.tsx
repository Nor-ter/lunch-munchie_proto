/**
 * Lunchie Munchie — Home Page
 * Design: Soft Coral (Option 8) + Pubfish Reference
 * Two modes: Quick Match / Tour Mode
 */

import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { MapPin } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 24 } },
};

export default function HomePage() {
  const [, navigate] = useLocation();
  const { profile } = useApp();

  return (
    <motion.div
      className="min-h-dvh bg-white"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="px-5 pt-12 pb-2">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#EB5053' }}>
            <span className="text-white text-[16px]">🍱</span>
          </div>
          <span className="font-black text-[18px]" style={{ color: '#EB5053' }}>Lunchie Munchie</span>
        </div>

        <h1 className="font-bold text-[26px] text-[#1A1A1A] leading-tight">
          오늘 어떻게<br />먹을까요?
        </h1>
        <p className="text-[13px] text-[#9B9B9B] mt-1">모드를 선택해주세요</p>
      </motion.div>

      {/* Mode Cards */}
      <motion.div variants={fadeUp} className="px-5 mt-6 space-y-4">

        {/* Quick Match Card */}
        <motion.button
          onClick={() => navigate('/quick-match')}
          className="w-full rounded-3xl overflow-hidden text-left active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(135deg, #EB5053 0%, #C0392B 100%)' }}
          whileTap={{ scale: 0.97 }}
        >
          <div className="p-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <span className="text-[20px]">⚡</span>
              </div>
              {/* Decorative food icons */}
              <div className="flex gap-1 opacity-60">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[14px]">🥩</div>
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[14px]">🍜</div>
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[14px]">🍣</div>
              </div>
            </div>
            <p className="text-white font-black text-[20px] leading-tight">Quick Match</p>
            <p className="text-white/80 text-[12px] mt-1 leading-relaxed">
              그룹 멤버들과 함께 음식 카드를<br />스와이프로 빠르게 메뉴를 결정해요
            </p>
            {/* Action icons */}
            <div className="flex gap-2 mt-3">
              <div className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-1">
                <span className="text-[14px]">✕</span>
                <span className="text-[14px]">△</span>
                <span className="text-[14px]">○</span>
              </div>
              <div className="bg-white/20 rounded-full px-2.5 py-1">
                <span className="text-white text-[11px] font-semibold">싫어요 · 그냥봄 · 좋아요</span>
              </div>
            </div>
          </div>
        </motion.button>

        {/* Tour Mode Card */}
        <motion.button
          onClick={() => navigate('/tour-mode')}
          className="w-full rounded-3xl overflow-hidden text-left active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)' }}
          whileTap={{ scale: 0.97 }}
        >
          <div className="p-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <span className="text-[20px]">🗺️</span>
              </div>
              {/* Tag pills */}
              <div className="flex gap-1 flex-wrap justify-end max-w-[160px]">
                {['카페', '바 코스', '데이트'].map(t => (
                  <span key={t} className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>
            <p className="text-white font-black text-[20px] leading-tight">Tour Mode</p>
            <p className="text-white/80 text-[12px] mt-1 leading-relaxed">
              맞춤형 코스를 추천받고<br />친구들과 투어를 즐겨요
            </p>
            {/* Location */}
            <div className="flex items-center gap-1 mt-3">
              <MapPin size={11} color="rgba(255,255,255,0.6)" />
              <span className="text-white/60 text-[11px]">현재 위치 기반 · Melbourne VIC</span>
            </div>
          </div>
        </motion.button>
      </motion.div>

      {/* Bottom hint */}
      <motion.p
        variants={fadeUp}
        className="text-center text-[11px] text-[#9B9B9B] mt-6 px-5"
      >
        밥은 먹어야 하니까 · Melbourne VIC
      </motion.p>
    </motion.div>
  );
}
