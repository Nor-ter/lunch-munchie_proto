import { useState, type KeyboardEvent } from 'react';
import { useLocation } from 'wouter';
import { useHistoryState } from 'wouter/use-browser-location';
import { ChevronLeft, Gift } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import LunchmateCharacterRenderer from '@/components/munchie/LunchmateCharacterRenderer';
import LunchmateWardrobePanel from '@/components/munchie/LunchmateWardrobePanel';
import { PREVIEW_INITIAL_LOADOUT } from '@/components/munchie/lunchmateWardrobeFixtures';
import { getSkinById, MUNCHIE_SKINS } from '@/constants/skins';
import type { LunchmateLoadout } from '@/types/lunchmateCustomization';
import {
  getLunchmateProgressSnapshot,
  type LunchmateProgressSnapshot,
} from '@/utils/lunchmateProgress';

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
  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState<FoodieRoomTab>('wardrobe');
  const [draftLoadout, setDraftLoadout] = useState<LunchmateLoadout>(() => ({ ...PREVIEW_INITIAL_LOADOUT }));
  const [appliedLoadout, setAppliedLoadout] = useState<LunchmateLoadout>(() => ({ ...PREVIEW_INITIAL_LOADOUT }));
  const [appliedNotice, setAppliedNotice] = useState(false);

  const hasProfileSnapshot = isFoodieRoomNavigationState(navigationState);
  const progressSnapshot = hasProfileSnapshot
    ? navigationState.progressSnapshot
    : getLunchmateProgressSnapshot(0);
  const skin = getSkinById(profile.foodieSkin) ?? MUNCHIE_SKINS[0];

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
    setAppliedLoadout({ ...draftLoadout });
    setAppliedNotice(true);
  };

  return (
    <main className="min-h-dvh bg-[#FCF4EE] pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] text-[#33251F]">
      <header className="flex items-center gap-3 px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#49372E] shadow-sm transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85053]"
          aria-label="프로필로 돌아가기"
        >
          <ChevronLeft size={21} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[21px] font-black leading-tight">런치메이트룸</h1>
          <p className="mt-0.5 text-[10px] font-semibold text-[#A18C80]">나만의 런치메이트 공간</p>
        </div>
        <span className="rounded-full bg-[#FFE7DF] px-2.5 py-1 text-[10px] font-black text-[#D94B4E]">
          준비 중
        </span>
      </header>

      <section className="px-4" aria-labelledby="foodie-room-preview-title">
        <h2 id="foodie-room-preview-title" className="sr-only">런치메이트 미리보기</h2>
        <div
          className="relative h-[240px] overflow-hidden rounded-[28px] p-3 shadow-sm"
          style={{ background: skin.frame, boxShadow: skin.frameShadow }}
        >
          <div
            className="absolute inset-3 overflow-hidden rounded-[22px]"
            style={{ background: skin.paper }}
          >
            <div
              className="absolute inset-x-0 bottom-0 h-[54px] border-t border-dashed"
              style={{ background: 'rgba(255,255,255,0.62)', borderColor: `${skin.accent}55` }}
            />
          </div>

          <div className="absolute left-6 top-6 z-10">
            <span
              className="inline-flex rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black shadow-sm"
              style={{ color: skin.accent }}
            >
              Lv.{progressSnapshot.level} {progressSnapshot.levelName}
            </span>
            <p className="mt-1 pl-1 text-[9px] font-semibold" style={{ color: skin.sub }}>
              {progressSnapshot.totalXp} 맛추억
            </p>
          </div>

          <div className="absolute right-6 top-6 z-10 rounded-full bg-white/85 px-2.5 py-1 text-[9px] font-bold" style={{ color: skin.text }}>
            {skin.emoji} {skin.name}
          </div>

          <div className="absolute inset-x-0 bottom-12 z-10 flex justify-center">
            <LunchmateCharacterRenderer
              flowState="idle"
              size={136}
              alt="런치메이트룸에 서 있는 런치메이트"
              fallback={<span className="text-[76px] leading-none">{profile.foodieChar ?? '🍙'}</span>}
              loadout={draftLoadout}
            />
          </div>

          <p className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/85 px-2.5 py-1 text-[9px] font-semibold text-[#8E796E]">
            레이어 조합을 확인하는 미리보기예요
          </p>
        </div>
        {!hasProfileSnapshot && (
          <p className="mt-2 px-1 text-center text-[10px] leading-relaxed text-[#A18C80]">
            직접 들어온 화면이라 맛추억은 초기 미리보기 상태로 표시돼요.
          </p>
        )}
      </section>

      <section className="mt-5 px-4" aria-label="런치메이트룸 기능">
        <div
          role="tablist"
          aria-label="런치메이트룸 메뉴"
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
              appliedNotice={appliedNotice}
              onDraftChange={handleDraftChange}
              onApply={handleApplyLoadout}
            />
          )}

          {activeTab === 'room' && (
            <div>
              <h2 className="text-[16px] font-black">방 꾸미기</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-[#927E73]">방 꾸미기 기능을 준비하고 있어요.</p>
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#F0E2DA] bg-[#FFF9F6] p-3">
                <div className="h-16 w-20 shrink-0 rounded-xl p-1.5" style={{ background: skin.frame, boxShadow: skin.frameShadow }}>
                  <div className="flex h-full items-center justify-center rounded-lg" style={{ background: skin.paper }}>
                    <span className="text-[23px]" aria-hidden="true">{skin.emoji}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-[#AA8C7C]">현재 방 스킨</p>
                  <p className="mt-0.5 truncate text-[14px] font-black text-[#49372E]">{skin.name}</p>
                  <span className="mt-1 inline-flex rounded-full bg-[#F4E9E2] px-2 py-0.5 text-[8px] font-bold text-[#937A6C]">준비 중</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tastebook' && (
            <div>
              <h2 className="text-[16px] font-black">맛도감</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-[#927E73]">
                런치메이트에게 나눈 음식 기록이 여기에 모일 예정이에요.
              </p>
              <div className="mt-4 grid grid-cols-4 gap-2" aria-label="음식 8종 준비 중">
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
                    <p className="text-[9px] font-bold text-[#B08169]">현재 Preview Level</p>
                    <p className="mt-0.5 text-[16px] font-black">Lv.{progressSnapshot.level} {progressSnapshot.levelName}</p>
                  </div>
                  <p className="text-[14px] font-black text-[#E85053]">{progressSnapshot.totalXp} XP</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F0DDD2]" role="progressbar" aria-label="맛추억 미리보기 진행도" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressSnapshot.progressPercent)}>
                  <div className="h-full rounded-full bg-[#E85053]" style={{ width: `${progressSnapshot.progressPercent}%` }} />
                </div>
                <p className="mt-2 text-[9px] font-semibold text-[#9A8377]">
                  {progressSnapshot.isMaxLevel ? '현재 Preview 최고 Level이에요' : `다음 Level까지 ${progressSnapshot.xpRemainingToNextLevel} XP`}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-[#EEE2DB] px-3 py-2.5 text-[10px]">
                <span className="font-bold text-[#725E53]">최근 Level 기록</span>
                <span className="text-[#B09A8E]">준비 중</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-4 mt-4 flex items-center gap-3 rounded-[22px] border border-[#F0D8CC] bg-[#FFF7F2] p-4 shadow-sm" aria-labelledby="foodie-room-next-reward-title">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#D87756] shadow-sm" aria-hidden="true">
          <Gift size={21} />
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
