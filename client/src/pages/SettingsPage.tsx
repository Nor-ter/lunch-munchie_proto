import { useEffect, useState, type ReactNode } from 'react';
import { Bell, Check, ChevronDown, ChevronRight, FileText, Globe2, LoaderCircle, MessageCircle, Palette, ShieldCheck, Trash2, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { AccountBanner, AccountLogoutButton } from '@/components/auth/AccountBanner';
import BackButton from '@/components/ui/BackButton';
import { useApp } from '@/contexts/AppContext';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import {
  DIETARY_REQUIREMENTS,
  INGREDIENT_AVOIDANCES,
  normalizeDietaryPreferences,
} from '@/lib/quickMatch';
import {
  GOOGLE_PROFILE_IMPORT_PARAM,
  markGoogleProfilePrompted,
} from '@/services/authApi';

const FAVORITE_FOOD_OPTIONS = [
  { value: '한식', label: '한식' },
  { value: '일식', label: '일식' },
  { value: '중식', label: '중식' },
  { value: '태국', label: '태국' },
  { value: '베트남', label: '베트남' },
  { value: '이탈리안', label: '이탈리안' },
  { value: '카페', label: '카페' },
  { value: '브런치', label: '브런치' },
  { value: '디저트', label: '디저트' },
] as const;
const FAVORITE_FOOD_VALUES = new Set<string>(FAVORITE_FOOD_OPTIONS.map(option => option.value));
// Mirrors the canonical root package.json version without expanding Vite config for one display value.
const APP_VERSION = '1.0.0';

function normalizeFavoriteFoods(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && FAVORITE_FOOD_VALUES.has(item))))
    : [];
}

function SettingsHeader({ title, backTo, action }: { title: string; backTo: string; action?: ReactNode }) {
  const [, navigate] = useLocation();
  return (
    <header className="sticky top-0 z-20 grid grid-cols-[minmax(36px,1fr)_auto_minmax(36px,1fr)] items-center border-b border-[#EEDFD7] bg-[#FCF4EE]/95 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
      <BackButton onClick={() => navigate(backTo)} aria-label="뒤로 가기" />
      <h1 className="text-center text-[17px] font-black text-[#30231E]">{title}</h1>
      <span className="justify-self-end">{action}</span>
    </header>
  );
}

