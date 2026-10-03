import type { GroupSession, SessionMember } from '@/contexts/AppContext';
import { normalizeLunchieSessionAvatar } from '@shared/lunchieAvatar';

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
  statusLabel: 'Waiting' | 'In Progress';
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
    emoji: normalizeLunchieSessionAvatar(member.emoji),
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
  const hostName = members.find(member => member.isHost)?.name ?? 'Host';

  const previousIds = previousMemberIds ? new Set(previousMemberIds) : null;
  const recentlyJoinedName = previousIds
    ? members.find(member => !previousIds.has(member.id))?.name ?? null
    : null;

  let statusCopy: string;
  if (!isWaiting) {
    statusCopy = 'Voting has started. Choose together with your friends.';
  } else if (recentlyJoinedName) {
    statusCopy = `${recentlyJoinedName} joined!`;
  } else if (isFull) {
    statusCopy = 'Everyone is here. You can start voting now.';
  } else if (capacity === 1) {
    statusCopy = 'Ready to go. You can start voting now.';
  } else {
    statusCopy = `Waiting for participants. Currently ${memberCount} participants`;
  }

  let ctaLabel: string;
  let disabledReason: string | null = null;
  if (!isWaiting) {
    ctaLabel = 'Start Swiping';
  } else if (!isHost) {
    ctaLabel = 'Waiting for Host';
    disabledReason = `${hostName} can start the vote.`;
  } else {
    ctaLabel = 'Start Voting';
    if (memberCount < minParticipants) {
      disabledReason = `Voting needs at least ${minParticipants} people.`;
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
    statusLabel: isWaiting ? "Waiting" : "In Progress",
    statusCopy,
    ctaLabel,
    disabledReason,
    recentlyJoinedName,
    members,
  };
}
