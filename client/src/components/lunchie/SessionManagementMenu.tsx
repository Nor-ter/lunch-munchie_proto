import { englishText } from '@shared/englishCopy';
import { useState } from 'react';
import { LogOut, MoreHorizontal, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApp } from '@/contexts/AppContext';

type SessionManagementMenuProps = {
  className?: string;
  onEnded?: () => void;
};

export default function SessionManagementMenu({ className = '', onEnded }: SessionManagementMenuProps) {
  const { currentSession, profile, cancelSession, leaveSession, setCurrentSession } = useApp();
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentSession) return null;

  const isHost = currentSession.hostId === profile.id || currentSession.filters.partySize === 1;
  const actionLabel = isHost ? "Cancel Quick Match" : "Leave Lobby";

  const clearLocalSession = () => {
    setCurrentSession(null);
    setConfirmationOpen(false);
    setError(null);
    onEnded?.();
  };

  const handleConfirm = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (isHost) await cancelSession(currentSession.inviteCode);
      else await leaveSession(currentSession.inviteCode);
      setConfirmationOpen(false);
      onEnded?.();
    } catch (caught) {
      console.error('빠른 매칭 세션 관리 실패', caught);
      setError("Couldn't complete the request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Manage Quick Match"
            className={`flex size-10 items-center justify-center rounded-full outline-none transition-colors hover:bg-[#FBECE9] focus-visible:ring-2 focus-visible:ring-[#AA1A0D] focus-visible:ring-offset-2 ${className}`}
          >
            <MoreHorizontal size={20} aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[190px] rounded-xl border-[#E8E6E7] bg-white p-1.5 shadow-xl">
          <DropdownMenuItem
            variant="destructive"
            className="min-h-10 cursor-pointer rounded-lg font-bold text-[#AA1A0D] [&_svg]:text-[#AA1A0D] focus:bg-[#FBECE9] focus:text-[#80140A]"
            onSelect={() => {
              setError(null);
              setConfirmationOpen(true);
            }}
          >
            {isHost ? <XCircle aria-hidden="true" /> : <LogOut aria-hidden="true" />}
            {englishText(actionLabel)}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmationOpen} onOpenChange={open => !busy && setConfirmationOpen(open)}>
        <AlertDialogContent className="max-w-[390px] rounded-[22px] border-[#E8E6E7] bg-[#FCFCFC] p-5">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-[19px] font-black text-[#171717]">
              {englishText(isHost ? "Cancel Quick Match?" : "Leave the Lobby?")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] leading-relaxed text-[#858185]">
              {englishText(isHost
                ? "This will end the session for everyone. It can't be restarted."
                : "You'll leave Quick Match. Other participants can continue.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {englishText(error && (
            <div className="space-y-2">
              <p role="alert" className="rounded-xl bg-[#FBECE9] px-3 py-2 text-[12px] font-semibold text-[#AA1A0D]">{englishText(error)}</p>
              <button
                type="button"
                disabled={busy}
                onClick={clearLocalSession}
                className="min-h-10 w-full rounded-xl bg-white px-3 text-[12px] font-bold text-[#AA1A0D] outline-none ring-1 ring-[#ECC1BB] transition-colors hover:bg-[#FBECE9] focus-visible:ring-2 focus-visible:ring-[#AA1A0D]"
              >

                Clear Session on This Device
              </button>
            </div>
          ))}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} className="min-h-11 rounded-xl">{englishText(isHost ? "Keep Session" : "Stay")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={event => void handleConfirm(event)}
              disabled={busy}
              className="min-h-11 rounded-xl bg-[#AA1A0D] font-bold text-white hover:bg-[#80140A]"
            >
              {englishText(busy ? "Processing…" : actionLabel)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
