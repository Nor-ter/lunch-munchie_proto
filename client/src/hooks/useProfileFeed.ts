import { useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { getFeedAuthorFallback, getFeedPostsByAuthor } from "@/lib/profileFeed";

/**
 * 프로필 피드의 단일 조회 경계.
 * 현재는 AppContext의 로컬 피드를 사용하며, DB 피드 테이블 연결 시 이 훅의 데이터 소스만
 * author_id 조건 쿼리로 교체하면 프로필 화면은 그대로 유지된다.
 */
export function useProfileFeed(userId: string) {
  const { feedPosts } = useApp();

  return useMemo(
    () => ({
      posts: getFeedPostsByAuthor(feedPosts, userId),
      fallbackAuthor: getFeedAuthorFallback(feedPosts, userId),
    }),
    [feedPosts, userId],
  );
}

