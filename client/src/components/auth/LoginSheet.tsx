import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  clearAuthRedirectError, confirmConflictSignIn, IDENTITY_CONFLICT_CODE,
  linkIdentityWithGoogle, parseAuthRedirectError,
} from '@/services/authApi';

interface LoginSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginSheet({ open, onOpenChange }: LoginSheetProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);

  useEffect(() => {
    const redirectError = parseAuthRedirectError();
    if (redirectError?.code === IDENTITY_CONFLICT_CODE) setConflictOpen(true);
  }, [open]);

  const startGoogleLink = async () => {
    setBusy(true);
    setError(null);
    try {
      await linkIdentityWithGoogle();
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : 'Google 로그인을 시작하지 못했어요.');
    }
  };

  const signInExistingAccount = async () => {
    setBusy(true);
    setError(null);
    clearAuthRedirectError();
    try {
      await confirmConflictSignIn();
    } catch (cause) {
      setBusy(false);
      setConflictOpen(false);
      setError(cause instanceof Error ? cause.message : '기존 계정 로그인을 시작하지 못했어요.');
    }
  };

  const cancelConflict = () => {
    clearAuthRedirectError();
    setConflictOpen(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
        <SheetContent side="bottom" className="mx-auto max-w-[480px] rounded-t-3xl border-[#F0E8E0] bg-white px-5 pb-9 pt-3">
          <SheetHeader className="px-0">
            <SheetTitle className="text-lg font-black text-[#2D211C]">로그인</SheetTitle>
            <SheetDescription>기기를 바꿔도 계정과 팔로우 관계를 이어갈 수 있어요.</SheetDescription>
          </SheetHeader>
          <button
            type="button"
            onClick={startGoogleLink}
            disabled={busy}
            className="flex h-13 w-full items-center justify-center rounded-xl bg-[#1A1A1A] text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? <LoaderCircle className="size-5 animate-spin" /> : 'Google로 계속하기'}
          </button>
          {error && <p role="alert" className="text-center text-xs text-[#D83A3D]">{error}</p>}
          <p className="text-center text-[11px] leading-relaxed text-[#A08F84]">
            익명 계정에 Google을 연결하면 현재 uid와 팔로우 관계가 유지됩니다.
          </p>
        </SheetContent>
      </Sheet>

      <AlertDialog open={conflictOpen} onOpenChange={(next) => !busy && setConflictOpen(next)}>
        <AlertDialogContent className="max-w-[390px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>이미 가입된 Google 계정이에요</AlertDialogTitle>
            <AlertDialogDescription>
              기존 계정으로 로그인하면 현재 익명 계정의 로컬 데이터와 소유권은 자동으로 옮겨지지 않아요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelConflict} disabled={busy}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={signInExistingAccount} disabled={busy} className="bg-[#D83A3D] hover:bg-[#C53235]">
              기존 계정으로 로그인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
