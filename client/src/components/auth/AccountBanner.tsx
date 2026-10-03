import { englishText } from '@shared/englishCopy';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, LogOut, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import {
  linkIdentityWithGoogle, signOutToAnonymous,
} from '@/services/authApi';

export function AccountBanner() {
  const auth = useAuthStatus();
  const [signingIn, setSigningIn] = useState(false);

  if (auth.isLoading || !auth.data) return null;

  if (auth.data.isAnonymous) {
    const startGoogleLogin = async () => {
      setSigningIn(true);
      try {
        await linkIdentityWithGoogle();
      } catch (cause) {
        setSigningIn(false);
        toast.error(cause instanceof Error ? cause.message : "Couldn't start Google sign-in.");
      }
    };

    return (
      <>
        <section className="w-full rounded-[10px] border border-[#E8E6E7] bg-white p-4">
          <p className="text-center text-sm font-bold text-[#171717]">Sign In to Your Account</p>
          <p className="mt-1 text-center text-xs leading-relaxed text-[#858185]">Keep your profile and follows across devices.</p>
          <button
            type="button"
            onClick={startGoogleLogin}
            disabled={signingIn}
            className="mt-4 flex h-12 w-full items-center justify-center gap-3 rounded-[10px] border border-[#D8D5D7] bg-white px-4 text-sm font-semibold text-[#302D30] transition-colors hover:bg-[#F5F4F5] disabled:opacity-60"
            aria-label="Sign in with Google"
          >
            {signingIn ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              <>
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
                  <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
                  <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.36l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
                  <path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z" />
                  <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
                </svg>

                Continue with Google
              </>
            )}
          </button>
        </section>
      </>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-[#E8E6E7] bg-[#F5F4F5] p-3.5">
      {auth.data.picture ? (
        <img src={auth.data.picture} alt="Google Profile" className="size-10 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#858185]">
          <UserRound className="size-5" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[#171717]">{englishText(auth.data.name ?? "Google User")}</span>
        <span className="mt-0.5 block truncate text-xs text-[#6F6B6E]">{englishText(auth.data.email ?? "No Email Available")}</span>
        <span className="mt-1 block text-[11px] font-semibold text-[#AA1A0D]">Signed in with Google</span>
      </span>
    </div>
  );
}

/** 설정 시트 하단에 놓는 독립 로그아웃 동작. */
export function AccountLogoutButton({ onLoggedOut }: { onLoggedOut?: () => void }) {
  const queryClient = useQueryClient();
  const { setCurrentSession } = useApp();
  const [signingOut, setSigningOut] = useState(false);

  const logout = async () => {
    if (!window.confirm("Sign out and start a new guest session?")) return;
    setSigningOut(true);
    try {
      await signOutToAnonymous();
      setCurrentSession(null);
      await queryClient.invalidateQueries({ queryKey: ['authStatus'] });
      onLoggedOut?.();
      toast.success("Signed out. You can continue as a guest.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Couldn't sign out.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={signingOut}
      className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-[#D8D5D7] bg-white text-sm font-bold text-[#565256] disabled:opacity-50"
    >
      {signingOut ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut size={16} />}

      Sign Out
    </button>
  );
}
