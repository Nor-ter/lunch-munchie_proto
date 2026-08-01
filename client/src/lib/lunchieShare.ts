export interface LunchieShareParticipant {
  id?: string;
  name: string;
  emoji?: string;
  profileImage?: string | null;
}

export interface LunchieVoteLabelInput {
  winnerId?: string | null;
  finalTally?: Record<string, number> | null;
  finalVotedCount?: number | null;
  likeCount?: number | null;
  totalMembers?: number | null;
  isSolo?: boolean;
}

const FILE_NAME_MAX_LENGTH = 80;
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const DEFAULT_CAPTURE_PIXEL_RATIO = 2;
const MAX_CAPTURE_PIXEL_RATIO = 8;

function trimFilenameEdge(value: string): string {
  return value.replace(/^[.\s-]+|[.\s-]+$/g, '');
}

/**
 * Convert user-provided restaurant names into a portable filename segment.
 * Keeps Korean and emoji intact while removing control/reserved characters.
 */
export function sanitizeLunchieFilenamePart(value: string, fallback = 'lunchie-pick'): string {
  let safe = value
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, '-')
    .replace(/-+/g, '-');

  safe = trimFilenameEdge(safe);
  safe = Array.from(safe).slice(0, FILE_NAME_MAX_LENGTH).join('');
  safe = trimFilenameEdge(safe);

  if (!safe) return fallback;
  if (WINDOWS_RESERVED_NAME.test(safe)) return `${safe}-pick`;
  return safe;
}

export function getRepresentativeMenuLabel(
  menuItems?: readonly { name?: string | null }[] | null,
): string {
  const firstNamedItem = menuItems?.find(item => typeof item.name === 'string' && item.name.trim());
  return firstNamedItem?.name?.trim() || '대표 메뉴 정보 준비 중';
}

export function getLunchieLocationLabel(address?: string | null): string {
  return address?.trim() || '지역 정보 준비 중';
}

export function formatLunchieDateLabel(value: Date | string | number = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '날짜 정보 준비 중';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}

/**
 * Build a truthful result label. Final-round votes take precedence over
 * preliminary likes; malformed or unavailable counts never become a percent.
 */
export function getLunchieVoteLabel({
  winnerId,
  finalTally,
  finalVotedCount,
  likeCount,
  totalMembers,
  isSolo,
}: LunchieVoteLabelInput): string {
  const finalVotes = winnerId ? finalTally?.[winnerId] : undefined;
  if (
    isNonNegativeInteger(finalVotes) &&
    isPositiveInteger(finalVotedCount) &&
    finalVotes <= finalVotedCount
  ) {
    return `${finalVotes} / ${finalVotedCount}명 최종 투표`;
  }

  if (
    isNonNegativeInteger(likeCount) &&
    isPositiveInteger(totalMembers) &&
    likeCount <= totalMembers
  ) {
    return `${likeCount} / ${totalMembers}명 LIKE`;
  }

  return isSolo ? '나의 최종 선택' : '친구들과 함께 고른 최종 선택';
}

export function getLunchieParticipantLabel(
  participants?: readonly LunchieShareParticipant[] | null,
): string {
  const names = (participants ?? [])
    .map(participant => participant.name.trim())
    .filter(Boolean);
  return names.length > 0 ? names.join(' · ') : '참여자 정보 없음';
}

export function chooseShareDelivery(canShareFiles: boolean): 'share' | 'download' {
  return canShareFiles ? 'share' : 'download';
}

/** Resolve a deterministic output width without allowing an excessive canvas scale. */
export function calculateTargetPixelRatio(cssWidth: number, targetWidth = 1080): number {
  if (
    !Number.isFinite(cssWidth) ||
    cssWidth <= 0 ||
    !Number.isFinite(targetWidth) ||
    targetWidth <= 0
  ) {
    return DEFAULT_CAPTURE_PIXEL_RATIO;
  }

  return Math.min(targetWidth / cssWidth, MAX_CAPTURE_PIXEL_RATIO);
}