function SettingsAvatar({ photo, emoji, size = 'default' }: { photo?: string; emoji: string; size?: 'default' | 'identity' | 'preview' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo]);
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F2E4DC] ${size === 'preview' ? 'size-20 text-[38px]' : size === 'identity' ? 'size-14 text-[28px]' : 'size-12 text-[24px]'}`}>
      {photo && !failed ? (
        <img
          src={photo}
          alt=""
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : emoji}
    </span>
  );
}

function SettingsSaveBar({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="settings-save-bar"
      className="sticky bottom-0 z-10 -mx-5 mt-auto bg-[linear-gradient(180deg,rgba(252,244,238,0),#FCF4EE_28%)] px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-7"
    >
      {children}
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[11px] font-black tracking-[0.04em] text-[#9A8175]">{label}</h2>
      <div className="overflow-hidden rounded-[16px] border border-[#EADDD6] bg-white shadow-[0_2px_8px_rgba(70,45,35,0.06)]">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({
  icon,
  label,
  detail,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-3 px-4 text-left transition-colors hover:bg-[#FFF9F6] active:bg-[#FFF2ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F28A8D]"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#FFF0EC] text-[#D94D55]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-[#33251F]">{label}</span>
        {detail && <span className="mt-1 block truncate text-[11px] font-normal text-[#A08D84]">{detail}</span>}
      </span>
      <ChevronRight size={17} className="shrink-0 text-[#B9AAA2]" aria-hidden="true" />
    </button>
  );
}

function SettingsUnavailableRow({
  icon,
  label,
  detail,
}: {
  icon: ReactNode;
  label: string;
  detail?: string;
}) {
  return (
    <div aria-disabled="true" className="flex min-h-16 items-center gap-3 px-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#FFF0EC] text-[#D94D55]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-[#33251F]">{label}</span>
        {detail && <span className="mt-1 block truncate text-[11px] font-normal text-[#A08D84]">{detail}</span>}
      </span>
      <span className="shrink-0 rounded-full bg-[#F6EFEB] px-2.5 py-1 text-[10px] font-semibold text-[#9A857B]">준비 중</span>
    </div>
  );
}

function AppVersionRow() {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 border-t border-[#F2E6E0] px-4">
      <span className="text-[13px] font-semibold text-[#665149]">앱 버전</span>
      <span className="max-w-[50%] truncate text-right text-[12px] font-normal tabular-nums text-[#A08D84]">{APP_VERSION}</span>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.36l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
    </svg>
  );
}

export default function SettingsPage() {
  const [, navigate] = useLocation();
  const { profile } = useApp();
  const auth = useAuthStatus();
  const authenticatedUser = auth.data && !auth.data.isAnonymous ? auth.data : null;
  const isAuthenticated = Boolean(authenticatedUser);
  const dietaryCount = normalizeDietaryPreferences(profile.dietary).length;
  const preferenceCount = dietaryCount + normalizeFavoriteFoods(profile.favoriteFoods).length;

  useEffect(() => {
    if (sessionStorage.getItem('lm_logout_feedback') !== 'true') return;
    sessionStorage.removeItem('lm_logout_feedback');
    toast.success('로그아웃되었습니다');
  }, []);

  const showAccountDeletionUnavailable = () => {
    if (!window.confirm('계정 삭제 기능을 확인할까요?\n현재 단계에서는 계정이 삭제되지 않습니다.')) return;
    toast.info('현재 계정 삭제 기능은 아직 제공되지 않습니다.');
  };

  return (
    <main className="min-h-dvh bg-[#FCF4EE] pb-[max(28px,env(safe-area-inset-bottom))] text-[#30231E]">
      <SettingsHeader title="설정" backTo="/profile" />
      <div className="space-y-7 px-4 py-5">
        {auth.isLoading || !auth.data ? (
          <div aria-label="로그인 상태 확인 중" className="min-h-[88px] animate-pulse rounded-[20px] border border-[#F0E2DA] bg-[#FFF8F4] shadow-[0_3px_12px_rgba(91,57,44,0.05)]" />
        ) : auth.data.isAnonymous ? (
          <AccountBanner variant="settings-entry" />
        ) : (
          <button
            type="button"
            onClick={() => navigate('/settings/profile')}
            data-testid="settings-profile-summary"
            aria-label="프로필 편집"
            className="flex min-h-[96px] w-full items-center gap-4 rounded-[20px] border border-[#F0D8CE] bg-[linear-gradient(135deg,#FFF9F5_0%,#FFF0EA_100%)] px-5 text-left shadow-[0_6px_18px_rgba(91,57,44,0.09)] transition-[transform,box-shadow] hover:shadow-[0_8px_22px_rgba(91,57,44,0.11)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F28A8D]"
          >
            <SettingsAvatar photo={profile.avatarPhoto} emoji={profile.emoji} size="identity" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16px] font-black text-[#30221C]">{profile.name}</span>
              <span className="mt-1 block truncate text-[12px] font-medium text-[#9A8175]">@{profile.handle || '아이디 설정'}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-[#B9AAA2]" aria-hidden="true" />
          </button>
        )}

        <Section label="개인화">
          <SettingsRow
            icon={<Utensils size={17} />}
            label="음식 취향"
            detail={preferenceCount ? `${preferenceCount}개 선택됨` : '선택한 항목 없음'}
            onClick={() => navigate('/settings/food-preferences')}
          />
          {isAuthenticated && <div className="border-t border-[#F0E3DD]">
            <SettingsRow
              icon={<Bell size={17} />}
              label="알림"
              detail="알림 설정 안내"
              onClick={() => navigate('/settings/notifications')}
            />
          </div>}
        </Section>

        <Section label="일반">
          <SettingsUnavailableRow icon={<Globe2 size={17} />} label="언어" detail="한국어" />
          <div className="border-t border-[#F2E6E0]">
            <SettingsUnavailableRow icon={<Palette size={17} />} label="테마" detail="시스템 설정" />
          </div>
        </Section>

        {authenticatedUser && <section>
          <h2 className="mb-2 px-1 text-[11px] font-black tracking-[0.04em] text-[#9A8175]">로그인 및 보안</h2>
          <div className="space-y-2.5">
            <div data-testid="google-account-card" className="flex min-h-[68px] items-center gap-3 rounded-[16px] border border-[#EADDD6] bg-white px-4 shadow-[0_2px_8px_rgba(70,45,35,0.06)]">
              {authenticatedUser.picture ? (
                <img src={authenticatedUser.picture} alt="Google 프로필" className="size-9 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F8F8F8]"><GoogleMark /></span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-[#33251F]">Google 계정</span>
                <span className="mt-1 block truncate text-[11px] font-normal text-[#A08D84]">{authenticatedUser.email ?? authenticatedUser.name ?? '계정 정보 없음'}</span>
              </span>
              <span className="shrink-0 rounded-full bg-[#EEF4FF] px-2.5 py-1 text-[10px] font-bold text-[#4285F4]">연결됨</span>
            </div>
            <AccountLogoutButton
              className="mt-0 h-16 justify-start rounded-[16px] border border-[#EADDD6] bg-white px-4 text-[14px] font-semibold text-[#33251F] shadow-[0_2px_8px_rgba(70,45,35,0.06)] hover:bg-[#FFF9F6]"
              iconContainerClassName="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#FFF0EC] text-[#D94D55]"
            />
          </div>
        </section>}

        <Section label="지원 및 정보">
          <SettingsUnavailableRow icon={<MessageCircle size={17} />} label="문의 및 피드백" />
          <div className="border-t border-[#F2E6E0]">
            <SettingsUnavailableRow icon={<ShieldCheck size={17} />} label="개인정보 처리방침" />
          </div>
          <div className="border-t border-[#F2E6E0]">
            <SettingsUnavailableRow icon={<FileText size={17} />} label="이용약관" />
          </div>
          <AppVersionRow />
        </Section>

        {authenticatedUser && (
          <div className="pb-3 pt-3 text-center">
            <button
              type="button"
              onClick={showAccountDeletionUnavailable}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[12px] font-semibold text-[#C92F3B] transition-colors hover:bg-[#FFECEE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F28A8D]"
            >
              <Trash2 size={15} aria-hidden="true" />
              계정 삭제
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export function ProfileEditSettingsPage() {
  const [, navigate] = useLocation();
  const { profile, updateProfile } = useApp();
  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle ?? '');
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    const username = name.trim();
    const normalizedHandle = handle.trim().replace(/^@/, '').toLowerCase();
    if (!username) {
      toast.error('이름을 입력해 주세요.');
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedHandle)) {
      toast.error('아이디는 영문 소문자, 숫자, 밑줄로 3~20자까지 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, handle: normalizedHandle }),
      });
      const saved = await response.json().catch(() => ({})) as {
        profile?: { username?: string; handle?: string };
        error?: string;
      };
      if (!response.ok || !saved.profile?.username || !saved.profile.handle) {
        throw new Error(saved.error || '프로필을 저장하지 못했어요.');
      }
      updateProfile({ name: saved.profile.username, handle: saved.profile.handle });
      if (new URLSearchParams(window.location.search).has(GOOGLE_PROFILE_IMPORT_PARAM)) {
        markGoogleProfilePrompted();
      }
      toast.success('프로필을 저장했어요.');
      navigate('/settings');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '프로필을 저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-[#FCF4EE] text-[#30231E]">
      <SettingsHeader title="프로필 편집" backTo="/settings" />
      <div className="flex min-h-0 flex-1 flex-col px-5 pt-6">
        <div className="mb-8 flex flex-col items-center">
          <div data-testid="profile-edit-avatar-preview">
            <SettingsAvatar photo={profile.avatarPhoto} emoji={profile.emoji} size="preview" />
          </div>
          <p className="mt-3 text-[10px] font-medium text-[#A08D84]">사진은 내 정보에서 변경할 수 있어요</p>
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-[12px] font-black text-[#665149]">이름</span>
            <input
              value={name}
              onChange={event => setName(event.target.value.slice(0, 80))}
              className="h-12 w-full rounded-[14px] border border-[#E5D7CF] bg-white px-4 text-[14px] font-bold outline-none transition-colors focus:border-[#E85053] focus:ring-2 focus:ring-[#FAD6D7]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[12px] font-black text-[#665149]">아이디</span>
            <span className="flex h-12 items-center rounded-[14px] border border-[#E5D7CF] bg-white px-4 focus-within:border-[#E85053] focus-within:ring-2 focus-within:ring-[#FAD6D7]">
              <span className="mr-1 text-[14px] font-bold text-[#9B887C]">@</span>
              <input
                value={handle}
                onChange={event => setHandle(event.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 20))}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="lunchie_id"
                className="min-w-0 flex-1 bg-transparent text-[14px] font-bold outline-none"
              />
            </span>
            <span className="mt-1.5 block text-[10px] font-semibold text-[#A58F84]">영문 소문자, 숫자, 밑줄 · 3–20자</span>
          </label>
        </div>

        <SettingsSaveBar>
          <button
            type="button"
            onClick={() => { void saveProfile(); }}
            disabled={saving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#E85053] text-[14px] font-black text-white shadow-[0_7px_18px_rgba(210,62,67,0.2)] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B7BA] disabled:opacity-60"
          >
            {saving && <LoaderCircle size={16} className="animate-spin" />}
            저장하기
          </button>
        </SettingsSaveBar>
      </div>
    </main>
  );
}

function PreferenceChips({
  options,
  selected,
  onToggle,
}: {
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              aria-pressed={active}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-bold transition-[transform,background-color,border-color,color] active:scale-95 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#F5B7BA] ${active
                ? 'border-[#E85053] bg-[#FFE4E6] text-[#B92835] shadow-[0_3px_9px_rgba(211,65,70,0.11)]'
                : 'border-[#DFD2CB] bg-[#FFFDFB] text-[#665149] hover:border-[#EBA3A5] hover:bg-[#FFF8F5]'}`}
            >
              {active && <Check size={13} strokeWidth={3} aria-hidden="true" />}
              {option.label}
            </button>
          );
        })}
    </div>
  );
}

