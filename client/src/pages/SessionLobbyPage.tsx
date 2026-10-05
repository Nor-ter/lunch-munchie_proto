import { englishText } from '@shared/englishCopy';
/**
 * Lunchie Munchie — Session Lobby Page
 * Keeps the existing session polling/invite/start flow while presenting clear
 * host, capacity, participant, and waiting states.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  Crown,
  EyeOff,
  Gamepad2,
  LockKeyhole,
  QrCode,
  Share2,
  UserPlus,
  Users,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { LunchieLogo } from '@/components/brand/LunchieLogo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BackButton from '@/components/ui/BackButton';
import {
  AppCard,
  PrimaryButton,
  ScreenContainer,
  StatusBadge,
} from '@/components/ui/lunchie-ui';
import { useApp } from '@/contexts/AppContext';
import { getLobbyPresentation } from '@/lib/lobbyPresentation';
import SessionManagementMenu from '@/components/lunchie/SessionManagementMenu';
import { isActiveQuickMatchStatus } from '@/lib/quickMatch';
import { copyTextToClipboard } from '@/lib/clipboard';

function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}

export function resolveInviteOrigin(configuredOrigin: string | undefined, browserOrigin: string): string {
  const resolveShareOrigin = (origin: string, fallback: string): string => {
    try {
      const parsed = new URL(origin);
      if (parsed.port === '5173') {
        parsed.port = '8788';
        return parsed.origin;
      }
      return parsed.origin;
    } catch {
      return fallback;
    }
  };

  const fallbackOrigin = resolveShareOrigin(browserOrigin, browserOrigin);
  const candidate = configuredOrigin?.trim();
  if (!candidate) return fallbackOrigin;

  const inviteOrigin = resolveShareOrigin(candidate, fallbackOrigin);
  return inviteOrigin.startsWith('http://') || inviteOrigin.startsWith('https://') ? inviteOrigin : fallbackOrigin;
}

export default function SessionLobbyPage() {
  const [, navigate] = useLocation();
  const { currentSession, fetchSession, startSession, setCurrentSession, profile } = useApp();
  const [showQR, setShowQR] = useState(true);
  const [showMembers, setShowMembers] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [startFailure, setStartFailure] = useState<{ message: string; code?: string } | null>(null);
  const reduceMotion = Boolean(useReducedMotion());
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
            toast.info(session.status === 'cancelled' ? "Quick Match was cancelled." : "This Quick Match is no longer active.");
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
          <h1 className="text-[18px] font-black text-[var(--lm-text)]">No Active Session</h1>
          <p className="mt-1 text-[13px] text-[var(--lm-sub)]">Choose your preferences and create a Lunchie vote.</p>
          <PrimaryButton className="mt-5 w-full" onClick={() => navigate('/lunchie/settings')}>

            Create Session
          </PrimaryButton>
        </AppCard>
      </ScreenContainer>
    );
  }

  const inviteOrigin = resolveInviteOrigin(import.meta.env.VITE_INVITE_ORIGIN, window.location.origin);
  const inviteUrl = `${inviteOrigin}/join/${currentSession.inviteCode}`;
  const participantLabel = `${presentation.memberCount} ${presentation.memberCount === 1 ? 'person' : 'people'}`;

  // Invitees only need confirmation that they joined. QR controls and room
  // management belong to the host; this screen disappears automatically as
  // soon as the host starts the shared round.
  if (!presentation.isHost) {
    return (
      <ScreenContainer className="flex min-h-dvh flex-col overflow-hidden bg-[#FCFCFC] px-5">
        <main className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
          <span className="rounded-full bg-[var(--lm-primary)] px-3 py-1 text-[11px] font-black tracking-[0.8px] text-white">YOU'RE IN!</span>
          <h1 className="mt-4 text-[28px] font-extrabold tracking-[-0.9px] text-[#171717]">You're In!</h1>
          <p className="mt-2 max-w-[290px] text-[14px] font-semibold leading-relaxed text-[#858185]">
            {presentation.isWaiting ? (
              <>{englishText(presentation.hostName)} starts the session, <br />you'll join the preliminary round together.</>
            ) : (
              <>Joining the preliminary round together.</>
            )}
          </p>

          <div className="mt-8 flex items-center justify-center -space-x-2" aria-label={englishText(`${presentation.memberCount} participants`)}>
            {presentation.members.map(member => (
              <span key={member.id} className="flex size-12 items-center justify-center rounded-full border-[3px] border-[#FCFCFC] bg-white text-[22px] shadow-sm" title={englishText(member.name)}>
                {englishText(member.emoji)}
              </span>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2 text-[12px] font-bold text-[#858185]" role="status" aria-live="polite">
            <span className="flex gap-1" aria-hidden="true">
              {[0, 1, 2].map(index => (
                <motion.span
                  key={index}
                  className="size-1.5 rounded-full bg-[#AA1A0D]"
                  animate={reduceMotion ? undefined : { opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                  transition={reduceMotion ? undefined : { duration: 1.1, repeat: Infinity, delay: index * 0.16 }}
                />
              ))}
            </span>

            Waiting for the session to start
          </div>
          <div className="mt-7 grid w-full max-w-[330px] grid-cols-3 gap-2 text-left">
            {[
              ['1', "Choose Privately", "Private Choices"],
              ['2', "Reveal Together", "Shared Results"],
              ['3', "Choose One Place", "Leave Feedback"],
            ].map(([step, title, copy]) => (
              <div key={step} className="rounded-2xl border border-[#E8E6E7] bg-white p-3 shadow-sm">
                <span className="flex size-6 items-center justify-center rounded-lg bg-[var(--lm-primary)] text-[11px] font-black text-white">{englishText(step)}</span>
                <p className="mt-2 text-[11px] font-black text-[#171717]">{englishText(title)}</p>
                <p className="mt-0.5 text-[9px] font-semibold text-[#858185]">{englishText(copy)}</p>
              </div>
            ))}
          </div>
        </main>
      </ScreenContainer>
    );
  }

  const copyInviteLink = (): Promise<boolean> => copyTextToClipboard(inviteUrl);

  const handleCopy = async () => {
    if (await copyInviteLink()) {
      toast.success("Invite link copied! 📋");
    } else {
      toast.error("Couldn't copy the link. Check your browser permissions.");
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
        toast.success("Invite link copied instead of sharing.");
      } else {
        console.error('Failed to share invite link', error);
        toast.error("Couldn't share the invite link. Please try again shortly.");
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
        ? "No matching restaurants. Adjust your radius or preferences."
        : "Couldn't start voting. Please try again shortly.";
      setStartFailure({ message, code: failure.code });
      // The actionable catalogue error is already rendered beside the CTA.
      // Avoid a duplicate floating toast that obscures the top of the lobby.
      if (failure.code !== 'NO_ELIGIBLE_RESTAURANTS') toast.error(message);
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
    <ScreenContainer className="lunchie-lobby flex min-h-dvh flex-col overflow-x-hidden bg-[#FCFCFC] px-5">
      <header className="flex items-center gap-3 pb-5 pt-[max(12px,env(safe-area-inset-top))]">
        <BackButton aria-label="Back to Quick Match Settings" onClick={() => navigate('/lunchie/settings')} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-extrabold text-[var(--lm-text)]">{englishText(currentSession.name)}</h1>
          <p className="mt-0.5 truncate text-[12px] text-[var(--lm-sub)]">

            Host {englishText(presentation.hostName)} · {participantLabel}
          </p>
        </div>
        <StatusBadge
          className={presentation.isWaiting
            ? 'inline-flex h-[36px] min-w-[78px] shrink-0 items-center justify-center rounded-full bg-[var(--lm-card-warm)] px-[12px] text-[13.5px] text-[var(--lm-primary)]'
            : 'bg-[#FBECE9] text-[#AA1A0D]'}
        >
          {englishText(presentation.statusLabel)}
        </StatusBadge>
        <SessionManagementMenu onEnded={() => navigate('/lunchie/settings')} className="shrink-0 text-[var(--lm-text)]" />
      </header>

      <main className="flex-1 pb-28">
        <section className="mb-4 border-y border-[var(--lm-divider)] py-5 text-[var(--lm-text)]" aria-labelledby="session-game-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--lm-card-warm)] px-2.5 py-1 text-[10px] font-semibold text-[var(--lm-primary)]">
                <Gamepad2 size={13} aria-hidden="true" /> LIVE LUNCH GAME
              </span>
              <h2 id="session-game-title" className="mt-3 text-[22px] font-bold leading-tight">Choose Together,<br />Reveal Together!</h2>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { icon: LockKeyhole, label: 'PRIVATE PICK', copy: "Choose Freely" },
              { icon: EyeOff, label: 'NO LIVE SCORE', copy: "Private Vote Counts" },
              { icon: Users, label: 'GROUP REVEAL', copy: "Results for Everyone" },
            ].map(({ icon: Icon, label, copy }) => (
              <div key={label} className="min-w-0 py-1">
                <Icon size={16} className="text-[var(--lm-primary)]" aria-hidden="true" />
                <p className="mt-2 text-[9px] font-semibold">{englishText(label)}</p>
                <p className="mt-0.5 text-[10px] text-[var(--lm-sub)]">{englishText(copy)}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="lobby-invite-title">
          <AppCard className="mb-4 p-4">
            <button
              type="button"
              onClick={() => setShowQR(open => !open)}
              className="flex min-h-11 w-full items-center justify-between rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-primary)] focus-visible:ring-offset-2"
              aria-expanded={showQR}
              aria-controls="lobby-invite-content"
            >
              <span className="flex items-center gap-2">
                <QrCode size={18} className="text-[var(--lm-primary)]" aria-hidden="true" />
                <span id="lobby-invite-title" className="text-[14px] font-bold text-[var(--lm-text)]">Invite Friends</span>
              </span>
              <ChevronDown
                size={18}
                className={`text-[var(--lm-sub)] transition-transform ${showQR ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--lm-sub)]">
              Anyone with this link can join before you start. Start now to play solo.
            </p>

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
                  <div className="mt-3 flex flex-col items-center gap-4 border-t border-[var(--lm-divider)] pt-4">
                    <div
                      className="rounded-[18px] bg-white p-3 shadow-[0_4px_18px_rgba(91,57,42,0.08)]"
                      role="img"
                      aria-label={englishText(`${currentSession.name}  invite QR code`)}
                    >
                      <QRCodeSVG value={inviteUrl} size={152} fgColor="#AA1A0D" level="M" />
                    </div>
                    <p className="max-w-full truncate rounded-full bg-[var(--lm-soft)] px-3 py-1.5 text-[11px] text-[var(--lm-sub)]">

                      Code {englishText(currentSession.inviteCode)}
                    </p>
                    <div className="grid w-full grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleCopy()}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--lm-card-warm)] px-3 text-[13px] font-bold text-[var(--lm-primary)] outline-none transition-colors hover:bg-[#ECC1BB] focus-visible:ring-2 focus-visible:ring-[var(--lm-primary)] focus-visible:ring-offset-2"
                      >
                        <Copy size={16} aria-hidden="true" />  Copy Link
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleShare()}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--lm-card-warm)] px-3 text-[13px] font-bold text-[var(--lm-primary)] outline-none transition-colors hover:bg-[#ECC1BB] focus-visible:ring-2 focus-visible:ring-[var(--lm-primary)] focus-visible:ring-offset-2"
                      >
                        <Share2 size={16} aria-hidden="true" />  Share
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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

                  Participants · {participantLabel}
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
                  <div className="mt-3 space-y-2 border-t border-[var(--lm-divider)] pt-3">
                    {presentation.members.map(member => (
                      <div key={member.id} className="flex min-h-14 items-center gap-3 rounded-2xl bg-[var(--lm-soft)] p-2.5">
                        <Avatar className="size-11 border-2 border-white shadow-sm">
                          {englishText(member.isCurrentUser && profile.avatarPhoto && (
                            <AvatarImage
                              src={profile.avatarPhoto}
                              alt={englishText(`${member.name}'s profile photo`)}
                              className="object-cover"
                            />
                          ))}
                          <AvatarFallback className="bg-[var(--lm-card-warm)] text-[20px]" aria-label={englishText(`${member.name}'s avatar`)}>
                            {englishText(member.emoji)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <p className="truncate text-[13px] font-bold text-[var(--lm-text)]">{englishText(member.name)}</p>
                            {member.isCurrentUser && <span className="shrink-0 text-[10px] text-[var(--lm-sub)]">You</span>}
                          </div>
                          {member.isHost && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--lm-primary)]">
                              <Crown size={11} aria-hidden="true" />  Host
                            </span>
                          )}
                        </div>
                        <span
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FBECE9] px-2 py-1 text-[10px] font-bold text-[#AA1A0D]"
                          aria-label="Session Joined"
                        >
                          <CheckCircle2 size={12} aria-hidden="true" />

                          Joined
                        </span>
                      </div>
                    ))}

                    {presentation.remainingSlots > 0 && (
                      <button
                        type="button"
                        onClick={() => void handleCopy()}
                        className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-dashed border-[var(--lm-divider)] bg-[var(--lm-soft)] px-3 text-left outline-none transition-colors hover:bg-[var(--lm-card-warm)] focus-visible:ring-2 focus-visible:ring-[var(--lm-primary)] focus-visible:ring-offset-2"
                        aria-label={englishText(`Available seats:  ${presentation.remainingSlots}; copy invite link`)}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[var(--lm-primary)] shadow-sm">
                          <UserPlus size={17} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12px] font-bold text-[var(--lm-text)]">Invite a Friend</span>
                          <span className="block text-[10px] text-[var(--lm-sub)]">Anyone with the link can join · tap to copy</span>
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
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-snug text-[var(--lm-text)]">{englishText(presentation.statusCopy)}</p>
            <p className="mt-1 text-[11px] text-[var(--lm-sub)]">
              {englishText(presentation.isFull
                ? "This session is full."
                : presentation.memberCount === 1
                  ? "No one else has joined yet."
                  : `${presentation.memberCount} participants will play this session.`)}
            </p>
          </div>
        </AppCard>
      </main>

      {createPortal(<footer className="fixed bottom-[var(--lm-tab-bar-height)] left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-[#E8E6E7] bg-white px-5 py-4">
        {startFailure && (
          <div role="alert" className="mb-3 rounded-2xl border border-[var(--lm-divider)] bg-[var(--lm-card-warm)] p-3 text-center">
            <p className="text-[12px] font-semibold leading-relaxed text-[var(--lm-primary)]">{englishText(startFailure.message)}</p>
            {startFailure.code === 'NO_ELIGIBLE_RESTAURANTS' && (
              <button
                type="button"
                onClick={() => navigate('/lunchie/settings')}
                className="mt-2 min-h-9 rounded-xl bg-[var(--lm-primary)] px-3 text-[11px] font-bold text-white"
              >

                Adjust Radius & Preferences
              </button>
            )}
          </div>
        )}
        {startFailure?.code !== 'NO_ELIGIBLE_RESTAURANTS' && (
          <PrimaryButton
            className="lunchie-session-primary-action"
            onClick={handlePrimaryAction}
            disabled={presentation.isWaiting && (!presentation.canStart || isStarting)}
            aria-describedby={presentation.disabledReason ? 'lobby-cta-reason' : undefined}
          >
            {englishText(isStarting ? "Starting vote…" : presentation.ctaLabel)}
          </PrimaryButton>
        )}
        {englishText(presentation.disabledReason && (
          <p id="lobby-cta-reason" className="mt-2 text-center text-[11px] font-semibold text-[var(--lm-sub)]">
            {englishText(presentation.disabledReason)}
          </p>
        ))}
      </footer>, document.body)}
    </ScreenContainer>
  );
}
