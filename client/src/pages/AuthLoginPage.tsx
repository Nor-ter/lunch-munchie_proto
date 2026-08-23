import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import {
  clearRememberedAuthNextPath,
  rememberAuthNextPath,
  resolveAuthNextPath,
} from './authNavigation';
import { replaceWithGoogleAuth, startGoogleAuth } from '@/services/authApi';

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
      ? '로컬 Google 로그인 설정이 없어요. 프로젝트 루트의 .dev.vars에 Google OAuth 설정을 복구한 뒤 개발 서버를 다시 시작해 주세요.'
      : authError === 'oauth_profile'
      ? 'Google 계정 정보를 읽지 못했어요. 계정에 이름이나 프로필 사진이 없어도 로그인은 가능해야 하므로, 다시 시도해도 반복되면 이 오류 코드를 알려주세요.'
      : authError === 'oauth_exchange'
        ? 'Google 인증 코드를 앱 세션으로 바꾸지 못했어요.'
        : 'Google 로그인 상태 확인이 만료됐어요.';

    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#FCF4EE] px-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF0EB] text-xl font-black text-[#E85053]">
          !
        </div>
        <h1 className="mt-5 text-xl font-black text-[#342C28]">로그인을 완료하지 못했어요</h1>
        <p className="mt-2 text-sm leading-6 text-[#8C7D74]">{message}</p>
        <p className="mt-2 text-xs font-semibold text-[#B08B80]">오류 코드: {authError}</p>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="mt-6 h-12 rounded-2xl bg-[#E85053] px-6 text-sm font-bold text-white disabled:opacity-60"
        >
          Google 로그인 다시 시도
        </button>
      </main>
    );
  }

  // OAuth 시작 전 프레임이 보이는 것을 피한다.
  return null;
}