type PreferenceCategory = 'favorites' | 'dietary' | 'avoidances';

function summarizeSelections(values: string[], options: ReadonlyArray<{ value: string; label: string }>) {
  if (values.length === 0) return '선택한 항목 없음';
  const labels = values.map(value => options.find(option => option.value === value)?.label ?? value);
  const visible = labels.slice(0, 3);
  const remainder = values.length - visible.length;
  return `${visible.join(' · ')}${remainder > 0 ? ` +${remainder}` : ''}`;
}

function PreferenceCategoryCard({
  id,
  title,
  options,
  selected,
  expanded,
  onToggleExpanded,
  onToggleValue,
}: {
  id: PreferenceCategory;
  title: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: string[];
  expanded: boolean;
  onToggleExpanded: (id: PreferenceCategory) => void;
  onToggleValue: (value: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[17px] border border-[#EADDD6] bg-white shadow-[0_2px_8px_rgba(70,45,35,0.06)]">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`preference-panel-${id}`}
        onClick={() => onToggleExpanded(id)}
        className="flex min-h-[72px] w-full items-center gap-3 px-4 text-left hover:bg-[#FFF9F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F28A8D]"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-[#33251F]">{title}</span>
          <span className={`mt-1 block truncate text-[11px] font-normal ${selected.length ? 'text-[#B4484E]' : 'text-[#A08D84]'}`}>
            {summarizeSelections(selected, options)}
          </span>
        </span>
        {expanded
          ? <ChevronDown size={18} className="shrink-0 text-[#C55A5F]" aria-hidden="true" />
          : <ChevronRight size={18} className="shrink-0 text-[#B9AAA2]" aria-hidden="true" />}
      </button>
      {expanded && (
        <div id={`preference-panel-${id}`} className="border-t border-[#F2E6E0] bg-[#FFFBF8] px-4 pb-5 pt-4">
          <PreferenceChips options={options} selected={selected} onToggle={onToggleValue} />
        </div>
      )}
    </section>
  );
}

export function FoodPreferencesSettingsPage() {
  const [, navigate] = useLocation();
  const { profile, updateProfile } = useApp();
  const [selected, setSelected] = useState(() => normalizeDietaryPreferences(profile.dietary));
  const [favoriteFoods, setFavoriteFoods] = useState(() => normalizeFavoriteFoods(profile.favoriteFoods));
  const [expandedCategory, setExpandedCategory] = useState<PreferenceCategory | null>(null);

  const toggle = (value: string) => {
    setSelected(current => current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value]);
  };

  const toggleFavoriteFood = (value: string) => {
    setFavoriteFoods(current => current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value]);
  };

  const save = () => {
    updateProfile({
      dietary: normalizeDietaryPreferences(selected),
      favoriteFoods: normalizeFavoriteFoods(favoriteFoods),
    });
    toast.success('음식 취향을 저장했어요.');
    navigate('/settings');
  };

  const toggleExpandedCategory = (category: PreferenceCategory) => {
    setExpandedCategory(current => current === category ? null : category);
  };

  return (
    <main className="flex min-h-dvh flex-col bg-[#FCF4EE] text-[#30231E]">
      <SettingsHeader
        title="음식 취향"
        backTo="/settings"
        action={(
          <button
            type="button"
            onClick={() => { setFavoriteFoods([]); setSelected([]); }}
            className="rounded-lg px-2 py-1.5 text-[12px] font-semibold text-[#C43D45] hover:bg-[#FFE9EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F28A8D]"
          >
            전체 해제
          </button>
        )}
      />
      <div className="flex min-h-0 flex-1 flex-col px-5 pt-6">
        <p className="text-[15px] font-semibold leading-6 text-[#49372F]">내 취향에 맞는 코스를 추천해드릴게요.</p>

        <div className="mt-7 space-y-3">
          <PreferenceCategoryCard id="favorites" title="좋아하는 음식" options={FAVORITE_FOOD_OPTIONS} selected={favoriteFoods} expanded={expandedCategory === 'favorites'} onToggleExpanded={toggleExpandedCategory} onToggleValue={toggleFavoriteFood} />
          <PreferenceCategoryCard id="dietary" title="식단 선호" options={DIETARY_REQUIREMENTS} selected={selected.filter(value => DIETARY_REQUIREMENTS.some(option => option.value === value))} expanded={expandedCategory === 'dietary'} onToggleExpanded={toggleExpandedCategory} onToggleValue={toggle} />
          <PreferenceCategoryCard id="avoidances" title="피하고 싶은 음식" options={INGREDIENT_AVOIDANCES} selected={selected.filter(value => INGREDIENT_AVOIDANCES.some(option => option.value === value))} expanded={expandedCategory === 'avoidances'} onToggleExpanded={toggleExpandedCategory} onToggleValue={toggle} />
        </div>

        <SettingsSaveBar>
          <button
            type="button"
            onClick={save}
            className="h-12 w-full rounded-[15px] bg-[#E85053] text-[14px] font-black text-white shadow-[0_7px_18px_rgba(210,62,67,0.2)] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B7BA]"
          >
            저장하기
          </button>
        </SettingsSaveBar>
      </div>
    </main>
  );
}

export function NotificationSettingsPage() {
  return (
    <main className="min-h-dvh bg-[#FCF4EE] text-[#30231E]">
      <SettingsHeader title="알림" backTo="/settings" />
      <div className="px-5 py-7">
        <section className="rounded-[18px] border border-[#E8D9D1] bg-white px-5 py-8 text-center shadow-[0_5px_18px_rgba(91,57,44,0.05)]">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#FFF0EC] text-[#D94D55]"><Bell size={22} /></span>
          <h2 className="mt-4 text-[15px] font-black">알림 설정을 준비하고 있어요</h2>
          <p className="mt-2 text-[12px] font-semibold leading-5 text-[#927C72]">알림 기능이 연결되면 이 화면에서 수신 항목을 직접 관리할 수 있어요.</p>
        </section>
      </div>
    </main>
  );
}
