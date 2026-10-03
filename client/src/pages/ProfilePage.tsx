import { englishText } from '@shared/englishCopy';
/**
 * Lunchie Munchie — My Profile
 * 프로필과 Quick Match에 자동 적용되는 식단 선호를 관리한다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Settings, X, Camera, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { useProfileFeed } from '@/hooks/useProfileFeed';
import { fileToResizedDataUrl } from '@/lib/imageUtils';
import { ProfileStats } from '@/components/follow/ProfileStats';
import { FollowerListSheet, type FollowListMode } from '@/components/follow/FollowerListSheet';
import { AccountBanner, AccountLogoutButton } from '@/components/auth/AccountBanner';
import {
  GOOGLE_PROFILE_IMPORT_PARAM, GOOGLE_PROFILE_PROMPTED_KEY, IDENTITY_CONFLICT_CODE,
} from '@/services/authApi';
import HeaderIconButton, { HeaderActionRow } from '@/components/ui/HeaderIconButton';
import {
  DIETARY_REQUIREMENTS,
  INGREDIENT_AVOIDANCES,
  normalizeDietaryPreferences,
  type DietaryChoice,
} from '@/lib/quickMatch';

const EMOJIS = ['😊', '🍱', '🍜', '🍣', '🥩', '🍕', '🌮', '🍔', '🥗', '☕', '🎂', '🍰'];

type ProfileSheet = 'settings' | 'avatar';

/** 프로필 아바타 — 업로드 사진이 있으면 사진, 없으면 이모지. 공통 렌더링으로 항상 최신 profile을 반영한다 */
function Avatar({ photo, emoji, size }: { photo?: string; emoji: string; size: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [photo]);
  const showPhoto = Boolean(photo && !imageFailed);

  return (
    <div
      className="rounded-full bg-[#EFE3DA] flex items-center justify-center overflow-hidden shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.49 }}
    >
      {englishText(showPhoto ? (
        <img
          src={photo}
          alt=""
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : emoji)}
    </div>
  );
}

function DietaryPreferenceGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: DietaryChoice[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <section className="border-b border-[#E8E6E7] py-5 last:border-b-0">
      <h2 className="text-[15px] font-bold text-[#171717]">{englishText(title)}</h2>
      <div className="mt-3 divide-y divide-[#EEECEE]" role="group" aria-label={englishText(title)}>
        {options.map(option => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              aria-pressed={active}
              className="flex min-h-12 w-full items-center gap-3 text-left active:bg-[#F8F7F8]"
            >
              <span className="w-6 text-center text-base" aria-hidden="true">{englishText(option.icon)}</span>
              <span className="min-w-0 flex-1 text-[13px] font-medium text-[#302D30]">{englishText(option.label)}</span>
              <span className={`flex size-[18px] items-center justify-center rounded-sm border ${active ? 'border-[#AA1A0D] bg-[#AA1A0D] text-white' : 'border-[#BDBABD] bg-white text-transparent'}`}>
                <Check size={12} strokeWidth={3} aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── ProfilePage ───────────────────────────────────────────────────────────────

function ProfilePageContent({ authenticatedUserId }: { authenticatedUserId: string }) {
  const { profile, updateProfile } = useApp();
  const { posts: myPosts } = useProfileFeed(authenticatedUserId);

  const [activeSheet, setActiveSheet] = useState<ProfileSheet | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const firstGoogleProfilePrompt = params.get(GOOGLE_PROFILE_IMPORT_PARAM) === 'ask'
      && localStorage.getItem(GOOGLE_PROFILE_PROMPTED_KEY) !== 'true';
    if (params.get(GOOGLE_PROFILE_IMPORT_PARAM) === 'ask' && !firstGoogleProfilePrompt) {
      const url = new URL(window.location.href);
      url.searchParams.delete(GOOGLE_PROFILE_IMPORT_PARAM);
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
    return firstGoogleProfilePrompt || params.get('error_code') === IDENTITY_CONFLICT_CODE
      ? 'settings'
      : null;
  });
  const [followListMode, setFollowListMode] = useState<FollowListMode | null>(null);
  const [editName, setEditName] = useState(profile.name);
  const [editHandle, setEditHandle] = useState(profile.handle ?? '');
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const totalLikes = myPosts.reduce((sum, p) => sum + p.likes, 0);

  const saveSettings = async () => {
    const username = editName.trim();
    const handle = editHandle.trim().replace(/^@/, '').toLowerCase();
    if (!username) {
      toast.error("Please enter your name.");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
      toast.error("Use 3–20 lowercase letters, numbers or underscores for your handle.");
      return;
    }
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, handle }),
      });
      const saved = await response.json().catch(() => ({})) as { profile?: { username?: string; handle?: string }; error?: string };
      if (!response.ok || !saved.profile?.username || !saved.profile.handle) throw new Error(saved.error || "Couldn't save your profile.");
      updateProfile({ name: saved.profile.username, handle: saved.profile.handle });
      setActiveSheet(null);
      toast.success("Profile updated! ✅");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save your name.");
    }
  };

  const normalizedDietary = normalizeDietaryPreferences(profile.dietary);
  const toggleDiet = (value: string) => {
    const next = normalizedDietary.includes(value)
      ? normalizedDietary.filter(item => item !== value)
      : [...normalizedDietary, value];
    updateProfile({ dietary: next });
    void fetch('/api/profile', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dietaryPreferences: next }),
    }).then(response => {
      if (!response.ok) throw new Error("Couldn't save dietary preferences.");
    }).catch(error => {
      toast.error(error instanceof Error ? error.message : "Couldn't save dietary preferences.");
    });
  };

  const pickEmoji = (e: string) => {
    updateProfile({ emoji: e, avatarPhoto: undefined });
    void fetch('/api/profile', {
      method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarUrl: null }),
    });
    toast.success("Avatar updated! " + e);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file, 400, 0.85);
      const uploadResponse = await fetch('/api/uploads', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      });
      const upload = await uploadResponse.json().catch(() => ({})) as { url?: string; error?: string };
      if (!uploadResponse.ok || !upload.url) throw new Error(upload.error || "Couldn't upload the photo.");
      const profileResponse = await fetch('/api/profile', {
        method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: upload.url }),
      });
      const saved = await profileResponse.json().catch(() => ({})) as { profile?: { profile_image_url?: string | null }; error?: string };
      if (!profileResponse.ok) throw new Error(saved.error || "Couldn't save your profile photo.");
      updateProfile({ avatarPhoto: saved.profile?.profile_image_url ?? upload.url });
      toast.success("Profile photo updated! 📸");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load the photo");
    }
  };

  return (
    <div className="min-h-dvh bg-[#FCFCFC] pb-24">
      {/* 상단 메뉴 */}
      <HeaderActionRow className="header-action-row--raised">
        <HeaderIconButton
          onClick={() => { setEditName(profile.name); setEditHandle(profile.handle ?? ''); setActiveSheet('settings'); }}
          aria-label="Profile Settings"
          className="border border-[#E8E6E7] bg-white shadow-sm hover:bg-[#F5F4F5]"
        >
          <Settings size={18} color="#171717" />
        </HeaderIconButton>

        {/* 아바타 업로드용 숨은 파일 입력 — 헤더 아바타 탭 시트/설정 시트 공용 */}
        <input
          ref={avatarFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />
      </HeaderActionRow>

      {/* 프로필 정보 */}
      <div className="mx-4 mt-2 rounded-[30px] border border-[#E8E6E7] bg-[#F5F4F5] p-4 pb-5">
        <div className="px-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveSheet('avatar')}
              className="relative shrink-0 rounded-full border-4 border-[#F5F4F5] shadow-md active:scale-95 transition-transform"
              aria-label="Change Avatar"
            >
              <Avatar photo={profile.avatarPhoto} emoji={profile.emoji} size={78} />
              <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#EB5053] border-2 border-white flex items-center justify-center">
                <Camera size={11} color="white" />
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                <p className="min-w-0 truncate text-[19px] font-black text-[#3B2A22]">
                  {englishText(profile.name)}
                </p>
                <span className="shrink-0 rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-bold text-[#C7864B]">

                  🏅 Badges
                </span>
              </div>
              <p className="mt-1.5 whitespace-nowrap text-[13px] font-medium text-[#8A6E60]">
                {englishText(profile.handle ? `@${profile.handle}` : "Here's to another delicious day")}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3">
          <ProfileStats
            userId={profile.id}
            onPressFollowers={() => setFollowListMode('followers')}
            onPressFollowing={() => setFollowListMode('following')}
          />
          <div className="text-center">
            <p className="font-black text-[17px] text-[#3B2A22]">{englishText(totalLikes.toLocaleString())}</p>
            <p className="mt-0.5 text-[10px] text-[#8A6E60]">Likes</p>
          </div>
        </div>
      </div>

      <FollowerListSheet
        open={followListMode !== null}
        userId={profile.id}
        mode={followListMode ?? 'followers'}
        onOpenChange={(open) => !open && setFollowListMode(null)}
      />

      <div className="mt-6 border-t border-[#E8E6E7] bg-[#FCFCFC] px-5">
        <div className="pb-1 pt-5">
          <p className="text-[11px] font-medium text-[#858185]">Your preferences apply automatically to Quick Match.</p>
        </div>
        <DietaryPreferenceGroup
          title="Dietary Requirements"
          options={DIETARY_REQUIREMENTS}
          selected={normalizedDietary}
          onToggle={toggleDiet}
        />
        <DietaryPreferenceGroup
          title="Ingredients to Avoid"
          options={INGREDIENT_AVOIDANCES}
          selected={normalizedDietary}
          onToggle={toggleDiet}
        />
      </div>

      {/* 프로필 설정 시트 */}
      <AnimatePresence>
        {activeSheet === 'settings' && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActiveSheet(null)}
            />
            <motion.div
              data-testid="profile-settings-sheet"
              className="fixed bottom-0 left-0 right-0 mx-auto max-h-[80dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[16px] border-t border-[#E8E6E7] bg-white px-5 pb-8 pt-4 text-[#171717] z-50"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D8D5D7]" />
              <p className="mb-4 font-bold text-[16px]">Profile Settings</p>

              <div className="mb-5">
                 <p className="mb-1.5 text-[12px] font-medium text-[#858185]">Account</p>
                 {/* Google 계정 정보를 설정 화면에서 바로 확인한다. */}
                 <AccountBanner />
              </div>

              <p className="mb-1.5 text-[12px] font-medium text-[#858185]">Name</p>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="h-11 w-full rounded-[10px] border border-[#E8E6E7] bg-[#F5F4F5] px-3 text-[14px] font-semibold text-[#171717] outline-none focus:border-[#AA1A0D] focus:bg-white"
              />

              <p className="mt-4 mb-1.5 text-[12px] font-medium text-[#858185]">Handle</p>
              <div className="flex h-11 items-center rounded-[10px] border border-[#E8E6E7] bg-[#F5F4F5] px-3 focus-within:border-[#AA1A0D] focus-within:bg-white">
                <span className="mr-1 text-[14px] font-semibold text-[#858185]">@</span>
                <input
                  value={editHandle}
                  onChange={event => setEditHandle(event.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 20))}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="lunchie_id"
                  className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-[#171717] outline-none"
                />
              </div>
              <p className="mt-1 text-[10px] font-medium text-[#858185]">Lowercase letters, numbers, underscores · 3–20 characters</p>

              <button
                onClick={saveSettings}
                className="mt-6 h-12 w-full rounded-[10px] bg-[#AA1A0D] text-[14px] font-bold text-white active:bg-[#80140A]"
              >

                Save
              </button>

              <AccountLogoutButton onLoggedOut={() => setActiveSheet(null)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 아바타 변경 시트 — 사진 업로드 또는 기본 이모지 중 선택, 즉시 반영 */}
      <AnimatePresence>
        {activeSheet === 'avatar' && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActiveSheet(null)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 mx-auto max-h-[80dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[16px] border-t border-[#E8E6E7] bg-white px-5 pb-8 pt-4 text-[#171717] z-50"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D8D5D7]" />
              <div className="mb-4 flex items-center justify-between">
                <p className="font-bold text-[16px]">Change Avatar</p>
                <button onClick={() => setActiveSheet(null)} className="flex size-9 items-center justify-center rounded-full active:bg-[#F4F3F4]" aria-label="Close Avatar Editor"><X size={18} className="text-[#858185]" /></button>
              </div>

              <div className="mb-5 flex flex-col items-center">
                <Avatar photo={profile.avatarPhoto} emoji={profile.emoji} size={88} />
                <button
                  onClick={() => avatarFileRef.current?.click()}
                  className="mt-3 flex h-9 items-center gap-1.5 rounded-[10px] bg-[#AA1A0D] px-4 text-[12px] font-bold text-white transition-transform active:scale-95 active:bg-[#80140A]"
                >
                  <Upload size={13} />  Upload Photo
                </button>
                {englishText(profile.avatarPhoto && (
                  <button
                    onClick={() => {
                      updateProfile({ avatarPhoto: undefined });
                      void fetch('/api/profile', {
                        method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ avatarUrl: null }),
                      });
                      toast("Photo removed. Your emoji is back.");
                    }}
                    className="mt-2 text-[11px] font-medium text-[#AA1A0D] underline underline-offset-2"
                  >

                    Remove Photo & Use Emoji
                  </button>
                ))}
              </div>

              <p className="mb-2 text-[12px] font-medium text-[#858185]">Default Emoji</p>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => {
                  const active = !profile.avatarPhoto && profile.emoji === e;
                  return (
                    <button
                      key={e}
                      onClick={() => pickEmoji(e)}
                      className={`rounded-[8px] p-1.5 text-xl transition-all ${active ? 'bg-[#FBECE9] ring-2 ring-[#AA1A0D] scale-110' : 'bg-[#F5F4F5]'}`}
                    >
                      {englishText(e)}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setActiveSheet(null)}
                className="mt-6 h-12 w-full rounded-[10px] bg-[#AA1A0D] text-[14px] font-bold text-white active:bg-[#80140A]"
              >

                Complete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const PROFILE_GOOGLE_LOGIN = '/api/auth/google/start?next=%2Fprofile';

/** 익명 프리뷰 — 레이아웃은 로그인 프로필과 같되, 프로토타입 유저 데이터는 절대 그리지 않는다. */
function ProfileGuestPreview() {
  const goToLogin = useCallback(() => {
    window.location.assign(PROFILE_GOOGLE_LOGIN);
  }, []);

  return (
    <div className="min-h-dvh bg-[#FCFCFC] pb-24">
      <HeaderActionRow className="header-action-row--raised">
        <HeaderIconButton onClick={goToLogin} aria-label="Profile Settings" className="border border-[#E8E6E7] bg-white shadow-sm hover:bg-[#F5F4F5]">
          <Settings size={18} color="#171717" />
        </HeaderIconButton>
      </HeaderActionRow>

      <div className="mx-4 mt-2 rounded-[30px] border border-[#E8E6E7] bg-[#F5F4F5] p-4 pb-5">
        <div className="px-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={goToLogin}
              className="relative shrink-0 rounded-full border-4 border-[#F5F4F5] shadow-md active:scale-95 transition-transform"
              aria-label="Change Avatar"
            >
              <Avatar emoji="😊" size={78} />
              <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#EB5053] border-2 border-white flex items-center justify-center">
                <Camera size={11} color="white" />
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-[19px] font-black text-[#3B2A22]">Sign In Required</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={goToLogin}
            className="mt-4 h-12 w-full rounded-[10px] bg-[#AA1A0D] text-sm font-bold text-white transition-colors active:bg-[#80140A] active:scale-[0.98]"
          >

            Sign in with Google
          </button>
        </div>
        <div className="mt-5 grid grid-cols-3">
          {(["Followers", "Following"] as const).map((label) => (
            <button
              key={label}
              type="button"
              onClick={goToLogin}
              className="border-r border-[#EBC5B8] text-center"
              aria-label={englishText(`${label} List`)}
            >
              <p className="font-black text-[17px] text-[#3B2A22]">0</p>
              <p className="mt-0.5 text-[10px] text-[#8A6E60]">{englishText(label)}</p>
            </button>
          ))}
          <button type="button" onClick={goToLogin} className="text-center">
            <p className="font-black text-[17px] text-[#3B2A22]">0</p>
            <p className="mt-0.5 text-[10px] text-[#8A6E60]">Likes</p>
          </button>
        </div>
      </div>

      <div className="mt-6 border-t border-[#E8E6E7] bg-[#FCFCFC] px-5">
        <div className="py-5">
          <h2 className="text-[15px] font-bold text-[#171717]">Dietary Preferences</h2>
          <p className="mt-1 text-[12px] text-[#858185]">Sign in to save dietary requirements and ingredients to avoid.</p>
        </div>
      </div>
    </div>
  );
}

// 익명 사용자는 개인 프로필 데이터(지민 등)를 그리지 않고, 동일 레이아웃의 로그인 유도 프리뷰만 보여준다.
export default function ProfilePage() {
  const auth = useAuthStatus();
  if (auth.isLoading) {
    return <main className="flex min-h-dvh items-center justify-center bg-[#FCFCFC]"><p className="text-sm font-semibold text-[#858185]">Checking profile…</p></main>;
  }
  if (!auth.data || auth.isError || auth.data.isAnonymous) {
    return <ProfileGuestPreview />;
  }
  return <ProfilePageContent authenticatedUserId={auth.data.uid} />;
}
