/**
 * Lunchie Munchie — Session Lobby Page
 * Design: Soft Coral (Option 8)
 * Features: QR code invite, member list, start voting
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { ArrowLeft, Copy, Share2, Play, QrCode, Users, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

export default function SessionLobbyPage() {
  const [, navigate] = useLocation();
  const { currentSession, setCurrentSession, fetchSession, profile, toggleReady, startSession } = useApp();
  const [showQR, setShowQR] = useState(true);
  const [showMembers, setShowMembers] = useState(true);

  // Auto-navigate when session status shifts from waiting to active voting
  useEffect(() => {
    if (currentSession && currentSession.status !== 'waiting') {
      navigate('/lunchie/swipe');
    }
  }, [currentSession?.status, navigate]);

  if (!currentSession) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5">
        <div className="text-center">
          <p className="font-bold text-[16px] text-[#1A1A1A] mb-4">진행 중인 세션이 없어요</p>
          <button onClick={() => navigate('/lunchie/settings')} className="lm-btn-primary px-6 flex items-center justify-center">
            세션 만들기
          </button>
        </div>
      </div>
    );
  }

  const inviteUrl = `${window.location.origin}/join/${currentSession.inviteCode}`;

  useEffect(() => {
    if (!currentSession) return;
    const interval = setInterval(() => {
      fetchSession(currentSession.inviteCode).catch(console.error);
    }, 3000);
    return () => clearInterval(interval);
  }, [currentSession?.inviteCode, fetchSession]);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => toast.success('링크 복사됨! 📋'));
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: `Lunchie Munchie — ${currentSession.name}`, url: inviteUrl });
    } else handleCopy();
  };

  const handleStart = async () => {
    try {
      await startSession(currentSession.inviteCode);
      navigate('/lunchie/swipe');
    } catch (e) {
      console.error(e);
      toast.error('투표를 시작하지 못했습니다.');
    }
  };

  return (
    <div className="min-h-dvh bg-[#FCF4EE] px-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 pt-12 pb-5">
        <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center active:scale-95">
          <ArrowLeft size={18} color="#1A1A1A" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-[20px] text-[#1A1A1A] truncate">{currentSession.name}</h1>
          <p className="text-[12px] text-[#9B9B9B]">대기 중 · {currentSession.members.length}명 참여</p>
        </div>
        <div className="px-3 py-1.5 rounded-full text-[11px] font-bold text-[#3CBA44] bg-[#3CBA44]/10">
          LIVE
        </div>
      </div>

      {/* Invite Code */}
      <div className="bg-[#FFF5F5] rounded-2xl p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-[#9B9B9B] mb-1">초대 코드</p>
          <p className="font-black text-[24px] text-[#EB5053] tracking-widest">{currentSession.inviteCode}</p>
        </div>
        <button onClick={handleCopy} className="w-10 h-10 rounded-xl bg-[#EB5053] flex items-center justify-center active:scale-95">
          <Copy size={16} color="white" />
        </button>
      </div>

      {/* QR Code */}
      <div className="lm-card p-4 mb-4">
        <button onClick={() => setShowQR(!showQR)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode size={17} color="#EB5053" />
            <p className="font-semibold text-[14px] text-[#1A1A1A]">QR 코드로 초대하기</p>
          </div>
          {showQR ? <ChevronUp size={16} color="#9B9B9B" /> : <ChevronDown size={16} color="#9B9B9B" />}
        </button>

        <AnimatePresence>
          {showQR && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-md">
                  <QRCodeSVG value={inviteUrl} size={160} fgColor="#EB5053" level="M" />
                </div>
                <div className="flex gap-3 w-full">
                  <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#F5F5F5] rounded-xl text-[13px] font-semibold text-[#1A1A1A] active:scale-95">
                    <Copy size={15} /> 링크 복사
                  </button>
                  <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#F5F5F5] rounded-xl text-[13px] font-semibold text-[#1A1A1A] active:scale-95">
                    <Share2 size={15} /> 공유하기
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Members */}
      <div className="lm-card p-4 mb-4">
        <button onClick={() => setShowMembers(!showMembers)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={17} color="#EB5053" />
            <p className="font-semibold text-[14px] text-[#1A1A1A]">참여 멤버 ({currentSession.members.length}명)</p>
          </div>
          {showMembers ? <ChevronUp size={16} color="#9B9B9B" /> : <ChevronDown size={16} color="#9B9B9B" />}
        </button>

        <AnimatePresence>
          {showMembers && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2">
                {currentSession.members.map((member, i) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-[#F5F5F5] rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
                      {member.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[13px] text-[#1A1A1A] truncate">
                        {member.name}
                        {i === 0 && <span className="ml-2 text-[#D94447] text-[11px]">👑 호스트</span>}
                      </p>
                    </div>
                    {member.ready ? (
                      <CheckCircle size={16} color="#3CBA44" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-[#E5E5E5]" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Session Info */}
      <div className="lm-card p-4 mb-6">
        <p className="font-semibold text-[14px] text-[#1A1A1A] mb-3">세션 설정</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['인원수', `${currentSession.filters.partySize}명`],
            ['예산', '₩'.repeat(currentSession.filters.budget)],
            ['반경', currentSession.filters.radius >= 1000 ? `${currentSession.filters.radius / 1000}km` : `${currentSession.filters.radius}m`],
            ['식당 수', `${currentSession.restaurants.length}개`],
          ].map(([k, v]) => (
            <div key={k} className="bg-[#F5F5F5] rounded-xl p-3">
              <p className="text-[11px] text-[#9B9B9B]">{k}</p>
              <p className="font-bold text-[15px] text-[#1A1A1A]">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Start Button */}
      <motion.button
        onClick={handleStart}
        className="w-full lm-btn-primary flex items-center justify-center gap-3 text-[16px]"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
      >
        <Play size={20} fill="white" />
        투표 시작하기!
      </motion.button>
    </div>
  );
}
