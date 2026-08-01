/**
 * Lunchie Munchie — Onboarding / Splash Page
 * Design: Soft Coral (Option 8)
 * Layout: Logo + Isometric Illustration + CTA
 */

import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { LunchieLogo } from '@/components/brand/LunchieLogo';
import { BRAND } from '@/constants/brand';

export default function OnboardingPage() {
  const [, navigate] = useLocation();

  const handleStart = () => {
    localStorage.setItem('lm_onboarded', 'true');
    navigate('/');
  };

  return (
    <div className="min-h-dvh flex flex-col bg-white px-5">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="pt-14"
      >
        <LunchieLogo size={44} showWordmark wordmarkClassName="text-xl" />
      </motion.div>

      {/* Hero Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-8"
      >
        <h1 className="text-[28px] font-bold leading-tight text-[#1A1A1A]">
          오늘 뭐 먹지?
        </h1>
        <h1 className="text-[28px] font-bold leading-tight" style={{ color: BRAND.primary }}>
          점심 메뉴 추천
        </h1>
        <p className="mt-3 text-[13px] text-[#4A4A4A] leading-relaxed">
          취향과 상황에 딱 맞는<br />점심을 추천해드릴게요!
        </p>
      </motion.div>

      {/* Illustration */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex-1 flex items-center justify-center py-8"
      >
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663322273601/2bdpbPnYmCuK9PccZ3SWKc/lm-onboarding-illust-APpgW27LYGE3VurkLbotm7.webp"
          alt="Lunchie Munchie Illustration"
          className="w-72 h-72 object-contain"
        />
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="pb-12 space-y-3"
      >
        <button
          onClick={handleStart}
          className="lm-btn-primary w-full flex items-center justify-center font-semibold text-[15px]"
        >
          추천 받기 시작하기
        </button>
        <button
          onClick={handleStart}
          className="lm-btn-outline w-full flex items-center justify-center font-semibold text-[15px]"
        >
          로그인 · 회원가입
        </button>
      </motion.div>
    </div>
  );
}
