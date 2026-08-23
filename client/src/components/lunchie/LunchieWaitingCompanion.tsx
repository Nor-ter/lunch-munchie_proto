import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'wouter';
import LunchmateCharacterRenderer from '@/components/munchie/LunchmateCharacterRenderer';
import { useApp } from '@/contexts/AppContext';
import { lunchmateLoadoutFromProfile } from '@/utils/lunchmateProfile';

const STORAGE_KEY = 'lm_lunchie_waiting_companion_session';
const ACTIVATE_EVENT = 'lm:lunchie-waiting-companion';

type SessionPhase = 'PRELIM' | 'FINAL' | 'REROLL' | 'NO_CONSENSUS' | 'DONE';

interface CompanionResults {
  phase?: SessionPhase;
  deadlineAt: string | null;
  memberCompletion: Array<{ id: string; completed: boolean }>;
}

export function activateLunchieWaitingCompanion(sessionId: string): void {
  localStorage.setItem(STORAGE_KEY, sessionId);
  window.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: sessionId }));
}

function clearLunchieWaitingCompanion(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: null }));
}

function remainingLabel(deadlineAt: string | null, now: number): string {
  if (!deadlineAt) return '마감 전';
  const seconds = Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - now) / 1000));
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}분`;
}

export default function LunchieWaitingCompanion() {
  const [location, navigate] = useLocation();
  const { currentSession, profile } = useApp();
  const [activeSessionId, setActiveSessionId] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [results, setResults] = useState<CompanionResults | null>(null);
  const [now, setNow] = useState(Date.now());
  const [isHappy, setIsHappy] = useState(false);
  const [interactionCopy, setInteractionCopy] = useState<string | null>(null);
  const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failureCountRef = useRef(0);
  const loadout = useMemo(
    () => lunchmateLoadoutFromProfile(profile.lunchmateLoadout),
    [profile.lunchmateLoadout],
  );

  useEffect(() => {
    const syncActivation = (event?: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : undefined;
      setActiveSessionId(typeof detail === 'string' ? detail : localStorage.getItem(STORAGE_KEY));
    };
    window.addEventListener(ACTIVATE_EVENT, syncActivation);
    window.addEventListener('storage', syncActivation);
    return () => {
      window.removeEventListener(ACTIVATE_EVENT, syncActivation);
      window.removeEventListener('storage', syncActivation);
    };
  }, []);

  useEffect(() => {
    if (!activeSessionId || !currentSession || activeSessionId !== currentSession.id) {
      setResults(null);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/sessions/${currentSession.inviteCode}/results`);
        if (!response.ok) throw new Error(`companion_results_${response.status}`);
        const data = await response.json() as CompanionResults;
        if (cancelled) return;
        failureCountRef.current = 0;
        setResults(data);
        if (data.phase === 'DONE' || data.phase === 'NO_CONSENSUS') clearLunchieWaitingCompanion();
      } catch {
        failureCountRef.current += 1;
        if (!cancelled && failureCountRef.current >= 3) setResults(null);
      }
    };

    void poll();
    const pollTimer = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
    };
  }, [activeSessionId, currentSession?.id, currentSession?.inviteCode]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
  }, []);

  const phase = results?.phase ?? 'PRELIM';
  const me = results?.memberCompletion.find(member => member.id === profile.id);
  const isWaitingAwayFromLunchie = Boolean(
    activeSessionId
    && currentSession
    && activeSessionId === currentSession.id
    && results
    && location !== '/lunchie/swipe'
    && (phase !== 'PRELIM' || me?.completed),
  );
  const needsFinalVote = phase === 'FINAL' && !me?.completed;
  const isReroll = phase === 'REROLL';
  const countdown = remainingLabel(results?.deadlineAt ?? currentSession?.deadline ?? null, now);

  const primaryCopy = interactionCopy ?? (
    needsFinalVote
      ? '결승전 투표가 열렸어요!'
      : isReroll
        ? '새로운 후보가 도착했어요!'
        : phase === 'FINAL'
          ? '친구들의 결승 선택을 모으는 중이에요'
          : `런치 투표 ${countdown} 남았어요`
  );
  const secondaryCopy = needsFinalVote || isReroll
    ? '눌러서 투표 페이지로 돌아가요'
    : '친구들이 고르는 동안 먼치피드를 둘러봐요';

  const handleBubbleClick = () => {
    if (needsFinalVote || isReroll) navigate('/lunchie/swipe');
    else if (location !== '/feed') navigate('/feed');
  };

  const handleCharacterTap = () => {
    setIsHappy(true);
    setInteractionCopy('콕! 런치 투표는 내가 지켜보고 있어요');
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = setTimeout(() => {
      setIsHappy(false);
      setInteractionCopy(null);
    }, 1800);
  };

  return (
    <AnimatePresence>
      {isWaitingAwayFromLunchie && (
        <motion.aside
          initial={{ opacity: 0, x: 24, y: 12 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 24, scale: 0.9 }}
          className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+100px)] right-3 z-[70] flex max-w-[330px] items-end gap-2"
          aria-live="polite"
        >
          <motion.button
            type="button"
            onClick={handleBubbleClick}
            className={`pointer-events-auto relative mb-11 max-w-[220px] rounded-[20px] border bg-white px-4 py-3 text-left shadow-[0_12px_32px_rgba(86,53,43,0.18)] ${needsFinalVote || isReroll ? 'border-[#EB5053]' : 'border-[#F0DCD3]'}`}
            animate={needsFinalVote ? { scale: [1, 1.035, 1] } : undefined}
            transition={needsFinalVote ? { duration: 1.25, repeat: Infinity } : undefined}
          >
            <span className="block text-[12px] font-black leading-snug text-[#3D322E]">{primaryCopy}</span>
            <span className="mt-1 block text-[10px] font-bold leading-snug text-[#A08B82]">{secondaryCopy}</span>
            <span className="absolute -right-2 bottom-3 size-4 rotate-45 border-b border-r border-[#F0DCD3] bg-white" aria-hidden="true" />
          </motion.button>

          <motion.button
            type="button"
            onClick={handleCharacterTap}
            aria-label="기다림 도우미 런치킨과 상호작용"
            className="pointer-events-auto flex size-[86px] shrink-0 items-center justify-center rounded-[27px] bg-[#FFF7F1] shadow-[0_12px_32px_rgba(218,82,78,0.2)]"
            animate={isHappy ? { y: [0, -12, 0], rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] } : { y: [0, -4, 0] }}
            transition={isHappy ? { duration: 0.65 } : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <LunchmateCharacterRenderer
              flowState="idle"
              artwork="chicken"
              chickenAssetKeyOverride={isHappy ? 'happy' : needsFinalVote ? 'surprised' : 'idle'}
              chickenFaceSystem={!isHappy && !needsFinalVote}
              animated={false}
              loadout={loadout}
              size={80}
              renderSize="compact"
              alt="런치 투표를 알려주는 런치킨"
            />
          </motion.button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
