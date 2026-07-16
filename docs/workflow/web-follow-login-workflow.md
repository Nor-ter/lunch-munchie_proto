# 웹(Vite) 팔로우 + Google 로그인 포팅 워크플로우 설계

> Lunchie Munchie · Vite + React(Wouter) + Express · 후속 문서
> 선행(설계 근거): `follow-feature-workflow.md`(RLS/RPC), `follow-screen-wiring-workflow.md`(화면 조립),
> `login-workflow.md`(uid 보존 링킹·충돌 처리·프로필 동기화)
> 목적: mobile(Expo)에 구현·검증 완료된 팔로우 + Google 로그인을 **발표용으로 웹에 먼저** 구현한다
> (추후 RN 재구현 예정 — 그래서 모바일과 같은 Supabase 직접 경로/설계를 유지해 이식성을 보존한다).

---

## 0. 이 문서의 사용법

1. 현재 상태(§1)는 실측 완료 — 그대로 신뢰.
2. 설계 결정(§2)은 사용자 확정 — 재논의 금지.
3. Phase 0~4를 순차 실행(§4). 실행은 `/implement-web-follow [N]` 커맨드로 — 인자 생략 시
   `automation/web-follow-login` 하네스가 구조·fingerprint·검증 증거로 다음 Phase를 판정한다. `/loop`는 선택적 편의 계층이다.
4. 각 Phase는 내장 검증(타입체크 + preview 브라우저 자가 E2E + read-only db query)을 통과해야 완료.
5. `.claude/CLAUDE.md`의 6단계 루프·안전 게이트·"증상 하나=원인 하나 금지" 그대로 적용.

**안전 게이트(사람 승인/실행)**: deps 설치 · 루트 `.env` 쓰기 · Supabase/Google 대시보드 설정 · 커밋(사용자 직접).
**자율 허용**: 코드 편집 · 로컬 check/test/build · preview 브라우저 조작 · 승인된 SELECT-only DB 검증 · dev 서버 기동.

---

## 1. 현재 상태 (실측)

### 1.1 결정적 이점 — 백엔드는 이미 끝나 있다
- 웹 Express의 `DATABASE_URL` = **모바일과 동일한 Supabase Postgres**(`uhtmaklnhhrrjfcfggjx`).
- `user_follows` RLS 6개 + `follow_user`/`unfollow_user` RPC(멱등·자기팔로우 차단) + `handle_new_user`
  프로비저닝 트리거 + self-follow CHECK 제약 — **전부 라이브 적용·실측 검증 완료**(work-log §8~§14).
- → **이번 작업에 DB 마이그레이션 0개.** 순수 프론트 포팅.

### 1.2 웹 클라이언트 현황
- **인증 전무**: `profile.id`는 `generateUserId()` 랜덤 기기 id(`client/src/contexts/AppContext.tsx:510-512`),
  `lm_profile` localStorage 저장. legacy `'me'` id 마이그레이션 로직 존재(`:749-757`) — 신원 통일 시 재활용.
- supabase-js·TanStack Query **없음**. 상태는 AppContext(useState+localStorage) + `/api/*` fetch.
- `ProfilePage.tsx:252-263` — 팔로워 2380/팔로잉 128 **하드코딩 목값**(실데이터 교체 대상).
- 라우트(`App.tsx:46-90`)에 `/profile/:id` 없음. TabBar 5탭(홈/먼치/런치/저장/프로필).
- 스타일: Tailwind v4 인라인 + shadcn/ui(`client/src/components/ui/*`) + framer-motion + sonner. coral `#EB5053`.
- Manus OAuth 잔재(`const.ts getLoginUrl`, `ManusDialog.tsx`)는 미배선 죽은 코드 — 사용·정리 모두 이번 스코프 밖.

### 1.3 모바일 쪽 이식 원본 (이 세션에서 구현·검증 완료)
| 원본 | 내용 | 이식 방식 |
|---|---|---|
| `mobile/services/followsApi.ts` | 순수 supabase-js 7함수(getCurrentUserId/getUser/follow/unfollow/isFollowing/counts/followers/following) | **거의 그대로**(import 경로만) |
| `mobile/services/authApi.ts` | linkOrSignIn·충돌 2단계·syncProfileIfDefault | **웹 재작성**(id-token→리다이렉트, §2.3) |
| `mobile/hooks/use*.ts` 8종 | TanStack Query, useToggleFollow는 followers/following까지 무효화(버그픽스판) | **거의 그대로** |
| `mobile/components/{FollowButton,ProfileStats,FollowerListSheet,AccountBanner,LoginSheet}.tsx` | RN 컴포넌트 | **Tailwind/DOM 재작성**(shadcn Sheet 재사용) |
| `mobile/lib/supabase.ts` | 클라이언트+ensureAnonymousSession | 웹판(AsyncStorage→기본 localStorage, detectSessionInUrl:true) |

