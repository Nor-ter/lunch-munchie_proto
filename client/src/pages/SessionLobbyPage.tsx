/**
 * Lunchie Munchie — Session Lobby Page
 * Keeps the existing session polling/invite/start flow while presenting clear
 * host, capacity, participant, and waiting states.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Copy,
  Crown,
  QrCode,
  Share2,
  UserPlus,
  Users,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { LunchieLogo } from '@/components/brand/LunchieLogo';
import LunchmateCharacterRenderer from '@/components/munchie/LunchmateCharacterRenderer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AppCard,
  IconButton,
  PrimaryButton,
  ScreenContainer,
  StatusBadge,
} from '@/components/ui/lunchie-ui';
import { useApp } from '@/contexts/AppContext';
import { getLobbyPresentation } from '@/lib/lobbyPresentation';
import { lunchmateLoadoutFromProfile } from '@/utils/lunchmateProfile';
import SessionManagementMenu from '@/components/lunchie/SessionManagementMenu';
import { isActiveQuickMatchStatus } from '@/lib/quickMatch';

function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}

export function resolveInviteOrigin(configuredOrigin: string | undefined, browserOrigin: string): string {
  const candidate = configuredOrigin?.trim();
  if (!candidate) return browserOrigin;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.origin : browserOrigin;
  } catch {
    return browserOrigin;
  }
}

export default function SessionLobbyPage() {
  const [, navigate] = useLocation();
  const { currentSession, fetchSession, startSession, setCurrentSession, profile } = useApp();
  const [showQR, setShowQR] = useState(true);
  const [showMembers, setShowMembers] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [startFailure, setStartFailure] = useState<{ message: string; code?: string } | null>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const lunchmateLoadout = useMemo(
    () => lunchmateLoadoutFromProfile(profile.lunchmateLoadout),
    [profile.lunchmateLoadout],
  );
  const previousMembersRef = useRef<{ sessionId: string; ids: string[] } | undefined>(undefined);

  // Keep every device on the same server-owned phase. A participant does not
  // need to press through a second lobby action: the host's start signal moves
  // everyone into the shared preliminary round on the next short poll.
  useEffect(() => {
    if (!currentSession?.inviteCode) return;
    let active = true;
    const refresh = () => {
      void fetchSession(currentSession.inviteCode)
        .then(session => {
          if (!active) return;
          if (session.membershipActive === false || !isActiveQuickMatchStatus(session.status)) {
            toast.info(session.status === 'cancelled' ? '빠른 매칭이 취소됐어요.' : '더 이상 진행 중인 빠른 매칭이 아니에요.');
            setCurrentSession(null);
            navigate('/lunchie/settings');
          } else if (session.status !== 'waiting') {
            navigate('/lunchie/swipe');
          }
        })
        .catch(error => {
          const status = (error as { status?: number }).status;
          if (!active || (status !== 404 && status !== 410)) {
            if (active) console.error('Failed to refresh Quick Match lobby', error);
            return;
          }
          setCurrentSession(null);
          navigate('/lunchie/settings');
        });
    };
    refresh();
    const interval = window.setInterval(refresh, 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [currentSession?.inviteCode, fetchSession, navigate, setCurrentSession]);

  const previousMemberIds = currentSession && previousMembersRef.current?.sessionId === currentSession.id
    ? previousMembersRef.current.ids
    : undefined;
  const presentation = currentSession
    ? getLobbyPresentation({ session: currentSession, currentUserId: profile.id, previousMemberIds })
    : null;

  useEffect(() => {
    if (!currentSession) {
      previousMembersRef.current = undefined;
      return;
    }
    previousMembersRef.current = {
      sessionId: currentSession.id,
      ids: currentSession.members.map(member => member.id),
    };
  }, [currentSession?.id, currentSession?.members]);

  if (!currentSession || !presentation) {
    return (
      <ScreenContainer className="lunchie-lobby flex min-h-dvh items-center justify-center px-5">
        <AppCard className="w-full max-w-sm p-6 text-center">
          <LunchieLogo size={48} className="mb-4 flex justify-center" />
          <h1 className="text-[18px] font-black text-[var(--lm-text)]">진행 중인 세션이 없어요</h1>
          <p className="mt-1 text-[13px] text-[var(--lm-sub)]">조건을 고르고 새 Lunchie 투표를 만들어 보세요.</p>
          <PrimaryButton className="mt-5 w-full" onClick={() => navigate('/lunchie/settings')}>
            세션 만들기
          </PrimaryButton>
        </AppCard>
      </ScreenContainer>
    );
  }

  const inviteOrigin = resolveInviteOrigin(import.meta.env.VITE_INVITE_ORIGIN, window.location.origin);
  const inviteUrl = `${inviteOrigin}/join/${currentSession.inviteCode}`;
  const isSoloSession = currentSession.filters.partySize <= 1;

  // Invitees only need confirmation that they joined. QR controls and room
  // management belong to the host; this screen disappears automatically as
  // soon as the host starts the shared round.
  if (!presentation.isHost) {
    return (
      <ScreenContainer className="flex min-h-dvh flex-col overflow-hidden bg-[#FCF4EE] px-5">
        <main className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
          <motion.div
            className="relative mb-7 flex size-32 items-center justify-center rounded-[38px] bg-white shadow-[0_18px_50px_rgba(221,92,86,0.15)]"
            animate={reduceMotion ? undefined : { y: [0, -7, 0] }}
            transition={reduceMotion ? undefined : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <LunchmateCharacterRenderer
              flowState="idle"
              loadout={lunchmateLoadout}
              size={106}
              renderSize="compact"
              artwork="chicken"
              chickenAssetKeyOverride="idle"
              chickenFaceSystem
              animated={false}
              alt="예선전 출발을 기다리는 런치킨"
            />
            <span className="absolute -right-2 -top-2 flex size-9 items-center justify-center rounded-full bg-[#EB5053] text-lg text-white shadow-lg">✓</span>
          </motion.div>
          <span className="rounded-full bg-[#FFE3DF] px-3 py-1 text-[11px] font-black tracking-[0.4px] text-[#D8484B]">참여 완료</span>
          <h1 className="mt-4 text-[25px] font-black tracking-[-0.7px] text-[#2F2927]">참여 완료!</h1>
          <p className="mt-2 max-w-[290px] text-[14px] font-semibold leading-relaxed text-[#8A7B75]">
            {presentation.isWaiting ? (
              <>{presentation.hostName}님이 시작하면<br />바로 예선전으로 함께 이동해요.</>
            ) : (
              <>예선전으로 함께 이동하고 있어요.</>
            )}
          </p>

          <div className="mt-8 flex items-center justify-center -space-x-2" aria-label={`${presentation.memberCount}명 참여 중`}>
            {presentation.members.map(member => (
              <span key={member.id} className="flex size-12 items-center justify-center rounded-full border-[3px] border-[#FCF4EE] bg-white text-[22px] shadow-sm" title={member.name}>
                {member.emoji}
              </span>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2 text-[12px] font-bold text-[#A18F88]" role="status" aria-live="polite">
            <span className="flex gap-1" aria-hidden="true">
              {[0, 1, 2].map(index => (
                <motion.span
                  key={index}
                  className="size-1.5 rounded-full bg-[#EB5053]"
                  animate={reduceMotion ? undefined : { opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                  transition={reduceMotion ? undefined : { duration: 1.1, repeat: Infinity, delay: index * 0.16 }}
                />
              ))}
            </span>
            시작 신호를 확인하고 있어요
          </div>
        </main>
      </ScreenContainer>
    );
  }

  const copyInviteLink = async (): Promise<boolean> => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(inviteUrl);
      return true;
    } catch (error) {
      console.error('Failed to copy invite link', error);
      return false;
    }
  };

  const handleCopy = async () => {
    if (await copyInviteLink()) {
      toast.success('초대 링크를 복사했어요! 📋');
    } else {
      toast.error('링크를 복사하지 못했어요. 브라우저 권한을 확인해 주세요.');
    }
  };

  const handleShare = async () => {
    if (!navigator.share) {
      await handleCopy();
      return;
    }

    try {
      await navigator.share({ title: `Lunchie Munchie — ${currentSession.name}`, url: inviteUrl });
    } catch (error) {
      if (isAbortError(error)) return;
      if (await copyInviteLink()) {
        toast.success('공유 대신 초대 링크를 복사했어요.');
      } else {
        console.error('Failed to share invite link', error);
        toast.error('초대 링크를 공유하지 못했어요. 잠시 후 다시 시도해 주세요.');
      }
    }
  };

  const handleStart = async () => {
    if (!presentation.canStart || isStarting) return;
    setStartFailure(null);
    setIsStarting(true);
    try {
      await startSession(currentSession.inviteCode, currentSession.deadlineMinutes);
      navigate('/lunchie/swipe');
    } catch (error) {
      console.error(error);
      const failure = error as Error & { code?: string };
      const message = failure.code === 'NO_ELIGIBLE_RESTAURANTS'
        ? '현재 조건에 맞는 식당이 없어요. 반경이나 조건을 바꿔 주세요.'
        : '투표를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.';
      setStartFailure({ message, code: failure.code });
      toast.error(message);
      setIsStarting(false);
    }
  };

  const handlePrimaryAction = () => {
    if (presentation.isWaiting) {
      void handleStart();
    } else {
      navigate('/lunchie/swipe');
    }
  };

  const collapseInitial = reduceMotion ? false : { opacity: 0, height: 0 };
  const collapseTransition = { duration: reduceMotion ? 0 : 0.2 };

  return (
    <ScreenContainer className="lunchie-lobby flex min-h-dvh flex-col overflow-x-hidden px-5">
      <header className="flex items-center gap-3 pb-5 pt-[max(32px,env(safe-area-inset-top))]">
        <IconButton aria-label="빠른 매칭 설정으로 돌아가기" onClick={() => navigate('/lunchie/settings')} className="shrink-0">
          <ArrowLeft size={20} aria-hidden="true" />
        </IconButton>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-black text-[var(--lm-text)]">{currentSession.name}</h1>
          <p className="mt-0.5 truncate text-[12px] text-[var(--lm-sub)]">
            호스트 {presentation.hostName} · {presentation.memberCount}/{presentation.capacity}명
          </p>
        </div>
        <StatusBadge
          className={presentation.isWaiting
            ? 'inline-flex h-[36px] min-w-[78px] shrink-0 items-center justify-center rounded-full bg-[#FFF0EE] px-[12px] text-[13.5px] text-[var(--lm-primary)]'
            : 'bg-[#EAF7EC] text-[#278836]'}
        >
          {presentation.statusLabel}
        </StatusBadge>
        <SessionManagementMenu onEnded={() => navigate('/lunchie/settings')} className="shrink-0 text-[var(--lm-text)]" />
      </header>

      <main className="flex-1">
        <section aria-labelledby="lobby-invite-title">
          <AppCard className="mb-4 p-4">
            {isSoloSession ? (
              <div className="py-2">
                <span id="lobby-invite-title" className="text-[14px] font-bold text-[var(--lm-text)]">혼자 하는 Lunchie예요</span>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--lm-sub)]">1명 정원으로 만든 세션은 초대할 수 없어요. 친구와 함께하려면 설정에서 ‘같이’를 선택해 새 세션을 만들어 주세요.</p>
                <button type="button" onClick={() => navigate('/lunchie/settings')} className="mt-3 min-h-10 rounded-xl bg-[#FCB3A8] px-4 text-[12px] font-bold text-[var(--lm-text)]">같이 하는 세션 만들기</button>
              </div>
            ) : <>
            <button
              type="button"
              onClick={() => setShowQR(open => !open)}
              className="flex min-h-11 w-full items-center justify-between rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-primary)] focus-visible:ring-offset-2"
              aria-expanded={showQR}
              aria-controls="lobby-invite-content"
            >
              <span className="flex items-center gap-2">
                <QrCode size={18} className="text-[var(--lm-primary)]" aria-hidden="true" />
                <span id="lobby-invite-title" className="text-[14px] font-bold text-[var(--lm-text)]">친구 초대하기</span>
              </span>
              <ChevronDown
                size={18}
                className={`text-[var(--lm-sub)] transition-transform ${showQR ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            <AnimatePresence initial={false}>
              {showQR && (
                <motion.div
                  id="lobby-invite-content"
                  initial={collapseInitial}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={collapseTransition}
                  className="overflow-hidden"
                >
                  <div className="mt-3 flex flex-col items-center gap-4 border-t border-[#F4ECE6] pt-4">
                    <div
                      className="rounded-[18px] bg-white p-3 shadow-[0_4px_18px_rgba(91,57,42,0.08)]"
                      role="img"
                      aria-label={`${currentSession.name} 참여용 QR 코드`}
                    >
                      <QRCodeSVG value={inviteUrl} size={152} fgColor="#E85053" level="M" />
                    </div>
                    <p className="max-w-full truncate rounded-full bg-[#FFF7F3] px-3 py-1.5 text-[11px] text-[#806F65]">
                      코드 {currentSession.inviteCode}
                    </p>
                    <div className="grid w-full grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleCopy()}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FCB3A8] px-3 text-[13px] font-bold text-[var(--lm-text)] outline-none transition-colors hover:bg-[#F9A79B] focus-visible:ring-2 focus-visible:ring-[var(--lm-primary)] focus-visible:ring-offset-2"
                      >
                        <Copy size={16} aria-hidden="true" /> 링크 복사
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleShare()}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FCB3A8] px-3 text-[13px] font-bold text-[var(--lm-text)] outline-none transition-colors hover:bg-[#F9A79B] focus-visible:ring-2 focus-visible:ring-[var(--lm-primary)] focus-visible:ring-offset-2"
                      >
                        <Share2 size={16} aria-hidden="true" /> 공유하기
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </>}
          </AppCard>
        </section>

        <section aria-labelledby="lobby-members-title">
          <AppCard className="mb-4 p-4">
            <button
              type="button"
              onClick={() => setShowMembers(open => !open)}
              className="flex min-h-11 w-full items-center justify-between rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-primary)] focus-visible:ring-offset-2"
              aria-expanded={showMembers}
              aria-controls="lobby-members-content"
            >
              <span className="flex items-center gap-2">
                <Users size={18} className="text-[var(--lm-primary)]" aria-hidden="true" />
                <span id="lobby-members-title" className="text-[14px] font-bold text-[var(--lm-text)]">
                  참여자 {presentation.memberCount}명
                </span>
              </span>
              <ChevronDown
                size={18}
                className={`text-[var(--lm-sub)] transition-transform ${showMembers ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            <AnimatePresence initial={false}>
              {showMembers && (
                <motion.div
                  id="lobby-members-content"
                  initial={collapseInitial}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={collapseTransition}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2 border-t border-[#F4ECE6] pt-3">
                    {presentation.members.map(member => (
                      <div key={member.id} className="flex min-h-14 items-center gap-3 rounded-2xl bg-[#FAF6F2] p-2.5">
                        <Avatar className="size-11 border-2 border-white shadow-sm">
                          {member.isCurrentUser && profile.avatarPhoto && (
                            <AvatarImage
                              src={profile.avatarPhoto}
                              alt={`${member.name}님의 프로필 사진`}
                              className="object-cover"
                            />
                          )}
                          <AvatarFallback className="bg-[#EFE3DA] text-[20px]" aria-label={`${member.name}님의 아바타`}>
                            {member.emoji}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <p className="truncate text-[13px] font-bold text-[var(--lm-text)]">{member.name}</p>
                            {member.isCurrentUser && <span className="shrink-0 text-[10px] text-[var(--lm-sub)]">나</span>}
                          </div>
                          {member.isHost && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--lm-primary)]">
                              <Crown size={11} aria-hidden="true" /> 호스트
                            </span>
                          )}
                        </div>
                        <span
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#EAF7EC] px-2 py-1 text-[10px] font-bold text-[#278836]"
                          aria-label="세션 참여 완료"
                        >
                          <CheckCircle2 size={12} aria-hidden="true" />
                          참여 완료
                        </span>
                      </div>
                    ))}

                    {presentation.remainingSlots > 0 && (
                      <button
                        type="button"
                        onClick={() => void handleCopy()}
                        className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-dashed border-[#E8C9C3] bg-[#FFF9F6] px-3 text-left outline-none transition-colors hover:bg-[#FFF3EE] focus-visible:ring-2 focus-visible:ring-[var(--lm-primary)] focus-visible:ring-offset-2"
                        aria-label={`빈 자리 ${presentation.remainingSlots}개, 초대 링크 복사`}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[var(--lm-primary)] shadow-sm">
                          <UserPlus size={17} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12px] font-bold text-[var(--lm-text)]">빈 자리에 친구 초대</span>
                          <span className="block text-[10px] text-[var(--lm-sub)]">{presentation.remainingSlots}자리 남음 · 탭해서 링크 복사</span>
                        </span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </AppCard>
        </section>

        <AppCard className="mb-4 flex items-center gap-3 p-3.5" role="status" aria-live="polite">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FFF2EC]">
            <motion.div
              animate={reduceMotion ? undefined : { y: [0, -3, 0], rotate: [-1, 1, -1] }}
              transition={reduceMotion ? undefined : { duration: 1.35, repeat: Infinity, ease: 'easeInOut' }}
            >
              <LunchmateCharacterRenderer
                flowState="idle"
                loadout={lunchmateLoadout}
                size={62}
                renderSize="compact"
                artwork="chicken"
                chickenAssetKeyOverride="idle"
                chickenFaceSystem
                animated={false}
                alt="참여자를 기다리는 나의 런치킨"
              />
            </motion.div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-snug text-[var(--lm-text)]">{presentation.statusCopy}</p>
            <p className="mt-1 text-[11px] text-[var(--lm-sub)]">
              {presentation.isFull
                ? '정원이 모두 찼어요.'
                : `${presentation.remainingSlots}자리 더 초대할 수 있어요.`}
            </p>
          </div>
        </AppCard>
      </main>

      <footer className="sticky bottom-0 z-20 -mx-5 mt-auto bg-[linear-gradient(180deg,rgba(252,244,238,0),#FCF4EE_24%)] px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-7">
        {startFailure && (
          <div role="alert" className="mb-3 rounded-2xl border border-[#F2C7BE] bg-[#FFF6F2] p-3 text-center">
            <p className="text-[12px] font-semibold leading-relaxed text-[#7A3E35]">{startFailure.message}</p>
            {startFailure.code === 'NO_ELIGIBLE_RESTAURANTS' && (
              <button
                type="button"
                onClick={() => navigate('/lunchie/settings')}
                className="mt-2 min-h-9 rounded-xl bg-[#EB5053] px-3 text-[11px] font-bold text-white"
              >
                반경·조건 바꾸기
              </button>
            )}
          </div>
        )}
        <PrimaryButton
          className="lunchie-session-primary-action"
          onClick={handlePrimaryAction}
          disabled={presentation.isWaiting && (!presentation.canStart || isStarting)}
          aria-describedby={presentation.disabledReason ? 'lobby-cta-reason' : undefined}
        >
          {isStarting ? '투표를 여는 중…' : presentation.ctaLabel}
        </PrimaryButton>
        {presentation.disabledReason && (
          <p id="lobby-cta-reason" className="mt-2 text-center text-[11px] font-semibold text-[#8A746A]">
            {presentation.disabledReason}
          </p>
        )}
      </footer>
    </ScreenContainer>
  );
}
