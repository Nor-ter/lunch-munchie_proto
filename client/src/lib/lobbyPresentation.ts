import type { GroupSession, SessionMember } from '@/contexts/AppContext';

type LobbySession = Pick<GroupSession, 'filters' | 'hostId' | 'members' | 'status'>;

export interface LobbyMemberPresentation {
  id: string;
  name: string;
  emoji: string;
  ready: boolean;
  isHost: boolean;
  isCurrentUser: boolean;
}

export interface LobbyPresentation {
  capacity: number;
  minParticipants: number;
  memberCount: number;
  remainingSlots: number;
  isFull: boolean;
  isHost: boolean;
  isWaiting: boolean;
  canStart: boolean;
  hostName: string;
  statusLabel: '대기 중' | '진행 중';
  statusCopy: string;
  ctaLabel: string;
  disabledReason: string | null;
  recentlyJoinedName: string | null;
  members: LobbyMemberPresentation[];
}

export interface GetLobbyPresentationOptions {
  session: LobbySession;
  currentUserId: string;
  previousMemberIds?: readonly string[];
}

function validCapacity(value: number): number {
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

function memberPresentation(
  member: SessionMember,
  hostId: string,
  currentUserId: string,
): LobbyMemberPresentation {
  return {
    id: member.id,
    name: member.name,
    emoji: member.emoji,
    ready: Boolean(member.ready),
    isHost: member.id === hostId,
    isCurrentUser: member.id === currentUserId,
  };
}

/**
 * Lobby-only presentation state.
 *
 * `partySize` is the room capacity, not a required headcount. A solo room can
 * start with one member; a group room needs two. Ready state remains display
 * information and intentionally never gates the existing start flow.
 */
export function getLobbyPresentation({
  session,
  currentUserId,
  previousMemberIds,
}: GetLobbyPresentationOptions): LobbyPresentation {
  const capacity = validCapacity(session.filters.partySize);
  const minParticipants = capacity === 1 ? 1 : 2;
  const memberCount = session.members.length;
  const remainingSlots = Math.max(capacity - memberCount, 0);
  const isFull = remainingSlots === 0;
  const isHost = session.hostId === currentUserId;
  const isWaiting = session.status === 'waiting';
  const canStart = isWaiting && isHost && memberCount >= minParticipants;
  const members = session.members.map(member => memberPresentation(member, session.hostId, currentUserId));
  const hostName = members.find(member => member.isHost)?.name ?? '호스트';

  const previousIds = previousMemberIds ? new Set(previousMemberIds) : null;
  const recentlyJoinedName = previousIds
    ? members.find(member => !previousIds.has(member.id))?.name ?? null
    : null;

  let statusCopy: string;
  if (!isWaiting) {
    statusCopy = '투표가 시작됐어요. 친구들과 함께 선택해 주세요.';
  } else if (recentlyJoinedName) {
    statusCopy = `${recentlyJoinedName}님이 참여했어요!`;
  } else if (isFull) {
    statusCopy = '모두 모였어요. 이제 투표를 시작할 수 있어요.';
  } else if (capacity === 1) {
    statusCopy = '준비가 끝났어요. 바로 투표를 시작할 수 있어요.';
  } else {
    statusCopy = `참여자를 기다리고 있어요. 현재 ${memberCount}명 참여 중`;
  }

  let ctaLabel: string;
  let disabledReason: string | null = null;
  if (!isWaiting) {
    ctaLabel = '스와이핑 시작하기';
  } else if (!isHost) {
    ctaLabel = '호스트를 기다리는 중';
    disabledReason = `${hostName}님만 투표를 시작할 수 있어요.`;
  } else {
    ctaLabel = '투표 시작하기';
    if (memberCount < minParticipants) {
      disabledReason = `투표를 시작하려면 최소 ${minParticipants}명이 필요해요.`;
    }
  }

  return {
    capacity,
    minParticipants,
    memberCount,
    remainingSlots,
    isFull,
    isHost,
    isWaiting,
    canStart,
    hostName,
    statusLabel: isWaiting ? '대기 중' : '진행 중',
    statusCopy,
    ctaLabel,
    disabledReason,
    recentlyJoinedName,
    members,
  };
}
