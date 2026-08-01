# 팔로우(follower / following) 기능 구현 워크플로우 설계

> Lunchie Munchie · SNS 바이럴 · React Native + Expo
> 대상: 사용자 A가 사용자 B를 **단방향 팔로우**(Instagram/Twitter 방식)
> 백엔드: Supabase (Postgres + RLS + Anonymous Auth)
> 목적: 이 문서를 근거로 Claude Code와 **순차 청크 구현**을 진행한다.

---

## 0. 이 문서의 사용법

1. 현재 DB 실측 상태 파악 (§1) — 이미 조사 완료, 그대로 신뢰
2. 설계 결정 확정 (§2~§5)
3. **선결 확인 1건** (§3) — `public.users` 프로비저닝 여부만 사람이 SQL로 확인
4. Phase 0~5 순차 구현 (§6)
5. 각 Phase의 Claude Code 프롬프트를 그대로 붙여넣어 실행 (§7)
6. 기존 6단계 자율 루프(`.claude/CLAUDE.md`)와 안전 게이트를 그대로 적용 (§8)

스택은 확정 constitution(`TECH_STACK_REQUIREMENTS.md`)을 따른다. **새 라이브러리 도입 금지, 필요 시 제안 후 대기.**

| 레이어 | 확정 스택 |
|---|---|
| 플랫폼 | React Native + Expo, Expo Router |
| 상태 | Zustand(client) + TanStack Query(server) |
| 백엔드 | Supabase (Postgres + RLS + Anonymous Auth) |
| DB 접근 | `@supabase/supabase-js` (PostgREST + RPC) |
| 금지 | Redux, Firebase, axios 직접, styled-components |

---

## 1. 현재 DB 상태 (실측 · `supabase/migrations/20260706123009_remote_schema.sql` 기준)

팔로우 기능의 **테이블 자체는 이미 존재**한다. 새로 만들 게 아니라 **RLS 정책과 접근 경로만 뚫으면 된다.**

### 1.1 `user_follows` — 이미 존재 ✅

```sql
CREATE TABLE public.user_follows (
    id           text NOT NULL,   -- PK, 기본값 없음(생성 주체 정해야 함)
    follower_id  text NOT NULL,   -- 따르는 사람 (auth.uid())
    following_id text NOT NULL,   -- 따라지는 사람
    created_at   timestamp NOT NULL
);
-- PK(id)
-- UNIQUE(follower_id, following_id)      ← 중복 팔로우 방지, 멱등 upsert의 근거
-- INDEX idx_user_follows_follower_id     ← "내가 팔로우한 목록" 쿼리용
-- INDEX idx_user_follows_following_id    ← "나를 팔로우한 목록" 쿼리용
-- RLS: ENABLED
```

### 1.2 지금 막혀 있는 핵심 문제 ⚠️

- **`user_follows` 는 RLS가 켜져 있는데 정책이 하나도 없다.** Postgres에서 *RLS ENABLED + 정책 0개 = 전면 거부(deny-all)*. 즉 현재 anon/authenticated 세션은 **팔로우를 걸 수도, 목록을 읽을 수도 없다.** → §5에서 정책을 추가하는 게 이 작업의 실질적 핵심.
- **`public.users` 도 정책이 없어 동일하게 deny-all.** 팔로워/팔로잉 목록에서 상대 username·프로필 이미지를 보여주려면 users SELECT 정책이 필요하다.
- **`users` 에 `followers_count` / `following_count` 컬럼이 없다.** 카운트는 §2.4처럼 집계 쿼리로 시작한다.
- **FK가 없다**(프로젝트 전역 원칙 §3.4 계승 — 무결성은 앱 책임). `user_follows.follower_id → users.id` 임베드 조인이 안 되므로, 목록은 `itemsApi.ts` 와 동일한 **2쿼리 클라이언트 조인**으로 처리한다.
- **id 타입은 `text`, 소유 판정은 `auth.uid()::text`** 패턴이 프로젝트 전역 규약이다(`courses_modify`, `commit_course_items` 참고).

---

## 2. 설계 결정 (확정)

### 2.1 관계 모델 — 단방향
A→B 팔로우는 독립적. 승인 절차 없음. `user_follows` 한 행 = "follower_id가 following_id를 따른다".

### 2.2 RLS 정책 세트 (§5.1에서 SQL)
- `user_follows` SELECT: **전체 공개**(`using (true)`) — 팔로워/팔로잉 목록은 공개 정보.
- `user_follows` INSERT: `follower_id = auth.uid()::text` 인 행만. → **남 이름으로 팔로우 위조 불가.**
- `user_follows` DELETE: `follower_id = auth.uid()::text` 인 행만. → **내가 건 팔로우만 취소.**
- `users` SELECT: 전체 공개. UPDATE/INSERT: `id = auth.uid()::text` 본인 행만.

