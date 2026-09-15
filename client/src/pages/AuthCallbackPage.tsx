import { useEffect, useMemo } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import {
  buildAuthLoginPath,
  clearRememberedAuthNextPath,
  hasOAuthCallbackError,
  resolveAuthNextPath,
} from './authNavigation';

export default function AuthCallbackPage() {
  const [, navigate] = useLocation();
  const auth = useAuthStatus();
  const status = auth.isLoading ? 'loading' : auth.data?.isAnonymous ? 'unauthenticated' : 'authenticated';
  const callbackHasError = useMemo(
    () => hasOAuthCallbackError(window.location.search, window.location.hash),
    [],
  );
  const nextPath = useMemo(
    () => resolveAuthNextPath(window.location.search, window.sessionStorage),
    [],
  );

  useEffect(() => {
    if (callbackHasError || status !== 'authenticated') return;
    clearRememberedAuthNextPath(window.sessionStorage);
    navigate(nextPath, { replace: true });
  }, [callbackHasError, navigate, nextPath, status]);

  const goToLogin = () => {
    navigate(buildAuthLoginPath(nextPath), { replace: true });
  };

  const showFailure = callbackHasError;
  const isUnauthenticated = status === 'unauthenticated';

  return (
    <main className="min-h-dvh bg-[#FCF4EE] px-5 py-12 flex items-center justify-center">
      <section className="w-full max-w-[390px] rounded-3xl border border-[#F0E1D8] bg-white px-6 py-8 text-center shadow-sm">
        {!showFailure && !isUnauthenticated ? (
          <>
            <LoaderCircle size={30} className="mx-auto animate-spin text-[#E85053]" />
            <h1 className="mt-5 text-[19px] font-extrabold text-[#342C28]">Checking your sign-in</h1>
            <p className="mt-2 text-[13px] text-[#8C7D74]">Just a moment.</p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1EF] text-xl font-black text-[#E85053]">
              !
            </div>
            <h1 className="mt-4 text-[19px] font-extrabold text-[#342C28]">
              Couldn't finish signing in
            </h1>
            <p role={showFailure ? 'alert' : undefined} className="mt-2 text-[13px] leading-5 text-[#8C7D74]">
              Please try signing in with Google again.
            </p>
            <button
                type="button"
                onClick={goToLogin}
                className="mt-6 h-11 w-full rounded-2xl bg-[#E85053] text-[14px] font-bold text-white active:scale-[0.98]"
              >
                Back to sign-in
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile', { replace: true })}
              className="mt-4 text-[12px] font-semibold text-[#8C7D74] underline underline-offset-4"
            >
              Back to profile
            </button>
          </>
        )}
      </section>
    </main>
  );
}
