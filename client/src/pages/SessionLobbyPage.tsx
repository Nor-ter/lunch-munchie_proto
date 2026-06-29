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
  const { currentSession, fetchSession, startSession, profile } = useApp();
  const [showQR, setShowQR] = useState(true);
  const [showMembers, setShowMembers] = useState(true);

  // Poll the server so newly joined members (and the start signal) show up.
  // NOTE: early return보다 위에 있어야 한다 — hooks는 조건부로 호출되면 안 됨.
  useEffect(() => {
    if (!currentSession?.inviteCode) return;
    const interval = setInterval(() => {
      fetchSession(currentSession.inviteCode).catch(console.error);
    }, 3000);
    return () => clearInterval(interval);
  }, [currentSession?.inviteCode, fetchSession]);

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

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => toast.success('링크 복사됨! 📋'));
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: `Lunchie Munchie — ${currentSession.name}`, url: inviteUrl });
    } else handleCopy();
  };

  const isHost = currentSession.hostId === profile.id;
  const isWaiting = currentSession.status === 'waiting';

  const handleStart = async () => {
    try {
      await startSession(currentSession.inviteCode, currentSession.deadlineMinutes);
      navigate('/lunchie/swipe');
    } catch (e) {
      console.error(e);
      toast.error('투표를 시작하지 못했습니다.');
    }
  };

  const handleJoinSwipe = () => {
    navigate('/lunchie/swipe');
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
          <p className="text-[12px] text-[#9B9B9B]">{isWaiting ? '대기 중' : '투표 진행 중'} · {currentSession.members.length}명 참여</p>
        </div>
        <div className="px-3 py-1.5 rounded-full text-[11px] font-bold text-[#3CBA44] bg-[#3CBA44]/10">
          LIVE
        </div>
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

        {/* initial={false} — 페이지 슬라이딩과 별개로 펼침 모션이 한 번 더 겹쳐 보이는 것을 막는다.
            (showQR가 기본 true라 마운트 시 펼침 애니메이션이 자동 재생되던 문제) */}
        <AnimatePresence initial={false}>
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

        <AnimatePresence initial={false}>
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

      {/* Start Button */}
      {isWaiting ? (
        isHost ? (
          <motion.button
            onClick={handleStart}
            className="w-full lm-btn-primary flex items-center justify-center gap-3 text-[16px]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Play size={20} fill="white" />
            투표 시작하기!
          </motion.button>
        ) : (
          <div className="w-full py-4 rounded-2xl bg-[#F5F5F5] text-center text-[13px] font-semibold text-[#9B9B9B]">
            호스트가 투표를 시작하길 기다리는 중...
          </div>
        )
      ) : (
        <motion.button
          onClick={handleJoinSwipe}
          className="w-full lm-btn-primary flex items-center justify-center gap-3 text-[16px]"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <Play size={20} fill="white" />
          스와이핑 시작하기!
        </motion.button>
      )}
    </div>
  );
}
