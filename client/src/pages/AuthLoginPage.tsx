import { englishText } from '@shared/englishCopy';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import {
  clearRememberedAuthNextPath,
  rememberAuthNextPath,
  resolveAuthNextPath,
} from './authNavigation';
import { replaceWithGoogleAuth, startGoogleAuth } from '@/services/authApi';

export function getOAuthConfigMessage(hostname: string = window.location.hostname) {
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  return isLocal
    ? 'Local Google sign-in settings are missing. Restore Google OAuth settings in .dev.vars and restart the development server.'
    : 'Google sign-in is not configured for this deployment. Ask the deployment owner to restore the Google OAuth secrets and redeploy.';
}

export default function AuthLoginPage() {
  const [, navigate] = useLocation();
  const auth = useAuthStatus();
  const [submitting, setSubmitting] = useState(false);
  const authError = useMemo(() => new URLSearchParams(window.location.search).get('error'), []);
  const nextPath = useMemo(
    () => resolveAuthNextPath(window.location.search, window.sessionStorage),
    [],
  );

  useEffect(() => {
    if (!auth.data || auth.data.isAnonymous) return;
    clearRememberedAuthNextPath(window.sessionStorage);
    navigate(nextPath, { replace: true });
  }, [auth.data, navigate, nextPath]);

  // 이 경로는 이전 링크와 딥링크 호환용이다. 별도 로그인 랜딩을 보여주지 않고
  // 즉시 Google 계정 선택으로 넘긴다.
  useEffect(() => {
    if (authError) return;
    if (auth.isLoading || (auth.data && !auth.data.isAnonymous) || submitting) return;
    setSubmitting(true);
    replaceWithGoogleAuth(nextPath);
  }, [auth.data, auth.isLoading, authError, nextPath, submitting]);

  const handleGoogleSignIn = async () => {
    if (submitting) return;

    setSubmitting(true);
    rememberAuthNextPath(window.sessionStorage, nextPath);

    // Google Cloud OAuth is handled directly by the Cloudflare Pages Function.
    // The Worker owns the client secret and exchanges the authorization code.
    startGoogleAuth(nextPath);
  };

  if (authError) {
    const message = authError === 'oauth_config'
      ? getOAuthConfigMessage()
      : authError === 'oauth_profile'
      ? "Couldn't read your Google account. Sign-in should work without a name or photo. If this persists, report the error code."
      : authError === 'oauth_exchange'
        ? "Couldn't exchange the Google authorization code for an app session."
        : "Your Google sign-in request expired.";

    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#FCF4EE] px-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF0EB] text-xl font-black text-[#E85053]">
          !
        </div>
        <h1 className="mt-5 text-xl font-black text-[#342C28]">Couldn't complete sign-in</h1>
        <p className="mt-2 text-sm leading-6 text-[#8C7D74]">{englishText(message)}</p>
        <p className="mt-2 text-xs font-semibold text-[#B08B80]">Error code: {englishText(authError)}</p>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="mt-6 h-12 rounded-2xl bg-[#E85053] px-6 text-sm font-bold text-white disabled:opacity-60"
        >

          Try Google Sign-in Again
        </button>
      </main>
    );
  }

  // OAuth 시작 전 프레임이 보이는 것을 피한다.
  return null;
}