### 2.3 팔로우/언팔로우 = 멱등 RPC (`SECURITY INVOKER`)
`course_items` 의 `commit_course_items` 와 동일 사상. REST insert/delete를 클라이언트에서 직접 하지 않고 RPC로 감싼다. 이유:
- **id를 서버에서 생성**(`gen_random_uuid()::text`) → 클라이언트가 id 규칙을 알 필요 없음.
- **멱등성**: `on conflict (follower_id, following_id) do nothing` → 더블탭·재시도에도 중복행/에러 없음.
- **자기 팔로우 차단**을 DB에서 강제(`raise exception`).
- `SECURITY INVOKER` 라 호출자의 RLS(§2.2 INSERT 정책)를 그대로 통과해야 하므로 **권한 우회 없음.**

### 2.4 카운트 전략 — 초기엔 집계 쿼리, 성장 시 승격
`followers_count` 컬럼을 추가하지 않는다. `select count(*)` + 인덱스(`idx_user_follows_following_id`)로 충분히 빠르다.
- 팔로워 수: `count(*) where following_id = X`
- 팔로잉 수: `count(*) where follower_id = X`
- 트래픽이 커져 카운트 쿼리가 병목이 되면, **그때** `users`에 카운트 컬럼 + AFTER INSERT/DELETE 트리거로 승격한다(§5.3에 승격용 마이그레이션 초안 첨부, 지금은 적용 안 함). *조기 비정규화 = 드리프트 위험*이므로 미룬다.

### 2.5 무결성은 앱 책임 (§3.4 계승)
FK가 없으므로 목록 조인 시 상대 `users` 행이 없을 수 있다(orphan). `itemsApi.getItems` 처럼 **orphan은 목록에서 제외**하거나 fallback 표시한다.

---

## 3. 선결 확인 결과 — `public.users` 프로비저닝 **없음 → 트리거 필수** ✅확정

익명 로그인은 `auth.users` 에 uid만 만든다. **`public.users` 행은 자동으로 생기지 않는다.** 팔로워 목록에서 상대 username을 보여주려면 `public.users` 에 행이 있어야 한다.

측정 결과(2026-07-10):

```
auth_users = 1,  public_users = 0
```

→ **프로비저닝이 전혀 없다. §5.2 `handle_new_user` 트리거는 필수로 적용한다.** 트리거는 *이후* 가입에만 작동하므로, **이미 존재하는 익명 유저 1명은 §5.2.1 backfill로 채운다**(안 하면 그 유저는 팔로우 목록에서 orphan으로 사라짐).

---

## 4. 아키텍처 (레이어)

```
┌──────────────────────────────────────────────────────────┐
│ UI (Expo Router screens / components)                     │
│  FollowButton · FollowerListSheet · ProfileStats          │
└───────────────┬──────────────────────────┬────────────────┘
                │ hooks (TanStack Query)    │
        useIsFollowing / useToggleFollow / useFollowCounts / useFollowList
                │                           │
┌───────────────▼──────────────────────────▼────────────────┐
│ service layer  services/followsApi.ts (순수함수·React비의존)│
│  followUser · unfollowUser · getIsFollowing                │
│  getFollowCounts · getFollowers · getFollowing             │
└───────────────┬──────────────────────────┬────────────────┘
                │ supabase-js               │
        rpc('follow_user') / rpc('unfollow_user')   .from('user_follows'/'users')
                │                           │
┌───────────────▼──────────────────────────▼────────────────┐
│ Supabase Postgres  (RLS 강제)                              │
│  user_follows · users · follow_user()/unfollow_user() RPC  │
└────────────────────────────────────────────────────────────┘
```

---

## 5. 스키마 변경 (마이그레이션)

새 마이그레이션 파일 하나로 묶는다: `supabase/migrations/<타임스탬프>_follow_rls_and_rpc.sql`.
**적용은 안전 게이트 대상**(마이그레이션 push) — 실행 전 사람 승인. 로컬 `supabase db push`/원격 적용 전에 SQL Editor에서 먼저 검증 권장.

### 5.1 RLS 정책 (필수)

