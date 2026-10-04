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
  it('초대 가능한 로비도 호스트 한 명으로 솔로 시작할 수 있다', () => {
    const state = getLobbyPresentation({ session: session(30, [host]), currentUserId: host.id });

    expect(state.minParticipants).toBe(1);
    expect(state.canStart).toBe(true);
    expect(state.isFull).toBe(false);
    expect(state.remainingSlots).toBe(29);
    expect(state.ctaLabel).toBe('Start Solo');
    expect(state.statusCopy).toContain('Invite friends');
    expect(state.disabledReason).toBeNull();
  });

  it('링크로 들어온 현재 참여자 수 그대로 시작하며 ready는 gate가 아니다', () => {
    const state = getLobbyPresentation({ session: session(30, [host, guest]), currentUserId: host.id });

    expect(state.canStart).toBe(true);
    expect(state.ctaLabel).toBe('Start with 2 People');
    expect(state.statusCopy).toContain('2 people are here');
    expect(state.members.map(member => member.ready)).toEqual([false, true]);
  });

  it('비호스트에게 시작 권한과 이유를 명확히 보여준다', () => {
    const state = getLobbyPresentation({ session: session(4, [host, guest]), currentUserId: guest.id });

    expect(state.isHost).toBe(false);
    expect(state.canStart).toBe(false);
    expect(state.ctaLabel).toBe('Waiting for Host');
    expect(state.disabledReason).toContain('지민 can start');
  });

  it('새 참여자를 감지하고 정원이 차면 남은 자리를 0으로 제한한다', () => {
    const state = getLobbyPresentation({
      session: session(2, [host, guest]),
      currentUserId: host.id,
      previousMemberIds: [host.id],
    });

    expect(state.recentlyJoinedName).toBe('수아');
    expect(state.statusCopy).toBe('수아 joined!');
    expect(state.isFull).toBe(true);
    expect(state.remainingSlots).toBe(0);
  });

  it('호스트가 멤버 배열 두 번째여도 ID로 정확히 표시한다', () => {
    const state = getLobbyPresentation({ session: session(4, [guest, host]), currentUserId: host.id });

    expect(state.members[0].isHost).toBe(false);
    expect(state.members[1].isHost).toBe(true);
    expect(state.hostName).toBe('지민');
  });

  it('폐기된 참여자 아바타 값만 안전한 기본 이모지로 정규화한다', () => {
    const legacyGuest = { ...guest, emoji: '/assets/Logo%20003%203.png' };
    const state = getLobbyPresentation({ session: session(4, [host, legacyGuest]), currentUserId: host.id });

    expect(state.members.map(member => member.emoji)).toEqual(['😊', '😊']);
  });
});
