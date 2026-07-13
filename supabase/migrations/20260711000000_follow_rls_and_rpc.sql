-- 팔로우 기능 Phase 0 · docs/workflow/follow-feature-workflow.md §5
--
-- user_follows 는 이미 존재하지만 RLS ENABLED + 정책 0개 = 전면 거부(deny-all) 상태라
-- 지금은 아무도 팔로우를 걸거나 목록을 읽을 수 없다(§1.2). public.users 도 정책이 없어
-- 동일하게 막혀 있다. 이 마이그레이션은 (1) 그 정책들을 열고, (2) 익명 가입 시
-- public.users 행이 전혀 생기지 않는 문제(실측: auth_users=1, public_users=0, §3)를
-- 프로비저닝 트리거+backfill로 해소하고, (3) 팔로우/언팔로우를 멱등 RPC로 감싼다
-- (commit_course_items 와 동일 사상 — REST insert/delete를 클라이언트가 직접 하지 않음).
--
-- 적용은 안전 게이트 대상(db push/원격 반영) — 이 파일은 생성만 하고 적용하지 않는다.

-- ── user_follows RLS ─────────────────────────────────────────────
-- SELECT: 팔로우 관계는 공개 정보
create policy "user_follows_select" on public.user_follows
  for select using (true);

-- INSERT: 내가 follower 인 행만 (남 이름으로 팔로우 위조 불가)
create policy "user_follows_insert" on public.user_follows
  for insert with check (follower_id = (auth.uid())::text);

-- DELETE: 내가 건 팔로우만 취소 가능
create policy "user_follows_delete" on public.user_follows
  for delete using (follower_id = (auth.uid())::text);

-- ── users RLS ─────────────────────────────────────────────────────
create policy "users_select" on public.users
  for select using (true);

create policy "users_insert" on public.users
  for insert with check (id = (auth.uid())::text);

create policy "users_update" on public.users
  using (id = (auth.uid())::text) with check (id = (auth.uid())::text);

-- ── 프로비저닝 트리거 (§3: public.users 프로비저닝 없음 → 필수) ───────
-- 익명/신규 가입 시 public.users 행을 자동 생성한다(멱등). SECURITY DEFINER 로
-- auth.users insert 트리거 컨텍스트에서도 public.users 에 쓸 수 있게 한다.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, username, created_at)
  values (
    new.id::text,
    'user_' || left(new.id::text, 8),
    now()
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 트리거는 이후 가입에만 작동하므로, 이미 존재하는 auth.users 유저를 한 번 채운다(멱등).
insert into public.users (id, username, created_at)
select u.id::text, 'user_' || left(u.id::text, 8), now()
from auth.users u
left join public.users p on p.id = u.id::text
where p.id is null
on conflict (id) do nothing;

-- ── 팔로우/언팔로우 RPC (멱등 · SECURITY INVOKER로 RLS 그대로 적용) ────
create or replace function public.follow_user(p_following_id text)
returns void language plpgsql security invoker as $$
begin
  if p_following_id = (auth.uid())::text then
    raise exception 'cannot follow yourself';
  end if;
  insert into public.user_follows (id, follower_id, following_id, created_at)
  values (gen_random_uuid()::text, (auth.uid())::text, p_following_id, now())
  on conflict (follower_id, following_id) do nothing;
end; $$;

create or replace function public.unfollow_user(p_following_id text)
returns void language plpgsql security invoker as $$
begin
  delete from public.user_follows
  where follower_id = (auth.uid())::text
    and following_id = p_following_id;
end; $$;

-- anon(익명 세션도 role='authenticated' JWT)/authenticated 가 호출 가능하도록.
-- SECURITY INVOKER 라 RLS(user_follows_insert/delete)는 그대로 강제되므로 권한 우회 아님.
grant execute on function public.follow_user(text)  to anon, authenticated;
grant execute on function public.unfollow_user(text) to anon, authenticated;
