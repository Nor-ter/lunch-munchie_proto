import { englishText } from '@shared/englishCopy';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { ChevronDown, Loader2, Shield, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { DIETARY_REQUIREMENTS, INGREDIENT_AVOIDANCES, normalizeDietaryPreferences } from '@/lib/quickMatch';
import { startGoogleAuth } from '@/services/authApi';
import BackButton from '@/components/ui/BackButton';
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
  const [dietaryOpen, setDietaryOpen] = useState(false);
  const selectedDietaryOptions = DIETARY_OPTIONS.filter(option => dietary.includes(option.value));

  useEffect(() => {
    if (!isLoggedIn || name) return;
    const accountName = !["Jimin", "User", 'User'].includes(profile.name)
      ? profile.name
      : auth.data?.name;
    if (accountName) setName(accountName);
  }, [auth.data?.name, isLoggedIn, name, profile.name]);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid invite code.");
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
        toast.error("This session is invalid or has expired.");
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
      toast.error("Please enter a nickname!");
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
      toast.success(`"${session.name}" joined! 🎉`);
      navigate('/session/lobby');
    } catch (e) {
      console.error('빠른 매칭 세션 참가 실패', e);
      toast.error("Couldn't join the session. Check the invite link and try again.");
    } finally {
      setIsJoining(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-dvh bg-[#FCFCFC] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#EB5053] mb-4" />
        <p className="text-[#1A1A1A] font-semibold">Checking your invitation…</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#FCFCFC] flex flex-col px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BackButton onClick={() => navigate('/lunchie/settings')} aria-label="Back to Quick Match" />
        <div>
          <h1 className="font-bold text-[18px] text-[#1A1A1A]">Join a Lunch Session</h1>
          <p className="text-[12px] text-[#9B9B9B]">Choose a restaurant with your friends</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-5 space-y-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-5 shadow-sm border border-black/5 space-y-5"
        >
          <div className="text-center mb-2">
            <span className="text-[11px] font-bold text-[#EB5053] bg-[#FFF5F5] px-2.5 py-1 rounded-full tracking-wider">Invitation</span>
            <h2 className="font-bold text-[20px] text-[#1A1A1A] mt-2 leading-tight">
              "{englishText(sessionName)}"
            </h2>
            <p className="text-[13px] text-[#9B9B9B] mt-1">You're invited!</p>
          </div>

          {/* Emoji Avatar Selector */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FFF5F5] flex items-center justify-center text-3xl shadow-md border-2 border-[#EB5053]/10 relative mb-3">
              {englishText(selectedEmoji)}
            </div>

            <p className="text-[11px] text-[#9B9B9B] mb-2.5">Choose Your Character</p>
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
                  {englishText(e)}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[13px] text-[#4A4A4A] block">Your Nickname</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Foodie Alex"
              maxLength={15}
              className="w-full h-11 bg-[#F5F5F5] rounded-xl px-4 text-[14px] text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#EB5053]/30 transition-all font-semibold"
            />
          </div>

          <section className="rounded-2xl border border-[#F1E4DE] bg-[#FFFDFC] p-4">
            <button
              type="button"
              onClick={() => setDietaryOpen(open => !open)}
              className="flex w-full items-center gap-3 text-left"
              aria-expanded={dietaryOpen}
              aria-controls="join-dietary-options"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF1F1] text-[#EB5053]">
                <Shield size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-black text-[#1A1A1A]">Dietary Restrictions</p>
                  <span className="rounded-full bg-[#F5F1EE] px-2 py-0.5 text-[10px] font-black text-[#9B857A]">Optional</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-[#9B9B9B]">
                  {englishText(selectedDietaryOptions.length
                    ? `${selectedDietaryOptions.length} selected ·  ${selectedDietaryOptions.map(option => option.label).join(', ')}`
                    : "No dietary restrictions selected")}
                </p>
              </div>
              <ChevronDown className={`shrink-0 text-[#9B9B9B] transition-transform ${dietaryOpen ? 'rotate-180' : ''}`} size={18} />
            </button>

            {dietaryOpen && (
              <div id="join-dietary-options" className="mt-4 flex flex-wrap gap-1.5 border-t border-[#F4E8E2] pt-4">
                {DIETARY_OPTIONS.map(option => {
                  const isSelected = dietary.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleDietary(option.value)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all active:scale-95 ${
                        isSelected ? 'text-white' : 'bg-[#F5F5F5] text-[#4A4A4A]'
                      }`}
                      style={isSelected ? { background: '#EB5053' } : {}}
                    >
                      {englishText(option.label)}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-[#9B9B9B]">

              Filters use menu information. For severe allergies, confirm ingredients and cross-contamination risks with the restaurant.
            </p>
          </section>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-black/5 bg-white/75 p-3"
        >
          {isLoggedIn ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[#4A4A4A]">Signed In</p>
                <p className="truncate text-[10px] text-[#9B9B9B]">Your saved preferences are applied</p>
              </div>
              <button
                onClick={handleLogout}
                className="shrink-0 rounded-full bg-[#F5F5F5] px-3 py-1.5 text-[11px] font-semibold text-[#9B9B9B] active:scale-95"
              >

                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <LogIn size={14} className="shrink-0 text-[#EB5053]" />
                <p className="truncate text-[11px] font-semibold text-[#8C7A72]">Sign in to load your saved preferences</p>
              </div>
              <button
                onClick={handleLogin}
                className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#EB5053] active:scale-95"
              >

                Sign In
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Action Button */}
      <div className="sticky bottom-[calc(16px+env(safe-area-inset-bottom))] space-y-3 pt-2">
        <button
          onClick={handleJoin}
          disabled={isJoining}
          className="w-full lm-btn-primary flex items-center justify-center font-semibold text-[15px] shadow-lg shadow-[#EB5053]/20"
        >
          {englishText(isJoining ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />

              Joining…
            </>
          ) : (
            "Join Session"
          ))}
        </button>
      </div>
    </div>
  );
}