---

## 2. 설계 결정 (사용자 확정)

### 2.1 확정
- **대상**: 기존 Vite 웹(`client/`) — Next.js 아님(확인 완료). mobile/ 무수정.
- **신원 통일**: `profile.id`를 현재 **`auth.uid()`로 멱등 수렴**한다. 최초 legacy id 이전과 이후 auth 전환을 분리하며,
  Google 충돌 계정 전환 시 익명 로컬 데이터를 기존 계정으로 자동 양도하지 않는다.
  내 로컬 피드 게시물 `authorId`도 함께 재작성 — "내 피드"와 "내 팔로워"가 한 신원.
- **로그인 UX**: 프로필 탭 배너 + 로그인 시트(모바일 §과 동일 구성).
- **타인 프로필 진입**: 피드 게시물 작성자 탭 → `/profile/:id`(신규 라우트).

### 2.2 웹 OAuth — 리다이렉트 플로우 (네이티브보다 단순)
- 익명 → 정식: `supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo: origin + '/profile' } })`
  → Google 동의 → Supabase 콜백 → 앱 복귀. **uid 보존 원리는 login-workflow.md §2.2/§3.1과 동일.**
- 웹 클라이언트는 `detectSessionInUrl: true`(기본값) — 복귀 URL의 토큰/에러를 supabase-js가 자동 처리.
- 네이티브의 nonce 제약(Skip-nonce-checks)·시뮬레이터 세션 오염 이슈는 웹에 **해당 없음**.

### 2.3 충돌 처리 — 2단계 유지 (login-workflow.md §2.3 계승)
리다이렉트 복귀 URL에 `error_code=identity_already_exists`(쿼리/해시)가 실려 오면:
1. UI가 "이미 가입된 계정 — 임시 데이터 미승계" 경고 표시(자동 진행 금지).
2. 사용자가 확인하면 `signInWithOAuth({ provider: 'google' })`로 기존 계정 로그인(uid 변경 = 파국 경로 §3.2).
- 프로필 동기화: username이 기본값(`user_<uid8>`)일 때만 provider 이름/아바타 반영(`syncProfileIfDefault` 이식).
  웹 리다이렉트 플로우에선 provider 프로필이 `auth.identities.identity_data`(full_name/avatar_url)로 오므로
  **세션의 `user.identities`에서 읽는다**(모바일처럼 GoogleSignin 응답이 없음).

### 2.4 데이터 경로 — 클라이언트 supabase-js 직접 (서버 확장 없음)
모바일과 동일하게 클라이언트가 anon key + RLS로 직접 호출. Express에 팔로우 엔드포인트를 만들지 않는다
— RLS가 보안 경계이고, 추후 RN 재구현 시 코드 경로가 1:1 대응된다.

---

## 3. 아키텍처

```
client/src/
├── lib/supabase.ts              (신규: 브라우저 클라이언트 + ensureAnonymousSession)
├── components/auth/AuthBootstrap.tsx (세션+uid 수렴 전 자식 query 실행 차단)
├── services/
│   ├── followsApi.ts            (mobile 이식 — 그대로)
│   └── authApi.ts               (웹판: linkIdentityWithGoogle/충돌파싱/signInWithOAuth/…)
├── hooks/                        (mobile 이식 8종 — useCurrentUserId/useAuthStatus/useUser/
│                                  useIsFollowing/useFollowCounts/useFollowers/useFollowing/useToggleFollow)
├── components/
│   ├── follow/ FollowButton · ProfileStats · FollowerListSheet   (Tailwind/DOM 재작성)
│   └── auth/   AccountBanner · LoginSheet                        (Tailwind/DOM 재작성)
└── pages/ ProfilePage(스탯 교체+배선) · OtherProfilePage(신규 /profile/:id)
```
`main.tsx`(또는 App 루트): `QueryClientProvider` + 부팅 익명 세션 + `onAuthStateChange → queryClient.clear()`
(모바일 `_layout.tsx` 패턴 — SIGNED_IN/SIGNED_OUT/USER_UPDATED만).

