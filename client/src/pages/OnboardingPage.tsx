/**
 * Lunchie Munchie — Onboarding / Splash Page
 * Design: Soft Coral (Option 8)
 * Layout: Logo + Isometric Illustration + CTA
 */

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { LunchieLogo } from '@/components/brand/LunchieLogo';
import { BRAND } from '@/constants/brand';
import { useApp } from '@/contexts/AppContext';
import { logOnboardingCompleted } from '@/lib/eventLogger';
import { startGoogleAuth } from '@/services/authApi';

const DIETARY_OPTIONS = ['비건', '채식', '글루텐프리', '할랄', '해산물 제외'];

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const { profile, updateProfile } = useApp();
  const [dietary, setDietary] = useState<string[]>(profile.dietary ?? []);

  const handleStart = () => {
    // 가입에서 수집하는 값은 안전 제약뿐이다. 맛 취향은 실제 탐색/선택으로 학습한다.
    updateProfile({ dietary });
    logOnboardingCompleted(dietary);
    localStorage.setItem('lm_onboarded', 'true');
    navigate('/');
  };

  const handleLogin = () => {
    // 로그인 전에도 선택한 안전 제약은 보존한다. OAuth 복귀 뒤에는 Google의
    // 고유 uid가 프로필·추천 상태의 기준이 된다.
    updateProfile({ dietary });
    localStorage.setItem('lm_onboarded', 'true');
    startGoogleAuth('/');
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

          Where shall we eat?
        </h1>
        <h1 className="text-[28px] font-bold leading-tight" style={{ color: BRAND.primary }}>

          Find your next lunch
        </h1>
        <p className="mt-3 text-[13px] text-[#4A4A4A] leading-relaxed">

          Find a place that suits<br />your taste and your day.
        </p>
        <div className="mt-5 rounded-2xl bg-[#FFF6F3] p-3">
          <p className="text-[12px] font-bold text-[#3D302C]">Any dietary needs? <span className="font-normal text-[#7D6D67]">You can change these later</span></p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DIETARY_OPTIONS.map(option => {
              const selected = dietary.includes(option);
              return <button key={option} type="button" onClick={() => setDietary(values => selected ? values.filter(value => value !== option) : [...values, option])} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${selected ? 'bg-[#EB5053] text-white' : 'bg-white text-[#65524B]'}`}>{option}</button>;
            })}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-[#8A7770]">We only use your location when you ask for recommendations. It isn't saved at sign-up.</p>
        </div>
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

          Get started
        </button>
        <button
          onClick={handleLogin}
          className="lm-btn-outline w-full flex items-center justify-center font-semibold text-[15px]"
        >

          Log in or sign up
        </button>
      </motion.div>
    </div>
  );
}
