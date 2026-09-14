/**
 * Lunchie Munchie — My Profile
 * 스크랩북 프로필: 내가 만든 코스맵 템플릿 + 내가 쓴 피드를 한눈에 보고 관리한다.
 * - 나의 코스맵: 스킨 카드 그리드, 좋아요 순/최신 순 정렬, 탭하면 상세(편집 가능)
 * - 나의 피드: 홈과 동일한 요약 카드, 상세 화면에서 댓글·수정 관리
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import {
  Settings, Plus,
} from 'lucide-react';
import { useApp, type FeedPost } from '@/contexts/AppContext';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { useProfileFeed } from '@/hooks/useProfileFeed';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';
import FoodieBuddy, { type FoodieBuddyUiState } from '@/components/munchie/FoodieBuddy';
import { ProfileStats } from '@/components/follow/ProfileStats';
import { FollowerListSheet, type FollowListMode } from '@/components/follow/FollowerListSheet';
import {
  GOOGLE_PROFILE_IMPORT_PARAM, GOOGLE_PROFILE_PROMPTED_KEY, IDENTITY_CONFLICT_CODE,
} from '@/services/authApi';
import LunchboxBottomSheet, {
  isPointInsideLunchboxDropTarget,
  type LunchboxFoodDragPayload,
  type LunchboxFoodItem,
} from '@/components/munchie/LunchboxBottomSheet';
import LunchmateProgressSheet from '@/components/munchie/LunchmateProgressSheet';
import LunchmateLevelUpModal from '@/components/munchie/LunchmateLevelUpModal';
import HeaderIconButton, { HeaderActionRow } from '@/components/ui/HeaderIconButton';
import { useLunchmateFlow } from '@/hooks/useLunchmateFlow';
import {
  consumeLunchboxFood,
  getLunchboxFoodItems,
  markLunchboxFoodSeen,
  normalizeLunchboxInventory,
} from '@/constants/lunchboxFoods';
import type { FoodieRoomNavigationState } from '@/pages/FoodieRoomPage';
import type { LunchmateLayerItem } from '@/types/lunchmateCustomization';
import {
  lunchmateLoadoutFromProfile,
  lunchmateTotalXpFromProfile,
  resolveLunchmateLevelRewardGrant,
} from '@/utils/lunchmateProfile';

/** 로그인 전 프로필 미리보기에서만 사용하는 fixture. */
const LUNCHMATE_PREVIEW_FIXTURE = {
  uiState: 'foodAvailable',
  unseenFoodCount: 2,
  foodItems: [
    {
      id: 'preview-onigiri',
      name: '참치마요 주먹밥',
      placeholder: '🍙',
      quantity: 2,
      unseenQuantity: 1,
      sourceLabel: '코스 기록 완료 보상',
      xpPreview: 5,
    },
    {
      id: 'preview-strawberry-cake',
      name: '딸기 한입 케이크',
      placeholder: '🍰',
      quantity: 1,
      unseenQuantity: 1,
      sourceLabel: '먼치 피드 기록 보상',
      xpPreview: 8,
    },
    {
      id: 'preview-ramen',
      name: '따끈한 라멘',
      placeholder: '🍜',
      quantity: 0,
      unseenQuantity: 0,
      sourceLabel: '다음 기록에서 획득 가능',
      xpPreview: 6,
    },
  ],
} as const satisfies {
  uiState: FoodieBuddyUiState;
  unseenFoodCount: number;
  foodItems: readonly LunchboxFoodItem[];
};

type ProfileSheet = 'lunchbox' | 'progress' | 'levelUp';

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
      {showPhoto ? (
        <img
          src={photo}
          alt=""
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : emoji}
    </div>
  );
}

// ── 내 피드 관리 아이템 ───────────────────────────────────────────────────────

function MyFeedItem({ post }: { post: FeedPost }) {
  return <UnifiedMunchieCard post={post} compact homeSummary detailOrigin="profile" />;
}

// ── ProfilePage ───────────────────────────────────────────────────────────────

