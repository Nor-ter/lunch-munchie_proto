/**
 * Lunchie Munchie — Onboarding / Splash Page
 * Design: Soft Coral (Option 8)
 * Layout: Logo + Isometric Illustration + CTA
 */

import { motion } from 'framer-motion';
import { useLocation } from 'wouter';

export default function OnboardingPage() {
  const [, navigate] = useLocation();

  const handleStart = () => {
    localStorage.setItem('lm_onboarded', 'true');
    navigate('/');
  };

  return (
    <div className="min-h-dvh flex flex-col bg-white px-5">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="pt-14 flex items-center gap-2"
      >
        {/* App Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#EB5053' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 3C12 3 7 6 7 11C7 13.76 9.24 16 12 16C14.76 16 17 13.76 17 11C17 6 12 3 12 3Z" fill="white" opacity="0.9"/>
            <path d="M8 17H16L15 21H9L8 17Z" fill="white" opacity="0.7"/>
            <path d="M9 21H15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="12" cy="11" r="2" fill="#EB5053"/>
          </svg>
        </div>
        <div>
          <div className="font-black text-xl leading-none" style={{ color: '#EB5053' }}>Lunchie</div>
          <div className="font-black text-xl leading-none" style={{ color: '#EB5053' }}>Munchie</div>
        </div>
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
        <h1 className="text-[28px] font-bold leading-tight" style={{ color: '#EB5053' }}>
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