---

## 4. Phase 순차 구현 (0~4)

| Phase | 산출물(자동 판정 기준) | 검증 게이트 |
|---|---|---|
| 0 | `client/src/lib/supabase.ts` | 브라우저 로드 → auth.users에 익명 유저 실측, profile.id===uid |
| 1 | `client/src/services/followsApi.ts` | `pnpm run check` + 브라우저에서 read RPC 왕복 |
| 2 | `client/src/components/follow/FollowButton.tsx` | 자가 E2E: 카운트/시트/토글 → DB 반영 실측 |
| 3 | `client/src/components/auth/LoginSheet.tsx` | 리다이렉트 진입 확인(클릭스루는 사람) + 복귀 처리 |
| 4 | 전용 work-log 최종 게이트 | web-verifier + web-auth-verifier + web-security-auditor PASS |

### Phase 0 — 기반: supabase-js + 익명 세션 + 신원 통일
- **[게이트]** deps: `pnpm add @supabase/supabase-js @tanstack/react-query` (플랜 승인됨).
- **[게이트]** 루트 `.env`에 추가(.env 쓰기 — 값은 mobile/.env와 동일한 공개 식별자):
  `VITE_SUPABASE_URL=https://uhtmaklnhhrrjfcfggjx.supabase.co`, `VITE_SUPABASE_ANON_KEY=<anon key>`
  (+ `.env.example`에 키 이름만).
- `client/src/lib/supabase.ts`: `createClient(url, anonKey)` — 웹은 storage 기본값(localStorage),
  `detectSessionInUrl: true`(기본). `ensureAnonymousSession()` 이식.
- 부팅 배선: `QueryClientProvider` + 익명 세션 확보 + `onAuthStateChange` 구독(clear).
- **신원 마이그레이션**(AppContext): 세션 확보 후 `profile.id !== uid`이면 transition 종류를 판별해 멱등 수렴한다.
  최초 legacy→anon에서는 내 로컬 피드 authorId를 승계하되, 충돌 계정 전환에서는 자동 양도하지 않는다.
- **auth bootstrap gate**: 익명 세션과 profile uid 수렴 전에 follow query/자식 화면이 실행되지 않게 한다.
- 활성 그룹 세션 중 uid가 바뀌면 host/member identity가 끊길 수 있으므로, 최초 이전 시 로컬 세션도 함께 승계하거나
  안전하게 종료한다. 충돌 계정 전환에서는 서버/로컬 소유권을 자동 양도하지 않는다.
- 검증: preview(`dev`:5173) 로드 → localStorage uid 일치 확인 → 승인된 SELECT-only 경로로 익명 사용자/프로필 실측.

### Phase 1 — 서비스/훅 포팅
- `followsApi.ts` 이식(그대로), `authApi.ts` 웹판(§2.2/§2.3):
  `linkIdentityWithGoogle()` / `parseAuthRedirectError()`(복귀 URL의 error_code 파싱) /
  `confirmConflictSignIn()`(=signInWithOAuth) / `signOutToAnonymous()` / `syncProfileIfDefault()`
  (identity_data에서 full_name/avatar_url 추출).
- hooks 8종 이식 — useToggleFollow는 **모바일 버그픽스판**(isFollowing/followCounts/followers/following 전부 무효화).
- 검증: `pnpm run check` + preview 콘솔에서 `getFollowCounts(실유저uid)` 왕복 확인.

### Phase 2 — 팔로우 UI + 타인 프로필
- `components/follow/` 3종: FollowButton(자기프로필 숨김) · ProfileStats · FollowerListSheet(shadcn Sheet).
- `ProfilePage.tsx:252-263` 하드코딩 스탯 → ProfileStats 교체 + 시트 배선.
- `App.tsx`에 `/profile/:id` 라우트 + `OtherProfilePage`(useUser 헤더 + FollowButton + ProfileStats).
- 피드 작성자 탭 → `/profile/:authorId` 배선(FeedDetailPage·MunchieFeedPage). authorId가 public.users에
  없으면(로컬 목 게시물) "유저를 찾을 수 없어요" 우아한 처리 — 목 게시물 작성자는 실유저가 아님을 감안.