function ProfilePageContent({ authenticatedUserId }: { authenticatedUserId: string }) {
  const [, navigate] = useLocation();
  const { profile, updateProfile, courses } = useApp();
  const { posts: myPosts, isLoading: isProfileFeedLoading } = useProfileFeed(authenticatedUserId);
  const lunchmateLoadout = useMemo(
    () => lunchmateLoadoutFromProfile(profile.lunchmateLoadout),
    [profile.lunchmateLoadout],
  );
  const lunchboxInventory = useMemo(
    () => normalizeLunchboxInventory(profile.lunchboxInventory),
    [profile.lunchboxInventory],
  );
  const lunchboxFoodItems = useMemo(
    () => getLunchboxFoodItems(lunchboxInventory),
    [lunchboxInventory],
  );
  const unseenFoodCount = useMemo(
    () => lunchboxFoodItems.reduce((total, item) => total + item.unseenQuantity, 0),
    [lunchboxFoodItems],
  );

  const [activeSheet, setActiveSheet] = useState<ProfileSheet | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const firstGoogleProfilePrompt = params.get(GOOGLE_PROFILE_IMPORT_PARAM) === 'ask'
      && localStorage.getItem(GOOGLE_PROFILE_PROMPTED_KEY) !== 'true';
    if (firstGoogleProfilePrompt || params.get('error_code') === IDENTITY_CONFLICT_CODE) {
      navigate(`/settings/profile${window.location.search}`, { replace: true });
      return;
    }
    if (params.get(GOOGLE_PROFILE_IMPORT_PARAM) === 'ask' && !firstGoogleProfilePrompt) {
      const url = new URL(window.location.href);
      url.searchParams.delete(GOOGLE_PROFILE_IMPORT_PARAM);
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, [navigate]);
  const [followListMode, setFollowListMode] = useState<FollowListMode | null>(null);
  const [levelUpRewardItem, setLevelUpRewardItem] = useState<LunchmateLayerItem | null>(null);
  const lunchboxButtonRef = useRef<HTMLButtonElement>(null);
  const foodieDropTargetRef = useRef<HTMLDivElement>(null);
  const progressButtonRef = useRef<HTMLButtonElement>(null);
  const rewardGrantGuardRef = useRef(new Set<number>());
  const feedingDropGuardRef = useRef(false);
  const activeFoodDragIdRef = useRef<string | null>(null);
  const [draggedFoodId, setDraggedFoodId] = useState<string | null>(null);
  const [isFoodDragOver, setIsFoodDragOver] = useState(false);
  const closeActiveSheet = useCallback(() => {
    setActiveSheet(null);
  }, []);
  const lunchmateTotalXp = lunchmateTotalXpFromProfile(profile);
  const persistLunchmateTotalXp = useCallback((nextTotalXp: number) => {
    updateProfile({ lunchmateTotalXp: nextTotalXp });
  }, [updateProfile]);
  const persistConsumedFood = useCallback((item: LunchboxFoodItem) => {
    const result = consumeLunchboxFood(profile.lunchboxInventory, item.id);
    if (result.consumed) updateProfile({ lunchboxInventory: result.inventory });
  }, [profile.lunchboxInventory, updateProfile]);
  const lunchmateFlow = useLunchmateFlow({
    initialState: unseenFoodCount > 0 ? 'foodAvailable' : 'idle',
    initialTotalXp: lunchmateTotalXp,
    onTotalXpChange: persistLunchmateTotalXp,
    onFoodConsumed: persistConsumedFood,
    onSuccessClose: closeActiveSheet,
  });
  const clearFoodDragState = useCallback(() => {
    activeFoodDragIdRef.current = null;
    setDraggedFoodId(null);
    setIsFoodDragOver(false);
  }, []);
  const isOverFoodieDropTarget = useCallback((payload: LunchboxFoodDragPayload) => {
    const bounds = foodieDropTargetRef.current?.getBoundingClientRect();
    return bounds
      ? isPointInsideLunchboxDropTarget(payload, bounds)
      : false;
  }, []);
  const submitLunchmateFood = useCallback(
    (item: LunchboxFoodItem) => lunchmateFlow.shareFood(item),
    [lunchmateFlow.shareFood],
  );
  const stageLunchmateFood = useCallback((item: LunchboxFoodItem) => {
    if (lunchmateFlow.isBusy || item.quantity <= 0) return;
    lunchmateFlow.selectFood(item);
    clearFoodDragState();
    closeActiveSheet();
  }, [clearFoodDragState, closeActiveSheet, lunchmateFlow.isBusy, lunchmateFlow.selectFood]);
  const handleFoodDragStart = useCallback((payload: LunchboxFoodDragPayload) => {
    if (lunchmateFlow.isBusy || payload.item.quantity <= 0) return;
    activeFoodDragIdRef.current = payload.item.id;
    setDraggedFoodId(payload.item.id);
    setIsFoodDragOver(isOverFoodieDropTarget(payload));
  }, [isOverFoodieDropTarget, lunchmateFlow.isBusy]);
  const handleFoodDragMove = useCallback((payload: LunchboxFoodDragPayload) => {
    if (activeFoodDragIdRef.current !== payload.item.id || lunchmateFlow.isBusy) return;
    const nextIsOver = isOverFoodieDropTarget(payload);
    setIsFoodDragOver(current => current === nextIsOver ? current : nextIsOver);
  }, [isOverFoodieDropTarget, lunchmateFlow.isBusy]);
  const handleLunchboxFoodDrop = useCallback((payload: LunchboxFoodDragPayload) => {
    const validDrag = activeFoodDragIdRef.current === payload.item.id;
    const droppedOnFoodie = isOverFoodieDropTarget(payload);
    clearFoodDragState();

    if (
      !validDrag
      || !droppedOnFoodie
      || payload.item.quantity <= 0
      || lunchmateFlow.isBusy
    ) return;

    lunchmateFlow.selectFood(payload.item);
    closeActiveSheet();
  }, [
    clearFoodDragState,
    closeActiveSheet,
    isOverFoodieDropTarget,
    lunchmateFlow.isBusy,
    lunchmateFlow.selectFood,
  ]);
  const handleStagedFoodDrop = useCallback((payload: LunchboxFoodDragPayload) => {
    const validDrag = activeFoodDragIdRef.current === payload.item.id;
    const droppedOnFoodie = isOverFoodieDropTarget(payload);
    clearFoodDragState();

    if (
      !validDrag
      || !droppedOnFoodie
      || payload.item.quantity <= 0
      || lunchmateFlow.isBusy
      || feedingDropGuardRef.current
    ) return;

    feedingDropGuardRef.current = true;
    void submitLunchmateFood(payload.item).finally(() => {
      feedingDropGuardRef.current = false;
    });
  }, [
    clearFoodDragState,
    isOverFoodieDropTarget,
    lunchmateFlow.isBusy,
    submitLunchmateFood,
  ]);
  const openLunchbox = useCallback(() => {
    if (!lunchmateFlow.beginSelecting()) return;
    if (unseenFoodCount > 0) {
      updateProfile({ lunchboxInventory: markLunchboxFoodSeen(profile.lunchboxInventory) });
    }
    setActiveSheet('lunchbox');
  }, [lunchmateFlow.beginSelecting, profile.lunchboxInventory, unseenFoodCount, updateProfile]);
  const closeLunchbox = useCallback(() => {
    clearFoodDragState();
    if (!lunchmateFlow.selectedFood) lunchmateFlow.cancel();
    closeActiveSheet();
  }, [
    clearFoodDragState,
    closeActiveSheet,
    lunchmateFlow.cancel,
    lunchmateFlow.selectedFood,
  ]);
  const openProgress = useCallback(() => {
    if (!lunchmateFlow.isBusy) setActiveSheet('progress');
  }, [lunchmateFlow.isBusy]);
  const closeLevelUp = useCallback(() => {
    lunchmateFlow.acknowledgeLevelUp();
    closeActiveSheet();
  }, [closeActiveSheet, lunchmateFlow.acknowledgeLevelUp]);
  const openFoodieRoom = useCallback(() => {
    setActiveSheet(null);
    navigate('/profile/foodie-room', {
      state: {
        fromProfile: true,
        progressSnapshot: lunchmateFlow.progressSnapshot,
      } satisfies FoodieRoomNavigationState,
    });
  }, [lunchmateFlow.progressSnapshot, navigate]);

  useEffect(() => {
    const levelUpEvent = lunchmateFlow.levelUpEvent;
    if (!levelUpEvent || activeSheet !== null) return;

    const targetLevel = levelUpEvent.newLevel;
    const stableSeedKey = `${profile.id}:lunchmate-level:${targetLevel}`;
    const grant = resolveLunchmateLevelRewardGrant({
      targetLevel,
      ownedItemIds: profile.lunchmateOwnedItemIds,
      rewardClaims: profile.lunchmateRewardClaims,
      stableSeedKey,
    });

    setLevelUpRewardItem(grant.item);
    if (grant.shouldPersist && !rewardGrantGuardRef.current.has(targetLevel)) {
      rewardGrantGuardRef.current.add(targetLevel);
      updateProfile({
        lunchmateOwnedItemIds: grant.ownedItemIds,
        lunchmateRewardClaims: grant.claims,
      });
    }
    setActiveSheet('levelUp');
  }, [
    activeSheet,
    lunchmateFlow.levelUpEvent,
    profile.id,
    profile.lunchmateOwnedItemIds,
    profile.lunchmateRewardClaims,
    updateProfile,
  ]);

  const totalLikes = myPosts.reduce((sum, p) => sum + p.likes, 0);
  // 성장점수: 코스맵 + 피드가 쌓일수록 푸디 캐릭터가 진화한다
  const foodieScore = courses.length + myPosts.length;

  return (
    <div className="min-h-dvh bg-[#FCF4EE] pb-24">
      {/* 상단 메뉴 */}
      <HeaderActionRow className="header-action-row--raised">
        <HeaderIconButton
          onClick={() => navigate('/settings')}
          aria-label="프로필 설정"
        >
          <Settings size={18} color="#4A4A4A" />
        </HeaderIconButton>

      </HeaderActionRow>

      {/* 핑크 프로필 카드 */}
      <div className="mx-4 mt-2 rounded-[30px] p-4 pb-5" style={{ background: '#F8DCD2' }}>
        {/* 다마고치 배너 — 코스맵·피드가 늘수록 진화하는 푸디 캐릭터 */}
        <FoodieBuddy
          score={foodieScore}
          char={profile.foodieChar}
          skinId={profile.foodieSkin}
          roomLoadout={profile.lunchmateRoomLoadout}
          loadout={lunchmateLoadout}
          onCustomize={openFoodieRoom}
          uiState={lunchmateFlow.state}
          unseenFoodCount={unseenFoodCount}
          onLunchboxOpen={openLunchbox}
          lunchboxButtonRef={lunchboxButtonRef}
          onProgressOpen={openProgress}
          progressButtonRef={progressButtonRef}
          sharedFoodPlaceholder={lunchmateFlow.selectedFood?.placeholder}
          progressSnapshot={lunchmateFlow.progressSnapshot}
          previousProgressSnapshot={lunchmateFlow.previousProgressSnapshot}
          lastXpGain={lunchmateFlow.lastXpGain}
          resultMessage={lunchmateFlow.resultMessage}
          levelUpActive={activeSheet === 'levelUp'}
          foodDropTargetRef={foodieDropTargetRef}
          isLunchboxOpen={activeSheet === 'lunchbox'}
          isFoodDragging={draggedFoodId !== null}
          isFoodDragOver={isFoodDragOver}
          selectedFood={lunchmateFlow.isBusy ? null : lunchmateFlow.selectedFood}
          onFoodDragStart={handleFoodDragStart}
          onFoodDragMove={handleFoodDragMove}
          onFoodDrop={handleStagedFoodDrop}
          onFoodDragCancel={clearFoodDragState}
        />
        <div className="relative z-20 -mt-9 px-3">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0 rounded-full border-4 border-[#F8DCD2] shadow-md">
              <Avatar photo={profile.avatarPhoto} emoji={profile.emoji} size={78} />
            </div>
            <div className="min-w-0 flex-1 pt-11">
              <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                <p className="min-w-0 truncate text-[19px] font-black text-[#3B2A22]">
                  {profile.name}
                </p>
                <span className="shrink-0 rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-bold text-[#C7864B]">
                  🏅 배지
                </span>
              </div>
              <p className="mt-1.5 whitespace-nowrap text-[13px] font-medium text-[#8A6E60]">
                {profile.handle ? `@${profile.handle}` : '오늘도 맛있는 하루를 위해'}
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
            <p className="font-black text-[17px] text-[#3B2A22]">{totalLikes.toLocaleString()}</p>
            <p className="mt-0.5 text-[10px] text-[#8A6E60]">좋아요</p>
          </div>
        </div>
      </div>

      <FollowerListSheet
        open={followListMode !== null}
        userId={profile.id}
        mode={followListMode ?? 'followers'}
        onOpenChange={(open) => !open && setFollowListMode(null)}
      />

      {/* 나의 피드 */}
      <div className="px-4 mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-black text-[18px] text-[#1A1A1A]">나의 피드 {myPosts.length}</h2>
          <button
            type="button"
            onClick={() => navigate('/coursemap/new')}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#E85053] px-3.5 text-[12px] font-black text-white shadow-[0_4px_12px_rgba(232,80,83,0.2)] active:scale-95"
            aria-label="새 게시물 작성"
          >
            <Plus size={15} strokeWidth={3} /> 게시
          </button>
        </div>
        {isProfileFeedLoading && myPosts.length === 0 ? (
          <div className="w-full rounded-2xl border-2 border-dashed border-[#E5CFC5] py-8 text-center">
            <p className="text-[13px] font-bold text-[#8A7A6C]">피드를 동기화하는 중…</p>
          </div>
        ) : myPosts.length === 0 ? (
          <div className="w-full rounded-2xl border-2 border-dashed border-[#E5CFC5] py-8 text-center">
            <p className="text-3xl mb-1">📔</p>
            <p className="text-[13px] font-bold text-[#8A7A6C]">게시 버튼으로 첫 피드를 작성해보세요</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 items-start gap-3">
            {myPosts.map(post => (
              <MyFeedItem key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      <LunchboxBottomSheet
        open={activeSheet === 'lunchbox'}
        items={lunchboxFoodItems}
        flowState={lunchmateFlow.state}
        errorMessage={lunchmateFlow.errorMessage}
        onFoodSelect={lunchmateFlow.selectFood}
        onShare={stageLunchmateFood}
        onFoodDragStart={handleFoodDragStart}
        onFoodDragMove={handleFoodDragMove}
        onFoodDrop={handleLunchboxFoodDrop}
        onFoodDragCancel={clearFoodDragState}
        dropTargetRef={foodieDropTargetRef}
        onClose={closeLunchbox}
        onAfterClose={() => lunchboxButtonRef.current?.focus()}
      />

      <LunchmateProgressSheet
        open={activeSheet === 'progress'}
        snapshot={lunchmateFlow.progressSnapshot}
        onClose={closeActiveSheet}
        onAfterClose={() => progressButtonRef.current?.focus()}
      />

      <LunchmateLevelUpModal
        open={activeSheet === 'levelUp'}
        event={lunchmateFlow.levelUpEvent}
        loadout={lunchmateLoadout}
        rewardItem={levelUpRewardItem}
        onClose={closeLevelUp}
        onAfterClose={() => lunchboxButtonRef.current?.focus()}
      />

    </div>
  );
}

const PROFILE_GOOGLE_LOGIN = '/api/auth/google/start?next=%2Fprofile';
const POST_GOOGLE_LOGIN = '/api/auth/google/start?next=%2Fcoursemap%2Fnew';

/** 익명 프리뷰 — 레이아웃은 로그인 프로필과 같되, 프로토타입 유저 데이터는 절대 그리지 않는다. */
function ProfileGuestPreview() {
  const [, navigate] = useLocation();
  const goToSettings = useCallback(() => {
    navigate('/settings');
  }, [navigate]);
  const goToLogin = useCallback(() => {
    window.location.assign(PROFILE_GOOGLE_LOGIN);
  }, []);
  const goToPostLogin = useCallback(() => {
    window.location.assign(POST_GOOGLE_LOGIN);
  }, []);

  return (
    <div className="min-h-dvh bg-[#FCF4EE] pb-24">
      <HeaderActionRow className="header-action-row--raised">
        <HeaderIconButton onClick={goToSettings} aria-label="프로필 설정">
          <Settings size={18} color="#4A4A4A" />
        </HeaderIconButton>
      </HeaderActionRow>

      <div className="mx-4 mt-2 rounded-[30px] p-4 pb-5" style={{ background: '#F8DCD2' }}>
        <FoodieBuddy
          score={0}
          onCustomize={goToLogin}
          uiState={LUNCHMATE_PREVIEW_FIXTURE.uiState}
          unseenFoodCount={LUNCHMATE_PREVIEW_FIXTURE.unseenFoodCount}
          onLunchboxOpen={goToLogin}
          onProgressOpen={goToLogin}
        />
        <div className="relative z-20 -mt-9 px-3">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0 rounded-full border-4 border-[#F8DCD2] shadow-md">
              <Avatar emoji="😊" size={78} />
            </div>
            <div className="min-w-0 flex-1 pt-11">
              <h1 className="text-[19px] font-black text-[#3B2A22]">로그인이 필요해요</h1>
              <p className="mt-1.5 text-[13px] font-medium leading-5 text-[#8A6E60]">
                로그인하면 나의 코스·피드·저장을 볼 수 있어요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={goToLogin}
            className="mt-4 h-12 w-full rounded-2xl bg-[#E85053] text-sm font-bold text-white active:scale-[0.98] transition-transform"
          >
            Google로 로그인
          </button>
        </div>
        <div className="mt-5 grid grid-cols-3">
          {(['팔로워', '팔로잉'] as const).map((label) => (
            <button
              key={label}
              type="button"
              onClick={goToLogin}
              className="border-r border-[#EBC5B8] text-center"
              aria-label={`${label} 목록`}
            >
              <p className="font-black text-[17px] text-[#3B2A22]">0</p>
              <p className="mt-0.5 text-[10px] text-[#8A6E60]">{label}</p>
            </button>
          ))}
          <button type="button" onClick={goToLogin} className="text-center">
            <p className="font-black text-[17px] text-[#3B2A22]">0</p>
            <p className="mt-0.5 text-[10px] text-[#8A6E60]">좋아요</p>
          </button>
        </div>
      </div>

      <div className="px-4 mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-black text-[18px] text-[#1A1A1A]">나의 피드 0</h2>
          <button
            type="button"
            onClick={goToPostLogin}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#E85053] px-3.5 text-[12px] font-black text-white shadow-[0_4px_12px_rgba(232,80,83,0.2)] active:scale-95"
            aria-label="로그인하고 게시물 작성"
          >
            <Plus size={15} strokeWidth={3} /> 게시
          </button>
        </div>
        <button
          type="button"
          onClick={goToLogin}
          className="w-full rounded-2xl border-2 border-dashed border-[#E5CFC5] py-8 text-center"
        >
          <p className="text-3xl mb-1">📔</p>
          <p className="text-[13px] font-bold text-[#8A7A6C]">로그인하면 나의 피드를 볼 수 있어요</p>
        </button>
      </div>
    </div>
  );
}

// 익명 사용자는 개인 프로필 데이터(지민 등)를 그리지 않고, 동일 레이아웃의 로그인 유도 프리뷰만 보여준다.
export default function ProfilePage() {
  const auth = useAuthStatus();
  if (auth.isLoading) {
    return <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE]"><p className="text-sm font-bold text-[#8C7D74]">프로필 확인 중…</p></main>;
  }
  if (!auth.data || auth.isError || auth.data.isAnonymous) {
    return <ProfileGuestPreview />;
  }
  return <ProfilePageContent authenticatedUserId={auth.data.uid} />;
}
