import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Shield, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { DIETARY_REQUIREMENTS, INGREDIENT_AVOIDANCES, normalizeDietaryPreferences } from '@/lib/quickMatch';
import { startGoogleAuth } from '@/services/authApi';
import { SUPPORTED_LUNCHIE_SESSION_AVATARS } from '@shared/lunchieAvatar';

const EMOJIS = SUPPORTED_LUNCHIE_SESSION_AVATARS;
const DIETARY_OPTIONS = [...DIETARY_REQUIREMENTS, ...INGREDIENT_AVOIDANCES];

export default function SessionJoinPage() {
  const [, navigate] = useLocation();
  const { token } = useParams<{ token: string }>();
  const { joinSession, fetchSession, profile, updateProfile } = useApp();
  const auth = useAuthStatus();
  
  const [sessionName, setSessionName] = useState<string>('');
  const [loadingSession, setLoadingSession] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  
  // Profile settings state
  // An invitation must never inherit the prototype's old "지민" identity.
  // Anonymous guests choose their own session-only name; signed-in members use
  // their account name as a convenient, editable starting point.
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(profile.emoji || '🙂');
  const [dietary, setDietary] = useState<string[]>(() => normalizeDietaryPreferences(profile.dietary));
  const isLoggedIn = Boolean(auth.data && !auth.data.isAnonymous);

  useEffect(() => {
    if (!isLoggedIn || name) return;
    const accountName = profile.name !== '지민' && profile.name !== '사용자'
      ? profile.name
      : auth.data?.name;
    if (accountName) setName(accountName);
  }, [auth.data?.name, isLoggedIn, name, profile.name]);

  useEffect(() => {
    if (!token) {
      toast.error('유효하지 않은 초대 코드입니다.');
      navigate('/');
      return;
    }

    // Pre-fetch session information to show the room name
    fetchSession(token)
      .then((session) => {
        setSessionName(session.name);
        setLoadingSession(false);
      })
      .catch((e) => {
        toast.error('유효하지 않은 세션이거나 만료되었습니다.');
        navigate('/');
      });
  }, [token, fetchSession, navigate]);

  const handleLogin = () => {
    startGoogleAuth(`/join/${token ?? ''}`);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.reload();
  };

  const toggleDietary = (item: string) => {
    setDietary(prev => 
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      toast.error('닉네임을 입력해주세요!');
      return;
    }

    setIsJoining(true);
    try {
      // 1. Update client profile with chosen name, emoji, dietary, and login status
      updateProfile({ 
        name: name.trim(), 
        emoji: selectedEmoji, 
        dietary: dietary,
        isLoggedIn,
      });
      
      // 2. Join the session via API
      const session = await joinSession(token, name.trim(), selectedEmoji);
      toast.success(`"${session.name}" 세션에 참가했습니다! 🎉`);
      navigate('/session/lobby');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '세션 참가에 실패했습니다.');
    } finally {
      setIsJoining(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-dvh bg-white flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#EB5053] mb-4" />
        <p className="text-[#1A1A1A] font-semibold">초대 정보를 확인하는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#FCF4EE] flex flex-col justify-between px-5 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 pt-4">
        <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full bg-white flex items-center justify-center active:scale-95 shadow-sm">
          <ArrowLeft size={18} color="#1A1A1A" />
        </button>
        <div>
          <h1 className="font-bold text-[18px] text-[#1A1A1A]">점심 세션 참여하기</h1>
          <p className="text-[12px] text-[#9B9B9B]">친구들과 맛집 결정을 함께해요</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center py-6 space-y-4">
        {/* Login Banner */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 flex items-center justify-between"
        >
          {isLoggedIn ? (
            <>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#3CBA44]/10 flex items-center justify-center text-[14px]">
                  ✅
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#1A1A1A]">회원 로그인 완료</p>
                  <p className="text-[11px] text-[#9B9B9B]">취향 데이터 연동 중</p>
                </div>
              </div>
              <button 
                onClick={handleLogout} 
                className="text-[12px] font-semibold text-[#9B9B9B] hover:text-[#1A1A1A] px-3 py-1.5 rounded-lg bg-[#F5F5F5] active:scale-95 transition-all"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#EB5053]/10 flex items-center justify-center">
                  <LogIn size={15} color="#EB5053" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#1A1A1A]">이미 계정이 있으신가요?</p>
                  <p className="text-[11px] text-[#9B9B9B]">로그인하면 취향을 바로 연동해요</p>
                </div>
              </div>
              <button 
                onClick={handleLogin} 
                className="text-[12px] font-bold text-white px-3.5 py-1.5 rounded-lg bg-[#EB5053] hover:bg-[#C0392B] active:scale-95 transition-all shadow-sm shadow-[#EB5053]/10"
              >
                로그인하기
              </button>
            </>
          )}
        </motion.div>

        {/* Setup Form Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-black/5 space-y-6"
        >
          <div className="text-center mb-2">
            <span className="text-[11px] font-bold text-[#EB5053] bg-[#FFF5F5] px-2.5 py-1 rounded-full uppercase tracking-wider">INVITATION</span>
            <h2 className="font-bold text-[20px] text-[#1A1A1A] mt-2 leading-tight">
              "{sessionName}"
            </h2>
            <p className="text-[13px] text-[#9B9B9B] mt-1">세션에 초대되었습니다!</p>
          </div>

          {/* Emoji Avatar Selector */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FFF5F5] flex items-center justify-center text-3xl shadow-md border-2 border-[#EB5053]/10 relative mb-3">
              {selectedEmoji}
            </div>
            
            <p className="text-[11px] text-[#9B9B9B] mb-2.5">내 캐릭터 선택</p>
            <div className="grid grid-cols-8 gap-1.5 w-full justify-center">
              {EMOJIS.slice(0, 16).map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setSelectedEmoji(e)}
                  className={`text-lg p-1 rounded-lg transition-all ${
                    selectedEmoji === e 
                      ? 'bg-[#FFF5F5] ring-2 ring-[#EB5053] scale-110' 
                      : 'bg-[#F5F5F5] hover:bg-[#EAEAEA]'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[13px] text-[#4A4A4A] block">사용할 닉네임</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: 맛잘알 길동이"
              maxLength={15}
              className="w-full h-11 bg-[#F5F5F5] rounded-xl px-4 text-[14px] text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#EB5053]/30 transition-all font-semibold"
            />
          </div>

          {/* Dietary Restrictions Selector */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Shield size={14} color="#EB5053" />
              <label className="font-semibold text-[13px] text-[#1A1A1A]">식단 제약 사항</label>
            </div>
            <p className="text-[11px] text-[#9B9B9B]">해당하는 제한 사항이 있다면 선택해주세요 (중복 선택 가능)</p>
            <div className="flex flex-wrap gap-1.5">
              {DIETARY_OPTIONS.map(option => {
                const isSelected = dietary.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleDietary(option.value)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95 ${
                      isSelected ? 'text-white' : 'bg-[#F5F5F5] text-[#4A4A4A]'
                    }`}
                    style={isSelected ? { background: '#EB5053' } : {}}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] leading-relaxed text-[#9B9B9B]">
              메뉴 정보를 기준으로 필터링합니다. 심한 알레르기는 매장에 재료와 교차오염 여부를 꼭 확인해주세요.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Action Button */}
      <div className="space-y-3">
        <button
          onClick={handleJoin}
          disabled={isJoining}
          className="w-full lm-btn-primary flex items-center justify-center font-semibold text-[15px] shadow-lg shadow-[#EB5053]/20"
        >
          {isJoining ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              참가하는 중...
            </>
          ) : (
            isLoggedIn ? '🎉 세션 참가하기' : '🎉 비회원으로 세션 참가하기'
          )}
        </button>
      </div>
    </div>
  );
}