```sql
-- ── user_follows ──────────────────────────────────────────────
-- SELECT: 팔로우 관계는 공개
create policy "user_follows_select" on public.user_follows
  for select using (true);

-- INSERT: 내가 follower 인 행만 (남 이름으로 위조 불가)
create policy "user_follows_insert" on public.user_follows
  for insert with check (follower_id = (auth.uid())::text);

-- DELETE: 내가 건 팔로우만 취소
create policy "user_follows_delete" on public.user_follows
  for delete using (follower_id = (auth.uid())::text);

-- ── users ─────────────────────────────────────────────────────
create policy "users_select" on public.users
  for select using (true);

create policy "users_insert" on public.users
  for insert with check (id = (auth.uid())::text);

create policy "users_update" on public.users
  using (id = (auth.uid())::text) with check (id = (auth.uid())::text);
```

### 5.2 프로비저닝 트리거 (§3 확인 결과 → **필수 적용**)

```sql
-- 익명/신규 가입 시 public.users 행 자동 생성 (멱등)
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
```

#### 5.2.1 기존 유저 backfill (트리거는 이후 가입에만 작동)
현재 `auth.users` 에 있고 `public.users` 에 없는 유저를 한 번 채운다(멱등).

```sql
insert into public.users (id, username, created_at)
select u.id::text, 'user_' || left(u.id::text, 8), now()
from auth.users u
left join public.users p on p.id = u.id::text
where p.id is null
on conflict (id) do nothing;
```

### 5.3 팔로우/언팔로우 RPC (필수)

```sql
-- 팔로우 (멱등 · 자기팔로우 차단 · SECURITY INVOKER로 RLS 그대로 적용)
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

-- 언팔로우 (멱등)
create or replace function public.unfollow_user(p_following_id text)
returns void language plpgsql security invoker as $$
begin
  delete from public.user_follows
  where follower_id = (auth.uid())::text
    and following_id = p_following_id;
end; $$;

grant execute on function public.follow_user(text)  to anon, authenticated;
grant execute on function public.unfollow_user(text) to anon, authenticated;
```

### 5.4 (미적용·참고) 카운트 비정규화 승격안
성장 후 카운트 쿼리가 병목이면 아래를 별도 마이그레이션으로 적용한다. **지금은 넣지 않는다**(§2.4).

```sql
-- alter table public.users add column followers_count int not null default 0;
-- alter table public.users add column following_count int not null default 0;
-- AFTER INSERT/DELETE ON user_follows 트리거로 following_id/follower_id 각각 ±1.
```

---

## 6. Phase 순차 구현 (0~5)

각 Phase는 독립 커밋 단위. 앞 Phase 검증 후 다음으로.

| Phase | 산출물 | 검증 게이트 |
|---|---|---|
| 0 | 마이그레이션(§5.1 RLS + §5.3 RPC [+ §5.2]) | SQL Editor에서 정책/RPC 동작 확인 |
| 1 | `types/db.ts` + `shared/schema.ts` 에 `user_follows`, `users` 타입 동기화 | 타입체크 통과 |
| 2 | `services/followsApi.ts` (순수함수 6종) | 단위 호출로 RPC/쿼리 왕복 확인 |
| 3 | `hooks/useFollow*.ts` (TanStack Query) | queryKey 무효화 동작 |
| 4 | UI: `FollowButton` · `ProfileStats` · `FollowerListSheet` | 화면에서 팔로우 토글 |
| 5 | 검증 루프 (`backend-verifier` + 화면-우회 SQL) | GATE(`security-auditor`) PASS |

### 6.1 Phase 2 — `services/followsApi.ts` 인터페이스(확정)

```ts
// 모두 순수함수, React 비의존 (coursesApi.ts / itemsApi.ts 패턴)
followUser(followingId: string): Promise<void>          // rpc('follow_user')
unfollowUser(followingId: string): Promise<void>        // rpc('unfollow_user')
getIsFollowing(followingId: string): Promise<boolean>   // exists 쿼리
getFollowCounts(userId: string): Promise<{ followers: number; following: number }>
getFollowers(userId: string): Promise<User[]>           // 2쿼리 조인, orphan 제외
getFollowing(userId: string): Promise<User[]>           // 2쿼리 조인, orphan 제외
```

`getFollowers` 조인 규칙(§2.5): `user_follows.where(following_id=userId)` → `follower_id[]` → `users.in(id, ...)` → orphan(users 행 없음) 제외.

### 6.2 Phase 3 — hooks(TanStack Query · `useItems.ts` 패턴)

- `useIsFollowing(followingId)` — `queryKey: ['isFollowing', myId, followingId]`
- `useFollowCounts(userId)` — `queryKey: ['followCounts', userId]`
- `useFollowers(userId)` / `useFollowing(userId)` — `queryKey: ['followers'|'following', userId]`
- `useToggleFollow(followingId)` — `useMutation`, **낙관적 업데이트**(버튼 즉시 토글) + 실패 시 롤백 + 성공/정착 시 `['isFollowing', ...]`·`['followCounts', followingId]` 무효화.

