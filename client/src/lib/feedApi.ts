import { normalizeFoodTag } from '@/constants/foodTags';
import type { FeedPost } from '@/contexts/AppContext';

export type FeedViewerIdentity = {
  id: string;
  name: string;
  emoji: string;
};

export type FeedApiPage = {
  items: unknown[];
  nextCursor: string | null;
  hasMore: boolean;
  policyVersion?: string;
};

export function normalizeFeedApiPage(payload: unknown): FeedApiPage {
  if (Array.isArray(payload)) {
    return { items: payload, nextCursor: null, hasMore: false };
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('피드 형식이 올바르지 않아요.');
  }
  const page = payload as Record<string, unknown>;
  if (!Array.isArray(page.items)) {
    throw new Error('피드 형식이 올바르지 않아요.');
  }
  return {
    items: page.items,
    nextCursor: typeof page.nextCursor === 'string' ? page.nextCursor : null,
    hasMore: page.hasMore === true,
    policyVersion: typeof page.policyVersion === 'string' ? page.policyVersion : undefined,
  };
}

export function feedPostFromApi(value: unknown, viewer: FeedViewerIdentity): FeedPost {
  const feed = (value && typeof value === 'object' ? value : {}) as Record<string, any>;
  const creatorId = typeof feed.creatorId === 'string' ? feed.creatorId : '';
  const photos = (Array.isArray(feed.photos) ? feed.photos : [])
    .filter((photo: unknown): photo is string => typeof photo === 'string')
    .map(photo => photo.startsWith('http') || photo.startsWith('/') ? photo : `/photos/${photo}`);
  const decor = Array.isArray(feed.decor) ? feed.decor : undefined;
  const fallbackName = creatorId === 'user_minji'
    ? '김민지'
    : creatorId === 'user_jenny'
      ? '제니'
      : creatorId === 'user_minsu'
        ? '민수'
        : 'Lunchie 사용자';
  const fallbackEmoji = creatorId === viewer.id
    ? viewer.emoji
    : creatorId === 'user_minji'
      ? '🐰'
      : creatorId === 'user_jenny'
        ? '🍓'
        : creatorId === 'user_minsu'
          ? '🐻'
          : '🐳';

  return {
    id: String(feed.id ?? ''),
    authorId: creatorId,
    authorName: typeof feed.authorName === 'string' && feed.authorName.trim()
      ? feed.authorName
      : creatorId === viewer.id
        ? viewer.name
        : fallbackName,
    authorEmoji: fallbackEmoji,
    authorImage: typeof feed.authorImage === 'string' ? feed.authorImage : undefined,
    courseId: String(feed.courseId ?? ''),
    photos,
    templateId: typeof feed.templateId === 'string' ? feed.templateId : undefined,
    decor,
    missingOriginalMedia: photos.length === 0 && (!decor || decor.length === 0),
    caption: typeof feed.description === 'string' ? feed.description : '',
    skinId: 'default',
    likes: Number(feed.likesCount) || 0,
    saves: Number(feed.savesCount) || 0,
    dislikes: 0,
    comments: Array.isArray(feed.comments) ? feed.comments.map((comment: any) => ({
      id: String(comment.id ?? ''),
      authorId: typeof comment.authorId === 'string' ? comment.authorId : undefined,
      authorName: typeof comment.authorName === 'string' ? comment.authorName : 'Lunchie 사용자',
      authorEmoji: typeof comment.authorEmoji === 'string' ? comment.authorEmoji : '🐳',
      parentId: typeof comment.parentId === 'string' ? comment.parentId : undefined,
      text: typeof comment.text === 'string' ? comment.text : '',
      createdAt: typeof comment.createdAt === 'number'
        ? new Date(comment.createdAt).toISOString()
        : String(comment.createdAt ?? ''),
      likes: 0,
      dislikes: 0,
    })) : [],
    tags: Array.isArray(feed.tags)
      ? feed.tags.filter((tag: unknown): tag is string => typeof tag === 'string').map(normalizeFoodTag)
      : [],
    stops: Array.isArray(feed.stops) ? feed.stops.flatMap((stop: any) => {
      const latitude = Number(stop?.restaurant?.latitude);
      const longitude = Number(stop?.restaurant?.longitude);
      return typeof stop?.placeId === 'string' && Number.isFinite(latitude) && Number.isFinite(longitude)
        ? [{ placeId: stop.placeId, latitude, longitude }]
        : [];
    }) : [],
    createdAt: feed.createdAt || new Date(0).toISOString(),
  };
}
