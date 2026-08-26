import { useState, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useHistoryState } from 'wouter/use-browser-location';
import { useApp } from '@/contexts/AppContext';
import LunchmateCharacterRenderer from '@/components/munchie/LunchmateCharacterRenderer';
import LunchmateRoomRenderer from '@/components/munchie/LunchmateRoomRenderer';
import LunchmateWardrobePanel from '@/components/munchie/LunchmateWardrobePanel';
import SkinPicker from '@/components/munchie/SkinPicker';
import { getLunchmateLevelIcon } from '@/constants/lunchmateLevelIcons';
import { getSkinById, MUNCHIE_SKINS } from '@/constants/skins';
import {
  createLunchmateRoomCategoryUpdate,
  createLunchmateRoomPresetUpdate,
  getLunchmateRoomTheme,
  normalizeLunchmateRoomLoadout,
} from '@/constants/lunchmateRoomThemes';
import type { LunchmateRoomLoadout } from '@/types/lunchmateCustomization';
import type { LunchmateLoadout } from '@/types/lunchmateCustomization';
import {
  createLunchmateProfileLoadoutUpdate,
  lunchmateLoadoutFromProfile,
  lunchmateTotalXpFromProfile,
  normalizeLunchmateLoadout,
  normalizeLunchmateOwnedItemIds,
} from '@/utils/lunchmateProfile';
import {
  getLunchmateProgressSnapshot,
  LUNCHMATE_LEVELS,
  type LunchmateProgressSnapshot,
} from '@/utils/lunchmateProgress';
import { useLunchmateRoomMotion } from '@/hooks/useLunchmateRoomMotion';
import BackButton from '@/components/ui/BackButton';

export interface FoodieRoomNavigationState {
  fromProfile: true;
  progressSnapshot: LunchmateProgressSnapshot;
}

type FoodieRoomTab = 'wardrobe' | 'room' | 'tastebook' | 'growth';

const ROOM_TABS: readonly { id: FoodieRoomTab; label: string }[] = [
  { id: 'wardrobe', label: '옷장' },
  { id: 'room', label: '방 꾸미기' },
  { id: 'tastebook', label: '맛도감' },
  { id: 'growth', label: '성장일지' },
];

const ROOM_CONTENT_GRID_CLASS = 'grid grid-cols-3 gap-3 min-[450px]:grid-cols-4';

function isProgressSnapshot(value: unknown): value is LunchmateProgressSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<LunchmateProgressSnapshot>;
  return typeof snapshot.level === 'number'
    && typeof snapshot.levelName === 'string'
    && typeof snapshot.totalXp === 'number'
    && typeof snapshot.currentLevelStartXp === 'number'
    && (typeof snapshot.nextLevelTotalXp === 'number' || snapshot.nextLevelTotalXp === null)
    && typeof snapshot.xpIntoCurrentLevel === 'number'
    && typeof snapshot.xpRequiredForNextLevel === 'number'
    && typeof snapshot.xpRemainingToNextLevel === 'number'
    && typeof snapshot.progressPercent === 'number'
    && typeof snapshot.nextRewardPlaceholder === 'string'
    && typeof snapshot.isMaxLevel === 'boolean';
}

function isFoodieRoomNavigationState(value: unknown): value is FoodieRoomNavigationState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<FoodieRoomNavigationState>;
  return state.fromProfile === true && isProgressSnapshot(state.progressSnapshot);
}