---

## 7. Claude Code 실행 프롬프트 (Phase별 · 참고파일 명시)

> 각 블록을 **하나씩** Claude Code에 붙여넣는다. 앞 Phase가 검증 통과한 뒤 다음으로.
> 파괴적/배포/마이그레이션 명령은 `.claude/hooks/safety-gate.sh` 가 가로채 승인을 요구한다.

### Phase 0 — 마이그레이션 (RLS + RPC)
```
docs/workflow/follow-feature-workflow.md 의 §5 를 읽어.
supabase/migrations/ 에 새 파일 `<현재타임스탬프>_follow_rls_and_rpc.sql` 을 만들고
§5.1(RLS 정책), §5.2(handle_new_user 트리거)+§5.2.1(backfill), §5.3(follow/unfollow RPC)의
SQL을 그대로 넣어라. (public_users=0 확인됨 → 트리거·backfill 필수.)
참고: supabase/migrations/20260707000000_commit_course_items_rpc.sql (RPC·grant 패턴),
      supabase/migrations/20260706123009_remote_schema.sql (기존 정책 네이밍/auth.uid()::text 규약).
마이그레이션 적용(db push/원격) 명령은 실행하지 말고, 파일만 만든 뒤 나에게 SQL Editor 검증용
확인 쿼리(정책 존재·RPC 동작)를 제시해.
```

### Phase 1 — 타입 동기화
```
docs/workflow/follow-feature-workflow.md §1.1, §2 를 읽어.
mobile/types/db.ts 에 UserFollow, User(=public.users 행) 인터페이스를 추가해라
(컬럼: users= id/username/profile_image_url/bio/location/created_at,
 user_follows= id/follower_id/following_id/created_at). 기존 Course/Restaurant 타입 스타일 그대로.
그리고 shared/schema.ts 에 drizzle `userFollows` pgTable 정의를 추가해 remote_schema.sql 과 1:1 동기화해라
(users 테이블은 이미 있으니 그대로). 새 라이브러리 금지.
참고: mobile/types/db.ts, shared/schema.ts.
```

### Phase 2 — service layer
```
docs/workflow/follow-feature-workflow.md §6.1 을 읽어.
mobile/services/followsApi.ts 를 만들고 6개 순수함수(followUser, unfollowUser, getIsFollowing,
getFollowCounts, getFollowers, getFollowing)를 구현해라.
- followUser/unfollowUser 는 supabase.rpc('follow_user'|'unfollow_user', { p_following_id }).
- getFollowers/getFollowing 은 FK가 없으니 itemsApi.getItems 처럼 2쿼리 클라이언트 조인 + orphan 제외.
- 카운트는 count 집계 쿼리(head:true, count:'exact').
React/hook 의존 금지(순수함수). 참고: mobile/services/itemsApi.ts, mobile/services/coursesApi.ts, mobile/lib/supabase.ts.
```

### Phase 3 — hooks
```
docs/workflow/follow-feature-workflow.md §6.2 를 읽어.
mobile/hooks/ 에 useIsFollowing, useFollowCounts, useFollowers, useFollowing, useToggleFollow 를 만들어라.
useToggleFollow 는 useMutation + 낙관적 업데이트(버튼 즉시 토글) + 실패 롤백 + 성공 시
['isFollowing', ...], ['followCounts', followingId] 무효화. queryKey 는 §6.2 그대로.
참고: mobile/hooks/useItems.ts, mobile/hooks/useCourse.ts.
```

### Phase 4 — UI
```
docs/workflow/follow-feature-workflow.md §4 를 읽어.
NativeWind 로 아래 3개 컴포넌트를 만들어라(새 라이브러리 금지):
- components/FollowButton.tsx  : useToggleFollow + useIsFollowing. 팔로우/팔로잉 상태 토글, 로딩 중 disable.
- components/ProfileStats.tsx  : useFollowCounts 로 "팔로워 N · 팔로잉 M" 표시, 탭 시 목록 열기.
- components/FollowerListSheet.tsx : useFollowers/useFollowing 목록(아바타+username), 각 행에 FollowButton.
참고: mobile/components/ 기존 컴포넌트 스타일, mobile/app/course/[id]/edit.tsx (hook 사용 패턴).
```

### Phase 5 — 검증
```
/resolve-issue 를 쓰지 말고, docs/workflow/follow-feature-workflow.md §8 의 검증 절차만 수행해:
1) backend-verifier 서브에이전트로 화면-우회 검증(§8.1 SQL 레시피).
2) security-auditor 서브에이전트로 GATE. PASS 전엔 완료 선언 금지.
3) 결과를 docs/workflow/google-maps-integration-work-log.md 에 append.
```

