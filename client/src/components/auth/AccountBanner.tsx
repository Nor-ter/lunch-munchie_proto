import { useEffect, useState } from 'react';
import { ChevronRight, LoaderCircle, LogOut, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { LoginSheet } from './LoginSheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useApp } from '@/contexts/AppContext';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { supabase } from '@/lib/supabase';
import {
  applyGoogleProfile, GOOGLE_PROFILE_IMPORT_PARAM, IDENTITY_CONFLICT_CODE,
  getGoogleAccountDetails, type GoogleAccountDetails, linkIdentityWithGoogle,
  markGoogleProfilePrompted, parseAuthRedirectError,
  shouldPromptForGoogleProfile, signOutToAnonymous,
} from '@/services/authApi';

function hasGoogleProfileImportMarker(): boolean {
  return new URLSearchParams(window.location.search).get(GOOGLE_PROFILE_IMPORT_PARAM) === 'ask';
}

function clearGoogleProfileImportMarker(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(GOOGLE_PROFILE_IMPORT_PARAM);
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function AccountBanner() {
  const auth = useAuthStatus();
  const { updateProfile } = useApp();
  const [loginOpen, setLoginOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [importingProfile, setImportingProfile] = useState(false);
  const [profileImportOpen, setProfileImportOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountDetails, setAccountDetails] = useState<GoogleAccountDetails | null>(null);

  useEffect(() => {
    if (parseAuthRedirectError()?.code === IDENTITY_CONFLICT_CODE) setLoginOpen(true);
  }, []);

  useEffect(() => {
    if (auth.data && !auth.data.isAnonymous && hasGoogleProfileImportMarker()) {
      if (shouldPromptForGoogleProfile()) setProfileImportOpen(true);
      else clearGoogleProfileImportMarker();
    }
  }, [auth.data]);

  if (auth.isLoading || !auth.data) return null;

  if (auth.data.isAnonymous) {
    const startGoogleLogin = async () => {
      setSigningIn(true);
      try {
        await linkIdentityWithGoogle();
      } catch (cause) {
        setSigningIn(false);
        toast.error(cause instanceof Error ? cause.message : 'Google 로그인을 시작하지 못했어요.');
      }
    };

    return (
      <>
        <section className="w-full rounded-2xl border border-[#E7E2DE] bg-white p-4">
          <p className="text-center text-sm font-bold text-[#2D211C]">계정에 로그인</p>
          <p className="mt-1 text-center text-xs leading-relaxed text-[#8A7A70]">기기를 바꿔도 프로필과 팔로우 관계를 이어갈 수 있어요.</p>
          <button
            type="button"
            onClick={startGoogleLogin}
            disabled={signingIn}
            className="mt-4 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#DADCE0] bg-white px-4 text-sm font-semibold text-[#3C4043] shadow-sm transition-colors hover:bg-[#F8F9FA] disabled:opacity-60"
            aria-label="Google로 로그인"
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
                Google로 계속하기
              </>
            )}
          </button>
        </section>
        <LoginSheet open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    );
  }

  const logout = async () => {
    if (!window.confirm('로그아웃하고 새 익명 세션으로 전환할까요?')) return;
    setSigningOut(true);
    try {
      await signOutToAnonymous();
      setAccountOpen(false);
      toast.success('로그아웃했어요. 익명 모드로 계속 사용할 수 있어요.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '로그아웃하지 못했어요.');
    } finally {
      setSigningOut(false);
    }
  };

  const openAccountDetails = async () => {
    setAccountOpen(true);
    setAccountLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) throw new Error('Google 로그인 세션을 찾을 수 없어요.');
      setAccountDetails(getGoogleAccountDetails(user));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Google 계정 정보를 불러오지 못했어요.');
      setAccountOpen(false);
    } finally {
      setAccountLoading(false);
    }
  };

  const importGoogleProfile = async () => {
    setImportingProfile(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) throw new Error('Google 로그인 세션을 찾을 수 없어요.');
      const googleProfile = await applyGoogleProfile(user);
      if (!googleProfile.displayName && !googleProfile.avatarUrl) {
        throw new Error('Google 계정에서 가져올 이름이나 사진이 없어요.');
      }
      updateProfile({
        ...(googleProfile.displayName ? { name: googleProfile.displayName } : {}),
        ...(googleProfile.avatarUrl ? { avatarPhoto: googleProfile.avatarUrl } : {}),
      });
      markGoogleProfilePrompted();
      clearGoogleProfileImportMarker();
      setProfileImportOpen(false);
      toast.success('Google 프로필 이름과 사진을 가져왔어요.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Google 프로필을 가져오지 못했어요.');
    } finally {
      setImportingProfile(false);
    }
  };

  const skipGoogleProfile = () => {
    markGoogleProfilePrompted();
    clearGoogleProfileImportMarker();
    setProfileImportOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openAccountDetails}
        className="flex w-full items-center gap-3 rounded-2xl border border-[#F0E8E0] bg-[#FAF6F1] p-3.5 text-left transition-colors hover:bg-[#F6EFE8] active:bg-[#F1E8DF]"
        aria-label="로그인된 Google 계정 정보 보기"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
            <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.36l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z" />
            <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-[#3B2A22]">Google 계정</span>
          <span className="mt-0.5 block text-xs text-[#7C6C62]">Google 계정으로 로그인됨</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-[#A99A90]" aria-hidden="true" />
      </button>

      <Sheet open={accountOpen} onOpenChange={(open) => !signingOut && setAccountOpen(open)}>
        <SheetContent side="bottom" className="mx-auto max-w-[430px] rounded-t-3xl border-[#F0E8E0] bg-white px-5 pb-9 pt-3">
          <SheetHeader className="text-left">
            <SheetTitle>Google 계정</SheetTitle>
            <SheetDescription>현재 Lunchie Munchie에 연결된 계정입니다.</SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {accountLoading ? (
              <div className="flex min-h-28 items-center justify-center" aria-label="계정 정보 불러오는 중">
                <LoaderCircle className="size-6 animate-spin text-[#EB5053]" />
              </div>
            ) : (
              <div className="flex items-center gap-4 rounded-2xl bg-[#FAF6F1] p-4">
                {accountDetails?.avatarUrl ? (
                  <img src={accountDetails.avatarUrl} alt="Google 프로필" className="size-14 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-[#9B887C]">
                    <UserRound className="size-7" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-[#3B2A22]">{accountDetails?.displayName ?? 'Google 사용자'}</p>
                  <p className="mt-1 truncate text-sm text-[#7C6C62]">{accountDetails?.email ?? '이메일 정보 없음'}</p>
                  <p className="mt-1.5 text-xs font-semibold text-[#4285F4]">Google로 연결됨</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={logout}
              disabled={signingOut || accountLoading}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E5DCD2] bg-white text-sm font-bold text-[#6F625A] disabled:opacity-50"
            >
              {signingOut ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut size={16} />}
              로그아웃
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={profileImportOpen} onOpenChange={(open) => {
        if (!open && !importingProfile) skipGoogleProfile();
      }}>
        <AlertDialogContent className="max-w-[390px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Google 프로필을 가져올까요?</AlertDialogTitle>
            <AlertDialogDescription>
              Google 계정의 프로필 이름과 사진으로 Lunchie Munchie 프로필을 업데이트할 수 있어요. 원하지 않으면 현재 프로필을 그대로 유지합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={skipGoogleProfile} disabled={importingProfile}>현재 프로필 유지</AlertDialogCancel>
            <AlertDialogAction onClick={importGoogleProfile} disabled={importingProfile} className="bg-[#EB5053] hover:bg-[#D94447]">
              {importingProfile ? '가져오는 중…' : '이름·사진 가져오기'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