- 실제 공통 진입점은 두 페이지가 공유하는 `FeedPostCard.tsx`다. `authorId` 없는 목 게시물은 클릭을 비활성화하고
  `/profile/undefined`를 만들지 않는다. 소유권 UI는 이름 비교가 아니라 `authorId === auth.uid()`만 사용한다.
- Playwright 전용 config/spec를 추가해 5173에서 route, self-follow 숨김, unknown author, toggle rollback을 반복 검증한다.
- 검증(자가 E2E): 프로필 탭 실카운트 → db query로 기존 실유저와 관계 확인 → `/profile/<실유저uid>` 진입 →
  팔로우 토글 → `user_follows` DB 실측 → 언팔로우 → 원복 확인.

### Phase 3 — 로그인 UI
- `components/auth/` 2종 + ProfilePage 상단 배선. 복귀 충돌 파싱(§2.3) → 경고 다이얼로그 → 확인 시 signInWithOAuth.
- **[사람 게이트 — 대시보드 3건]**
  1. Google Cloud Web client → Authorized redirect URIs에 `https://uhtmaklnhhrrjfcfggjx.supabase.co/auth/v1/callback`
  2. Supabase → Authentication → URL Configuration → Redirect URLs에 `http://localhost:5173/**`와 발표 배포 origin
  3. Supabase Google provider에 **Web client secret** 입력 확인(리다이렉트 플로우 필수 — 네이티브 땐 불필요했음)
- 검증: 버튼 → Google 리다이렉트 진입까지 자가 확인(**계정 입력/동의 클릭스루는 사람** — 자격증명),
  복귀 후 uid 보존 + syncProfileIfDefault DB 실측, 로그아웃 → 새 익명 복귀.

### Phase 4 — 최종 검증 루프
- `web-verifier`(dev 서버 응답 + DB read-only) → `web-auth-verifier`(uid 보존·충돌·동기화)
  → `web-security-auditor` GATE(anon key만 노출·secret 부재·redirect·gitignore)
- `docs/workflow/web-follow-login-work-log.md`에 결과를 기록하고 최종 성공 때만 `FINAL_GATE: PASS`로 갱신한다.

---

## 5. 검증 포인트 / 흔한 실패

- **[실측 확인] dev 서버 포트 주의**: `pnpm dev`는 concurrently로 **Vite dev=5173**(HMR·VITE_ env 반영)과
  **Express=3000**(옛 dist/ 정적 서빙 + `/api`)을 동시에 띄운다. 브라우저 검증은 **반드시 5173**으로 —
  3000은 빌드 시점의 낡은 번들이라 코드 변경이 반영 안 된다. `/api`는 5173에서 3000으로 프록시됨.
  또한 Vite는 `.env`를 핫리로드하지 않는다 — VITE_ 변수 추가/변경 후엔 dev 서버 재시작 필수.

- 프로필 탭 카운트가 0/0 → 정상(신규 익명). db query로 관계 만들어 재확인.
- `identity_already_exists`가 URL 해시로 올 수도 쿼리로 올 수도 있음 — 둘 다 파싱.
- 리다이렉트 후 무한 익명 재생성 → `ensureAnonymousSession`이 복귀 세션을 덮지 않는지 확인
  (getSession 우선 — 모바일과 동일 로직이면 안전).
- Google 400 redirect_uri_mismatch → 게이트 1 미완. Supabase "redirect_to not allowed" → 게이트 2 미완.
- 팔로우 42501(RLS) → 익명 세션 미확보(auth.uid() null) — 부팅 배선 확인.

## 6. 완료 정의 (DoD)
- [ ] 웹 부팅 시 익명 세션 + profile.id===auth.uid() (신규/기존 프로필 모두)
- [ ] 프로필 탭 실카운트 + 팔로워/팔로잉 시트 + 타인 프로필(/profile/:id) 팔로우 왕복
- [ ] 피드 작성자 탭 → 타인 프로필 진입
- [ ] Google 로그인(링크, uid 보존) + 충돌 경고 → 기존 계정 전환 + 로그아웃 → 익명 복귀
- [ ] 프로필 기본값-한정 동기화(identity_data 소스)
- [ ] security-auditor GATE PASS + work-log §15 append

## 7. 스코프 밖 (후속)
- Apple 로그인(웹) · Express 팔로우 엔드포인트 · Manus OAuth 잔재 정리 · RN 재구현(발표 후)
