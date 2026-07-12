/**
 * store/editStore.ts — 코스 편집 draft 스토어 (Zustand · client state)
 *
 * 워크플로우 §2/§5. 편집 중 상태는 이 스토어의 draft 에서만 관리하고, "저장" 시점에만
 * Supabase 로 커밋한다(Phase 5). TanStack Query 는 서버 진실을 캐시하고 mutation 후
 * invalidate 한다 — 역할을 분리한다.
 *
 * 상태 형태:
 *   draftItems : CourseItemWithRestaurant[]  — 편집 중인 stop 목록(순서 = 배열 인덱스).
 *                커밋 시 이 순서대로 order_index 를 0..n-1 로 정규화한다(§3.3).
 *   dirty      : boolean — 서버 기준과 달라졌는지(저장 버튼 활성/이탈 경고용).
 *
 * NOTE(Phase 0): 여기는 스캐폴딩이다. 액션 시그니처와 상태 형태를 확정하고, 자명한
 *   상태 전이만 최소 구현한다. order_index 낙관적 재정규화·서버 diff 계산 등 실제
 *   편집 로직은 Phase 2(로컬 편집)/Phase 5(커밋)에서 채운다.
 *
 * 스택: Zustand(확정 스택). 새 라이브러리 없음.
 * (파일 위치: 기존 컨벤션이 store/ 단수라 store/ 에 둔다. 프롬프트의 stores/ 와 다름 — 요약에 명시.)
 */
import { create } from 'zustand';
import type { CourseItemWithRestaurant } from '@/types/db';

export interface EditState {
  /** 편집 중 stop 목록 (배열 순서 = 표시 순서) */
  draftItems: CourseItemWithRestaurant[];
  /** 서버 기준과 달라졌는가 (저장 버튼/이탈 경고) */
  dirty: boolean;

  // ── actions ──────────────────────────────────────────────────────────────
  /** 서버에서 읽은 stop 목록으로 draft 를 초기화 (진입 시 · dirty=false 기준선) */
  setDraft: (items: CourseItemWithRestaurant[]) => void;
  /** 순서 변경 — draggable-flatlist onDragEnd 의 재정렬된 전체 배열을 받는다 */
  reorder: (items: CourseItemWithRestaurant[]) => void;
  /** stop 삭제 (커밋 전 · 낙관적) */
  removeItem: (courseItemId: string) => void;
  /** stop 추가 (place-details 스냅샷 후 · Phase 4) */
  addItem: (item: CourseItemWithRestaurant) => void;
  /** 삭제 Undo(Phase 5) — 원래 인덱스에 되돌려 넣는다 */
  insertItemAt: (item: CourseItemWithRestaurant, atIndex: number) => void;
  /** 커밋 성공 시(Phase 5) — dirty=false 로만 전환(draft는 서버 반영 결과와 이미 일치) */
  markCommitted: () => void;
  /** draft 폐기 후 초기 상태로 */
  reset: () => void;
}

const initialState: Pick<EditState, 'draftItems' | 'dirty'> = {
  draftItems: [],
  dirty: false,
};

// order_index 를 배열 순서대로 0..n-1 로 재부여(낙관적). 커밋(Phase 5)이 이 값을 그대로 저장.
// (§3.3: unique 제약이 없어 offset/gap 트릭 불필요.)
function renumber(items: CourseItemWithRestaurant[]): CourseItemWithRestaurant[] {
  return items.map((it, i) => (it.order_index === i ? it : { ...it, order_index: i }));
}

export const useEditStore = create<EditState>((set) => ({
  ...initialState,

  // 서버 데이터로 draft 초기화 — 순서는 이미 order_index asc 이므로 그대로, dirty=false 기준선.
  setDraft: (items) => set({ draftItems: items, dirty: false }),

  // draggable-flatlist onDragEnd 의 재정렬 배열 → order_index 재계산 + dirty.
  reorder: (items) => set({ draftItems: renumber(items), dirty: true }),

  // 삭제 후 남은 항목 order_index 재정규화(낙관적).
  removeItem: (courseItemId) =>
    set((s) => ({
      draftItems: renumber(s.draftItems.filter((it) => it.id !== courseItemId)),
      dirty: true,
    })),

  // 추가(Phase 4) — 끝에 붙이고 order_index 재정규화.
  addItem: (item) =>
    set((s) => ({ draftItems: renumber([...s.draftItems, item]), dirty: true })),

  // 삭제 Undo(Phase 5) — 지정 인덱스에 되돌려 넣고 재정규화. dirty는 그대로 true 유지
  // (삭제 자체가 이미 서버 기준과 달라진 편집 행위이므로, 되돌렸다고 "무편집"은 아니다 —
  // 단, 정확히 원상태로 되돌아온 경우까지 dirty=false로 낮추는 것은 과설계라 생략).
  insertItemAt: (item, atIndex) =>
    set((s) => {
      const next = [...s.draftItems];
      const clampedIndex = Math.max(0, Math.min(atIndex, next.length));
      next.splice(clampedIndex, 0, item);
      return { draftItems: renumber(next), dirty: true };
    }),

  // 커밋(Phase 5) 성공 — order_index 는 이미 renumber로 0..n-1 확정된 상태라 draft 그대로 두고 dirty만 내린다.
  markCommitted: () => set({ dirty: false }),

  reset: () => set(initialState),
}));
