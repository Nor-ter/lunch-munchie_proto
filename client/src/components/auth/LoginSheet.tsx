import { englishText } from '@shared/englishCopy';
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
      setError(cause instanceof Error ? cause.message : "Couldn't start Google sign-in.");
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
      setError(cause instanceof Error ? cause.message : "Couldn't sign in to your existing account.");
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
            <SheetTitle className="text-lg font-black text-[#2D211C]">Sign In</SheetTitle>
            <SheetDescription>Keep your account and follows across devices.</SheetDescription>
          </SheetHeader>
          <button
            type="button"
            onClick={startGoogleLink}
            disabled={busy}
            className="flex h-13 w-full items-center justify-center rounded-xl bg-[#1A1A1A] text-sm font-bold text-white disabled:opacity-50"
          >
            {englishText(busy ? <LoaderCircle className="size-5 animate-spin" /> : "Continue with Google")}
          </button>
          {englishText(error && <p role="alert" className="text-center text-xs text-[#D83A3D]">{englishText(error)}</p>)}
          <p className="text-center text-[11px] leading-relaxed text-[#A08F84]">

            Linking Google to your guest account keeps your current ID and follows.
          </p>
        </SheetContent>
      </Sheet>

      <AlertDialog open={conflictOpen} onOpenChange={(next) => !busy && setConflictOpen(next)}>
        <AlertDialogContent className="max-w-[390px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>This Google Account Is Already Registered</AlertDialogTitle>
            <AlertDialogDescription>

              Signing in to an existing account doesn't automatically transfer guest data or ownership.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelConflict} disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={signInExistingAccount} disabled={busy} className="bg-[#D83A3D] hover:bg-[#C53235]">

              Sign In to Existing Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
