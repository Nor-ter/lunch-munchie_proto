import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import {
  clearRememberedAuthNextPath,
  rememberAuthNextPath,
  resolveAuthNextPath,
} from './authNavigation';

export default function AuthLoginPage() {
  const [, navigate] = useLocation();
  const auth = useAuthStatus();
  const [submitting, setSubmitting] = useState(false);
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
    if (auth.isLoading || (auth.data && !auth.data.isAnonymous) || submitting) return;
    setSubmitting(true);
    window.location.replace(`/api/auth/google/start?next=${encodeURIComponent(nextPath)}`);
  }, [auth.data, auth.isLoading, nextPath, submitting]);

  const handleGoogleSignIn = async () => {
    if (submitting) return;

    setSubmitting(true);
    rememberAuthNextPath(window.sessionStorage, nextPath);

    // Google Cloud OAuth is handled directly by the Cloudflare Pages Function.
    // The Worker owns the client secret and exchanges the authorization code.
    window.location.assign(`/api/auth/google/start?next=${encodeURIComponent(nextPath)}`);
  };

  // OAuth 시작 전 프레임이 보이는 것을 피한다.
  return null;
}
