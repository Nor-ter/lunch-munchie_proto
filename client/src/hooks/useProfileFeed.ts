import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { feedPostFromApi, normalizeFeedApiPage } from "@/lib/feedApi";
import { getFeedAuthorFallback, getFeedPostsByAuthor } from "@/lib/profileFeed";

/**
 * 프로필 피드의 단일 조회 경계.
 * 추천 피드의 현재 페이지와 분리된 작성자 전용 서버 타임라인을 조회한다.
 * 따라서 누가 프로필을 보더라도 같은 게시물과 같은 순서를 보게 된다.
 */
export function useProfileFeed(userId: string) {
  const { feedPosts, feedSyncVersion, profile } = useApp();
  const [remotePosts, setRemotePosts] = useState<ReturnType<typeof getFeedPostsByAuthor> | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [error, setError] = useState<Error | null>(null);
  const requestSequence = useRef(0);

  const fallbackPosts = useMemo(
    () => getFeedPostsByAuthor(feedPosts, userId),
    [feedPosts, userId],
  );

  const refresh = useCallback(async () => {
    if (!userId) {
      setRemotePosts([]);
      setIsLoading(false);
      return;
    }

    const sequence = ++requestSequence.current;
    setIsLoading(true);
    setError(null);
    try {
      const posts = [] as ReturnType<typeof getFeedPostsByAuthor>;
      let cursor: string | null = "0";
      // The API caps the canonical author query at 80 posts. Read every page
      // so a profile is not silently truncated to the viewer's feed batch.
      for (let pageNumber = 0; pageNumber < 4 && cursor !== null; pageNumber += 1) {
        const params = new URLSearchParams({ authorId: userId, limit: "20", cursor });
        const response = await fetch(`/api/feed?${params.toString()}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("프로필 피드를 불러오지 못했어요.");
        const page = normalizeFeedApiPage(await response.json());
        posts.push(...page.items.map(item => feedPostFromApi(item, profile)));
        cursor = page.hasMore ? page.nextCursor : null;
      }

      if (sequence !== requestSequence.current) return;
      const uniqueByCourse = new Map<string, (typeof posts)[number]>();
      getFeedPostsByAuthor(posts, userId).forEach((post) => {
        if (!uniqueByCourse.has(post.courseId)) uniqueByCourse.set(post.courseId, post);
      });
      setRemotePosts(Array.from(uniqueByCourse.values()));
    } catch (cause) {
      if (sequence !== requestSequence.current) return;
      setError(cause instanceof Error ? cause : new Error("프로필 피드를 불러오지 못했어요."));
    } finally {
      if (sequence === requestSequence.current) setIsLoading(false);
    }
  }, [profile.emoji, profile.id, profile.name, userId]);

  useEffect(() => {
    void refresh();
  }, [feedSyncVersion, refresh]);

  useEffect(() => {
    const revalidate = () => void refresh();
    const revalidateWhenVisible = () => {
      if (document.visibilityState === "visible") revalidate();
    };
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidateWhenVisible);
    const interval = window.setInterval(revalidate, 30_000);
    return () => {
      requestSequence.current += 1;
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidateWhenVisible);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const posts = remotePosts ?? fallbackPosts;
  const fallbackAuthor = useMemo(
    () => getFeedAuthorFallback(posts.length ? posts : feedPosts, userId),
    [feedPosts, posts, userId],
  );

  return { posts, fallbackAuthor, isLoading, error, refresh };
}
