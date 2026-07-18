import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import {
  clearRememberedAuthNextPath,
  createOAuthCallbackUrl,
  rememberAuthNextPath,
  resolveAuthNextPath,
} from './authNavigation';

export default function AuthLoginPage() {
  const [, navigate] = useLocation();
  const {
    status,
    signInWithGoogle,
  } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [oauthFailed, setOAuthFailed] = useState(false);
  const nextPath = useMemo(
    () => resolveAuthNextPath(window.location.search, window.sessionStorage),
    [],
  );

  useEffect(() => {
    if (status !== 'authenticated') return;
    clearRememberedAuthNextPath(window.sessionStorage);
    navigate(nextPath, { replace: true });
  }, [navigate, nextPath, status]);

  const handleGoogleSignIn = async () => {
    if (submitting || status === 'loading' || status === 'unconfigured') return;

    setSubmitting(true);
    setOAuthFailed(false);
    rememberAuthNextPath(window.sessionStorage, nextPath);

    const { error } = await signInWithGoogle(
      createOAuthCallbackUrl(window.location.origin),
    );

    if (error) {
      setOAuthFailed(true);
      setSubmitting(false);
    }
  };

  const isLoading = status === 'loading' || status === 'authenticated' || submitting;
  const isUnconfigured = status === 'unconfigured';
  const showFailure = oauthFailed || status === 'error';

  return (
    <main className="min-h-dvh bg-[#FCF4EE] px-5 py-12 flex items-center justify-center">
      <section className="w-full max-w-[390px] rounded-3xl border border-[#F0E1D8] bg-white px-6 py-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0EB] text-2xl font-black text-[#E85053]">
          LM
        </div>
        <h1 className="text-[22px] font-extrabold text-[#342C28]">런치메이트 로그인</h1>
        <p className="mt-2 text-[13px] leading-5 text-[#8C7D74]">
          Google 계정으로 로그인해 런치메이트를 이어서 이용하세요.
        </p>

        {showFailure && (
          <p role="alert" className="mt-5 rounded-xl bg-[#FFF1EF] px-3 py-2.5 text-[12px] font-semibold text-[#C74447]">
            로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        )}

        {isUnconfigured && (
          <p className="mt-5 rounded-xl bg-[#F7F3EF] px-3 py-2.5 text-[12px] font-semibold text-[#7D716A]">
            웹 로그인 설정이 필요합니다.
          </p>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading || isUnconfigured}
          aria-busy={isLoading}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#E85053] text-[14px] font-bold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isLoading ? (
            <>
              <LoaderCircle size={17} className="animate-spin" />
              로그인 확인 중
            </>
          ) : (
            <>
              <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[13px] font-black text-[#4285F4]">G</span>
              {showFailure ? 'Google 로그인 다시 시도' : 'Google로 계속하기'}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate('/profile', { replace: true })}
          className="mt-4 text-[12px] font-semibold text-[#8C7D74] underline underline-offset-4"
        >
          프로필로 돌아가기
        </button>
      </section>
    </main>
  );
}