---

## 8. 루프 / 게이트 규칙 (기존 시스템 연결)

이 기능도 `.claude/CLAUDE.md` 의 6단계 루프·안전 게이트를 그대로 따른다.

### 8.1 화면-우회 검증 레시피 (UI 없이 백엔드 독립 검증)
```
1. 익명 세션 2개 확보(기기 A=uid_a, 기기 B=uid_b) 또는 SQL로 auth.users에서 uid 2개 선택.
2. A로 로그인한 상태에서 rpc('follow_user', { p_following_id: uid_b }) 호출 → user_follows 1행 생성 확인.
3. 같은 호출 재실행 → 여전히 1행(멱등 확인, on conflict do nothing).
4. rpc('follow_user', { p_following_id: uid_a })(자기팔로우) → 예외 발생 확인.
5. B 세션에서 A의 follower 행을 delete 시도 → RLS로 0 rows(위조 취소 불가) 확인.
6. select count(*) where following_id=uid_b → 1 (카운트 경로 확인).
7. rpc('unfollow_user', { p_following_id: uid_b }) → 0행 (멱등 언팔로우).
8. 테스트로 만든 행은 사이클 끝에 정리. 웹 프로토타입으로 만들지 말 것(인증 흐름 상이).
```

### 8.2 안전 게이트 (실행 전 사람 승인)
`supabase db push` / `db reset` / 마이그레이션 적용·revert / `functions deploy` 는 승인 대상.
자율 허용: SQL **읽기**·정책 조회, 로컬 테스트 insert/delete, 코드 편집.

### 8.3 멈춤 규칙
- INSERT가 `42501`(RLS 위반)로 계속 실패 → §5.1 INSERT 정책의 `with check` 와 클라이언트가 보내는 `follower_id` 가 `auth.uid()::text` 와 일치하는지 확인(대개 세션 미확보 = `auth.uid()` null).
- 팔로워 목록이 비어 보임 → §3 `public.users` 프로비저닝 문제. orphan 제외로 전부 걸러진 것.
- 같은 층에서 가설 3회 실패 → 사람에게 요약 보고 후 대기.

### 8.4 LOG
사이클 종료 시 `docs/workflow/google-maps-integration-work-log.md` 에
`팔로우 기능 · Phase N → 확인한 원인/검증 → 결과 → 남은 TODO` 로 append.

---

## 9. 완료 정의 (DoD)
- [ ] §5.1 RLS 정책 6개 적용, SQL Editor에서 위조/취소 방어 확인
- [ ] §5.3 follow_user/unfollow_user RPC 멱등·자기팔로우 차단 확인
- [ ] §5.2 프로비저닝 트리거 + §5.2.1 backfill 적용, `public.users` 채워짐(측정: 0→전체)
- [ ] `followsApi.ts` 6함수 + hooks + UI 3컴포넌트
- [ ] 낙관적 업데이트 + 무효화로 버튼 즉시 반응
- [ ] `security-auditor` GATE PASS + work-log append

---

## 10. 로그인 도입 시 영향 (설계: `login-workflow.md`)

팔로우 기능은 **`auth.uid()` 연속성에 전적으로 의존**한다. 모든 팔로우 행(`user_follows.follower_id/
following_id`)과 프로필(`public.users.id`)이 uid에 묶여 있기 때문이다.

- **정상 경로(익명→링킹, uid 보존)**: `linkIdentity(idToken)`로 uid가 유지되면 팔로우 그래프·프로필이
  **무손상**. RLS(`user_follows_insert/delete`, `users_*`)가 전부 `auth.uid()::text` 기반이라 로그인
  후에도 동일하게 동작 — 팔로우 관련 정책/코드 수정 불필요.
- **파국 경로(uid 변경: 충돌→기존 계정 로그인 / fresh 로그인)**: 새 uid가 발급되면 옛 uid의 **팔로우/
  팔로워 그래프와 `public.users` 행이 통째 orphan**. `getFollowers/getFollowing`의 orphan 제외 로직이
  이들을 목록에서 걸러내 사용자에겐 "팔로우가 사라진" 것처럼 보인다. → login-workflow **링크-우선 원칙 +
  충돌 경고**가 방어선.
- **`handle_new_user` 트리거**: 링킹은 `auth.users` INSERT가 아니라 미발화하지만, `public.users` 행은
  익명 생성 때 이미 존재하므로 팔로워 목록 orphan은 생기지 않는다(§3 프로비저닝 전제 유지).