export default function FoodieRoomPage() {
  const [, navigate] = useLocation();
  const navigationState = useHistoryState<unknown>();
  const { profile, updateProfile } = useApp();
  const [activeTab, setActiveTab] = useState<FoodieRoomTab>('wardrobe');
  const [draftLoadout, setDraftLoadout] = useState<LunchmateLoadout>(() => (
    lunchmateLoadoutFromProfile(profile.lunchmateLoadout)
  ));
  const [appliedLoadout, setAppliedLoadout] = useState<LunchmateLoadout>(() => (
    lunchmateLoadoutFromProfile(profile.lunchmateLoadout)
  ));
  const [appliedNotice, setAppliedNotice] = useState(false);
  const roomMotion = useLunchmateRoomMotion();
  const ownedItemIds = normalizeLunchmateOwnedItemIds(profile.lunchmateOwnedItemIds);

  const hasProfileSnapshot = isFoodieRoomNavigationState(navigationState);
  const progressSnapshot = getLunchmateProgressSnapshot(lunchmateTotalXpFromProfile(profile));
  const skin = getSkinById(profile.foodieSkin) ?? MUNCHIE_SKINS[0];
  const roomTheme = getLunchmateRoomTheme(skin.id);
  const roomLoadout = normalizeLunchmateRoomLoadout(profile.lunchmateRoomLoadout, skin.id);
  const { Icon: RoomLevelIcon } = getLunchmateLevelIcon(progressSnapshot.level);
  const nextRewardLevel = progressSnapshot.level + 1;
  const { Icon: NextRewardIcon } = getLunchmateLevelIcon(nextRewardLevel);

  const handleBack = () => {
    if (hasProfileSnapshot && window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate('/profile', { replace: true });
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabIndex: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (tabIndex + direction + ROOM_TABS.length) % ROOM_TABS.length;
    const nextTab = ROOM_TABS[nextIndex];
    setActiveTab(nextTab.id);
    document.getElementById(`foodie-room-tab-${nextTab.id}`)?.focus();
  };

  const handleDraftChange = (nextLoadout: LunchmateLoadout) => {
    setDraftLoadout(nextLoadout);
    setAppliedNotice(false);
  };

  const handleApplyLoadout = () => {
    const nextAppliedLoadout = normalizeLunchmateLoadout(draftLoadout);
    updateProfile(createLunchmateProfileLoadoutUpdate(nextAppliedLoadout));
    setAppliedLoadout(nextAppliedLoadout);
    setAppliedNotice(true);
  };

  const handleRoomPresetChange = (skinId: string) => {
    updateProfile(createLunchmateRoomPresetUpdate(skinId));
  };

  const handleRoomCategoryChange = (
    field: keyof LunchmateRoomLoadout,
    value: string | null,
  ) => {
    updateProfile(createLunchmateRoomCategoryUpdate(
      profile.lunchmateRoomLoadout,
      skin.id,
      field,
      value,
    ));
  };

  return (
    <main className="min-h-dvh bg-[#FCF4EE] pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] text-[#33251F]">
      <header className="flex items-start gap-3 px-5 pb-4 pt-[max(12px,env(safe-area-inset-top))]">
        <BackButton onClick={handleBack} aria-label="프로필로 돌아가기" />
        <div className="min-w-0 flex-1">
          <h1 className="text-[25px] font-black leading-none tracking-[-0.03em] text-[#DB2837]">RUNCHICKEN ROOM</h1>
          <p className="mt-0.5 text-[10px] font-semibold text-[#A18C80]">나만의 런치메이트 공간</p>
        </div>
        <span className="rounded-full bg-[#FFE7DF] px-2.5 py-1 text-[10px] font-black text-[#D94B4E]">
          준비 중
        </span>
      </header>

      <section className="px-4" aria-labelledby="foodie-room-preview-title">
        <h2 id="foodie-room-preview-title" className="sr-only">런치메이트 미리보기</h2>
        <div
          ref={roomMotion.stageRef}
          className="relative aspect-[3/2] overflow-hidden rounded-[28px] bg-[#F7EEE8] shadow-sm"
          data-lunchmate-room-motion={roomMotion.status}
        >
          <LunchmateRoomRenderer
            foodieSkin={skin.id}
            loadout={roomLoadout}
            variant="stage"
          />

          <div className="absolute left-4 top-4 z-30">
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-black shadow-sm"
              style={{ color: skin.accent }}
            >
              <RoomLevelIcon size={14} strokeWidth={2.6} aria-hidden="true" />
              Lv.{progressSnapshot.level} {progressSnapshot.levelName}
            </span>
            <p className="mt-1.5 pl-1 text-[11px] font-bold" style={{ color: skin.sub }}>
              {progressSnapshot.totalXp} 맛추억
            </p>
          </div>

          <div className="absolute right-4 top-4 z-30 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold shadow-sm" style={{ color: skin.text }}>
            {roomTheme.labelKo}
          </div>

          <div className="absolute inset-x-0 bottom-[15.625%] z-10 flex justify-center">
            <div
              ref={roomMotion.characterRef}
              className="will-change-transform"
              style={{
                transform: `translate3d(${roomMotion.x}px, 0, 0)`,
                transitionDuration: `${roomMotion.positionTransitionMs}ms`,
                transitionProperty: 'transform',
                transitionTimingFunction: 'linear',
                willChange: roomMotion.reducedMotion ? 'auto' : 'transform',
              }}
              data-lunchmate-room-frame={roomMotion.frame}
              data-lunchmate-motion-ready={roomMotion.motionReady ? 'true' : 'false'}
            >
              <div
                className="h-[156px] w-[156px] will-change-transform"
                style={{
                  transform: `scaleX(${roomMotion.scaleX}) scaleY(${roomMotion.scaleY})`,
                  transformOrigin: 'center bottom',
                  transitionDuration: `${roomMotion.poseTransitionMs}ms`,
                  transitionProperty: 'transform',
                  transitionTimingFunction: 'ease-in-out',
                }}
                data-lunchmate-pose-transition={roomMotion.activity}
              >
                <motion.div
                  className="h-full w-full"
                  style={{ transformOrigin: 'center bottom' }}
                  animate={roomMotion.emotionMotion.animate}
                  transition={roomMotion.emotionMotion.transition}
                  data-lunchmate-emotion-motion={roomMotion.emotionMotion.id}
                >
                  <LunchmateCharacterRenderer
                    flowState="idle"
                    size={156}
                    renderSize="room"
                    alt="런치메이트 룸에서 움직이는 런치메이트"
                    fallback={<span className="text-[92px] leading-none">{profile.foodieChar ?? '🐥'}</span>}
                    loadout={draftLoadout}
                    artwork="chicken"
                    chickenAssetKeyOverride={roomMotion.assetKey}
                    onChickenImageLoad={roomMotion.handleCharacterImageLoad}
                    animated={false}
                  />
                </motion.div>
              </div>
            </div>
          </div>

          <p className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-[#33251F]/45 to-transparent px-3 pb-2 pt-6 text-center text-[9px] font-semibold text-white drop-shadow-sm">
            레이어 조합을 확인하는 미리보기예요
          </p>
        </div>
        {!hasProfileSnapshot && (
          <p className="mt-2 px-1 text-center text-[10px] leading-relaxed text-[#A18C80]">
            직접 들어온 화면이라 맛추억은 초기 미리보기 상태로 표시돼요.
          </p>
        )}
      </section>

      <section className="mt-5 px-4" aria-label="런치메이트 룸 기능">
        <div
          role="tablist"
          aria-label="런치메이트 룸 메뉴"
          className="grid grid-cols-4 rounded-2xl bg-[#F2E7DF] p-1"
        >
          {ROOM_TABS.map((tab, index) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`foodie-room-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`foodie-room-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={`min-h-10 rounded-xl px-1 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85053] ${
                  selected ? 'bg-white text-[#E85053] shadow-sm' : 'text-[#8C7A70]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          id={`foodie-room-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`foodie-room-tab-${activeTab}`}
          tabIndex={0}
          className="mt-3 rounded-[24px] bg-white p-4 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85053]"
        >
          {activeTab === 'wardrobe' && (
            <LunchmateWardrobePanel
              draftLoadout={draftLoadout}
              appliedLoadout={appliedLoadout}
              ownedItemIds={ownedItemIds}
              appliedNotice={appliedNotice}
              onDraftChange={handleDraftChange}
              onApply={handleApplyLoadout}
            />
          )}

          {activeTab === 'room' && (
            <div>
              <h2 className="text-[16px] font-black">방 꾸미기</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-[#927E73]">
                선택한 방 구성은 프로필과 런치메이트룸에 바로 적용돼요.
              </p>
              <div className="mt-4">
                <SkinPicker
                  skinId={skin.id}
                  loadout={roomLoadout}
                  onPresetChange={handleRoomPresetChange}
                  onCategoryChange={handleRoomCategoryChange}
                />
              </div>
            </div>
          )}

          {activeTab === 'tastebook' && (
            <div>
              <h2 className="text-[16px] font-black">맛도감</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-[#927E73]">
                런치메이트에게 나눈 음식 기록이 여기에 모일 예정이에요.
              </p>
              <div className={`mt-4 ${ROOM_CONTENT_GRID_CLASS}`} aria-label="음식 8종 준비 중">
                {Array.from({ length: 8 }, (_, index) => (
                  <div key={index} className="aspect-square rounded-2xl border border-[#EEE2DB] bg-[#F8F2EE]" aria-hidden="true">
                    <span className="flex h-full items-center justify-center text-[16px] text-[#CDBDB4]">?</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-[9px] font-semibold text-[#B09A8E]">음식 8종을 준비하고 있어요</p>
            </div>
          )}

          {activeTab === 'growth' && (
            <div>
              <h2 className="text-[16px] font-black">성장일지</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-[#927E73]">레벨과 칭호 기록을 준비하고 있어요.</p>
              <div className="mt-4 rounded-2xl bg-[#FFF6F1] p-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-[#B08169]">현재 Preview Level</p>
                    <p className="mt-0.5 text-[18px] font-black">Lv.{progressSnapshot.level} {progressSnapshot.levelName}</p>
                  </div>
                  <p className="text-[16px] font-black text-[#E85053]">{progressSnapshot.totalXp} XP</p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#F0DDD2]" role="progressbar" aria-label="맛추억 미리보기 진행도" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressSnapshot.progressPercent)}>
                  <div className="h-full rounded-full bg-[#E85053]" style={{ width: `${progressSnapshot.progressPercent}%` }} />
                </div>
                <p className="mt-2 text-[10px] font-semibold text-[#9A8377]">
                  다음 Level까지 {progressSnapshot.xpRemainingToNextLevel} XP
                </p>
                <p className="mt-1 text-[10px] font-semibold text-[#A18C80]">
                  {progressSnapshot.xpIntoCurrentLevel} / {progressSnapshot.xpRequiredForNextLevel} XP
                </p>
              </div>
              <div className={`mt-4 ${ROOM_CONTENT_GRID_CLASS}`} aria-label="레벨별 성장 보상">
                {LUNCHMATE_LEVELS.map(level => {
                  const iconDefinition = getLunchmateLevelIcon(level.level);
                  const LevelRewardIcon = iconDefinition.Icon;
                  const reached = progressSnapshot.level >= level.level;
                  return (
                    <div
                      key={level.level}
                      className={`flex aspect-square min-w-0 flex-col items-center justify-center rounded-2xl border p-2 text-center ${
                        reached
                          ? 'border-[#F0CFC1] bg-[#FFF7F2]'
                          : 'border-[#EEE2DB] bg-[#F8F2EE] opacity-65'
                      }`}
                    >
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{ background: iconDefinition.background, color: iconDefinition.color }}
                        aria-hidden="true"
                      >
                        <LevelRewardIcon size={18} strokeWidth={2.4} />
                      </span>
                      <p className="mt-2 text-[10px] font-black text-[#5A463C]">Lv.{level.level}</p>
                      <p className="mt-0.5 line-clamp-2 text-[8px] font-semibold leading-3 text-[#9A8377]">
                        {level.levelName}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-4 mt-4 flex items-center gap-3 rounded-[22px] border border-[#F0D8CC] bg-[#FFF7F2] p-4 shadow-sm" aria-labelledby="foodie-room-next-reward-title">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#D87756] shadow-sm" aria-hidden="true">
          <NextRewardIcon size={21} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold text-[#AA806C]">다음 레벨 보상</p>
          <h2 id="foodie-room-next-reward-title" className="mt-0.5 text-[13px] font-black">새로운 꾸미기 아이템</h2>
          <p className="mt-0.5 text-[10px] leading-relaxed text-[#8F7C72]">레벨이 오르면 옷장 아이템을 받을 수 있어요.</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#FFE7DF] px-2 py-1 text-[8px] font-black text-[#D94B4E]">준비 중</span>
      </section>
    </main>
  );
}
