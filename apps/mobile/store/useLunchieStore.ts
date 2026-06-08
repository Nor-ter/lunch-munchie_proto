import { create } from 'zustand';
import { createSwipeRecord, restaurants, rankLunchieResults, type Restaurant, type SwipeRecord } from '@/lib/shared';

type Phase = 'preliminary' | 'final' | 'result';

interface LunchieStore {
  inviteCode: string;
  participants: string[];
  candidates: Restaurant[];
  finalCandidates: Restaurant[];
  swipeRecords: SwipeRecord[];
  phase: Phase;
  addParticipant: (name: string) => void;
  addSwipe: (restaurantId: string, action: 'LIKE' | 'DISLIKE') => void;
  advanceRound: () => void;
  reset: () => void;
}

const initialCandidates = restaurants.slice(0, 4);

export const useLunchieStore = create<LunchieStore>((set, get) => ({
  inviteCode: 'LM-0523',
  participants: ['HI', 'JP', 'SJ', 'TL'],
  candidates: initialCandidates,
  finalCandidates: initialCandidates.slice(0, 2),
  swipeRecords: [],
  phase: 'preliminary',
  addParticipant: (name) => set((state) => ({ participants: state.participants.includes(name) ? state.participants : [...state.participants, name] })),
  addSwipe: (restaurantId, action) => set((state) => ({
    swipeRecords: [
      ...state.swipeRecords,
      createSwipeRecord({ sessionId: state.inviteCode, userId: 'demo-user', restaurantId, round: state.phase === 'preliminary' ? 1 : 2, swipeAction: action }),
    ],
  })),
  advanceRound: () => {
    const state = get();
    if (state.phase === 'preliminary') {
      const ranked = rankLunchieResults(state.swipeRecords, state.candidates)
        .slice(0, 2)
        .map((result) => state.candidates.find((candidate) => candidate.id === result.restaurantId))
        .filter((candidate): candidate is Restaurant => Boolean(candidate));
      set({ phase: 'final', finalCandidates: ranked.length ? ranked : state.candidates.slice(0, 2) });
      return;
    }
    set({ phase: 'result' });
  },
  reset: () => set({ candidates: initialCandidates, finalCandidates: initialCandidates.slice(0, 2), swipeRecords: [], phase: 'preliminary' }),
}));
