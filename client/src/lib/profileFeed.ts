import type { FeedPost } from "@/contexts/AppContext";
import type { User } from "@/types/db";

export interface FeedAuthorFallback {
  user: User;
  emoji: string;
}

function stableAuthorKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

/**
 * 과거 로컬 피드에는 authorId가 없을 수 있다. DB 연결 전에도 같은 작성자가 항상 같은
 * 프로필 URL을 갖도록 안정적인 로컬 ID를 만들고, DB authorId가 생기면 그대로 우선한다.
 */
export function resolveFeedAuthorId(post: FeedPost) {
  return (
    post.authorId?.trim() ||
    `local-user-${stableAuthorKey(post.authorName.trim().toLocaleLowerCase())}`
  );
}

export function getFeedPostsByAuthor(posts: FeedPost[], userId: string) {
  return posts
    .filter((post) => resolveFeedAuthorId(post) === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function getFeedAuthorFallback(
  posts: FeedPost[],
  userId: string,
): FeedAuthorFallback | null {
  const post = posts.find((item) => resolveFeedAuthorId(item) === userId);
  if (!post) return null;

  return {
    user: {
      id: userId,
      username: post.authorName.replace(/^@/, ""),
      profile_image_url: post.authorImage ?? null,
      bio: null,
      location: null,
      created_at: post.createdAt,
    },
    emoji: post.authorImage ? post.authorName.replace(/^@/, "").slice(0, 1) : post.authorEmoji,
  };
}

