import { useEffect, useState, type ReactNode } from 'react';

type AuthBootstrapProps = {
  children: (userId: string | null) => ReactNode;
};

/**
 * Cloudflare가 발급한 직접 Google OAuth 세션을 확인한 뒤 사용자별 AppContext를 렌더한다.
 */
export default function AuthBootstrap({ children }: AuthBootstrapProps) {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'ready'; userId: string | null }
  >({ status: 'loading' });

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
        const { user } = response.ok ? await response.json() as { user: { sub?: string } | null } : { user: null };
        if (active) setState({ status: 'ready', userId: user?.sub ?? null });
      } catch {
        if (active) setState({ status: 'ready', userId: null });
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        Lunchie Munchie를 준비하고 있어요…
      </div>
    );
  }

  return <>{children(state.userId)}</>;
}
