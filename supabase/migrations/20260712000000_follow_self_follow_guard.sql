-- 팔로우 기능 Phase 5 GATE 발견 대응 · security-auditor 권고
--
-- follow_user RPC는 자기팔로우를 `raise exception`으로 막지만, user_follows 테이블엔
-- 이미 GRANT ALL TO anon, authenticated 가 걸려 있어(20260706123009_remote_schema.sql)
-- 클라이언트가 RPC를 우회해 PostgREST로 직접 insert하면 user_follows_insert RLS
-- (follower_id = auth.uid() 만 검사, following_id 는 무관)를 그대로 통과해 자기팔로우
-- 행이 생성될 수 있었다. follower_id 는 여전히 auth.uid() 로 강제되므로 사칭/권한상승은
-- 아니지만(팔로워 카운트 정합성 문제), 어떤 접근 경로(RPC/PostgREST/직접 SQL)로도 절대
-- 뚫리지 않도록 RLS 정책이 아니라 테이블 CHECK 제약으로 막는다.
alter table public.user_follows
  add constraint user_follows_no_self_follow check (follower_id <> following_id);
