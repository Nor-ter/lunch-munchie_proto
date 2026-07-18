import type { GroupSession, SessionMember } from '../contexts/AppContext';
import { getLobbyPresentation } from './lobbyPresentation';

const host: SessionMember = {
  id: 'host-id',
  name: '지민',
  emoji: '😊',
  hasVoted: false,
  preferences: [],
  ready: false,
};

const guest: SessionMember = {
  id: 'guest-id',
  name: '수아',
  emoji: '🍜',
  hasVoted: false,
  preferences: [],
  ready: true,
};

function session(
  capacity: number,
  members: SessionMember[],
  overrides: Partial<Pick<GroupSession, 'hostId' | 'status'>> = {},
): Pick<GroupSession, 'filters' | 'hostId' | 'members' | 'status'> {
  return {
    hostId: overrides.hostId ?? host.id,
    status: overrides.status ?? 'waiting',
    members,
    filters: {
      partySize: capacity,
      dietary: [],
      budget: 2,
      radius: 1000,
      categories: [],
    },
  };
}

describe('getLobbyPresentation', () => {
  it('solo 방은 한 명으로 시작할 수 있다', () => {
    const state = getLobbyPresentation({ session: session(1, [host]), currentUserId: host.id });

    expect(state.minParticipants).toBe(1);
    expect(state.canStart).toBe(true);
    expect(state.isFull).toBe(true);
    expect(state.disabledReason).toBeNull();
  });

  it('그룹 방은 한 명일 때 최소 인원 미달이다', () => {
    const state = getLobbyPresentation({ session: session(4, [host]), currentUserId: host.id });

    expect(state.minParticipants).toBe(2);
    expect(state.canStart).toBe(false);
    expect(state.remainingSlots).toBe(3);
    expect(state.disabledReason).toContain('최소 2명');
  });

  it('그룹 방의 호스트는 두 명부터 시작할 수 있고 ready는 gate가 아니다', () => {
    const state = getLobbyPresentation({ session: session(4, [host, guest]), currentUserId: host.id });

    expect(state.canStart).toBe(true);
    expect(state.members.map(member => member.ready)).toEqual([false, true]);
  });

  it('비호스트에게 시작 권한과 이유를 명확히 보여준다', () => {
    const state = getLobbyPresentation({ session: session(4, [host, guest]), currentUserId: guest.id });

    expect(state.isHost).toBe(false);
    expect(state.canStart).toBe(false);
    expect(state.ctaLabel).toBe('호스트를 기다리는 중');
    expect(state.disabledReason).toContain('지민님만');
  });

  it('새 참여자를 감지하고 정원이 차면 남은 자리를 0으로 제한한다', () => {
    const state = getLobbyPresentation({
      session: session(2, [host, guest]),
      currentUserId: host.id,
      previousMemberIds: [host.id],
    });

    expect(state.recentlyJoinedName).toBe('수아');
    expect(state.statusCopy).toBe('수아님이 참여했어요!');
    expect(state.isFull).toBe(true);
    expect(state.remainingSlots).toBe(0);
  });

  it('호스트가 멤버 배열 두 번째여도 ID로 정확히 표시한다', () => {
    const state = getLobbyPresentation({ session: session(4, [guest, host]), currentUserId: host.id });

    expect(state.members[0].isHost).toBe(false);
    expect(state.members[1].isHost).toBe(true);
    expect(state.hostName).toBe('지민');
  });
});
