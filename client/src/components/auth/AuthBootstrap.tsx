import { useEffect, useState, type ReactNode } from 'react';
import { isWebAuthConfigured } from '@/contexts/AuthContext';

type AuthBootstrapProps = {
  children: (userId: string | null) => ReactNode;
};

/**
 * Supabase 세션이 결정되기 전에 사용자별 query와 AppContext를 렌더하지 않는다.
 * 익명 로그인이 실패해도 기존 프로토타입은 사용할 수 있도록 null uid로 계속 진행한다.
 */
export default function AuthBootstrap({ children }: AuthBootstrapProps) {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'ready'; userId: string | null }
  >({ status: 'loading' });

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      if (!isWebAuthConfigured()) {
        if (active) setState({ status: 'ready', userId: null });
        return;
      }

      try {
        const { ensureAnonymousSession } = await import('@/lib/supabase');
        const session = await ensureAnonymousSession();
        if (active) setState({ status: 'ready', userId: session?.user.id ?? null });
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
