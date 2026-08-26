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
  const actionLabel = isHost ? '빠른 매칭 취소' : '대기방 나가기';

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
      setError('요청을 처리하지 못했어요. 다시 시도해 주세요.');
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
            aria-label="빠른 매칭 관리"
            className={`flex size-10 items-center justify-center rounded-full outline-none transition-colors hover:bg-[#FFF0EE] focus-visible:ring-2 focus-visible:ring-[#F4515E] focus-visible:ring-offset-2 ${className}`}
          >
            <MoreHorizontal size={20} aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[190px] rounded-xl border-[#F0D9D3] bg-white p-1.5 shadow-xl">
          <DropdownMenuItem
            variant="destructive"
            className="min-h-10 cursor-pointer rounded-lg font-bold"
            onSelect={() => {
              setError(null);
              setConfirmationOpen(true);
            }}
          >
            {isHost ? <XCircle aria-hidden="true" /> : <LogOut aria-hidden="true" />}
            {actionLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmationOpen} onOpenChange={open => !busy && setConfirmationOpen(open)}>
        <AlertDialogContent className="max-w-[390px] rounded-[22px] border-[#F0D9D3] bg-[#FFFBF8] p-5">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-[19px] font-black text-[#26232A]">
              {isHost ? '빠른 매칭을 취소할까요?' : '대기방에서 나갈까요?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] leading-relaxed text-[#746A6E]">
              {isHost
                ? '대기방의 모든 참여자가 나가게 되며 이 세션은 다시 시작할 수 없어요.'
                : '나만 빠른 매칭에서 나가며 다른 참여자의 세션은 계속 유지돼요.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <div className="space-y-2">
              <p role="alert" className="rounded-xl bg-[#FFF0EE] px-3 py-2 text-[12px] font-semibold text-[#C93742]">{error}</p>
              <button
                type="button"
                disabled={busy}
                onClick={clearLocalSession}
                className="min-h-10 w-full rounded-xl bg-white px-3 text-[12px] font-bold text-[#C43B47] outline-none ring-1 ring-[#F2C6C1] transition-colors hover:bg-[#FFF0EE] focus-visible:ring-2 focus-visible:ring-[#F4515E]"
              >
                이 기기에 저장된 세션 지우기
              </button>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} className="min-h-11 rounded-xl">{isHost ? '세션 유지' : '계속 참여'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={event => void handleConfirm(event)}
              disabled={busy}
              className="min-h-11 rounded-xl bg-[#C93742] font-bold text-white hover:bg-[#AE2D37]"
            >
              {busy ? '처리 중…' : actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
