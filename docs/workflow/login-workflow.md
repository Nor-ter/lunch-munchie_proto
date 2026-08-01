# 로그인(소셜) 기능 구현 워크플로우 설계

> Lunchie Munchie · React Native + Expo · 후속 문서(선행: `follow-feature-workflow.md`, `follow-screen-wiring-workflow.md`)
> 목적: Supabase **Anonymous Auth**만 쓰던 앱에 **Apple + Google 네이티브 소셜 로그인**을 도입하되,
> **익명→정식 승격 시 `auth.uid()`를 보존**해 기존 데이터(코스·팔로우·프로필)를 유실 없이 승계한다.
> 결정: **네이티브 id-token 링킹**(웹 리다이렉트 없음) · **익명 우선 게이팅** · 이메일은 스코프 밖.

> **[2026-07-12] 실행 스코프 축소**: Apple Developer 멤버십 미보유로 **1차 구현은 Google만** 진행한다.
> Apple 관련 설계(§2.1, §5)는 그대로 유지하되 실행은 보류 — Apple 멤버십 가입 후 별도 사이클로 이어간다.
> **주의**: §2.1의 "iOS엔 Apple 필수 노출(App Store 심사)" 제약은 **App Store 정식 배포 전에는 반드시
> 해소**해야 한다(Apple 심사 가이드라인 4.8 — 타사/제3자 로그인이 있으면 Sign in with Apple도 동등하게
> 제공해야 함). 이번 축소는 "개발/검증 단계에서 Google부터 먼저 굳힌다"는 뜻이지 Apple을 스코프에서
> 빼는 게 아니다. DoD(§9)의 Apple 항목은 배포 전 완료 필수로 재확인할 것.

---

## 0. 이 문서의 사용법

1. 현재 상태 파악 (§1) — 실측 완료, 그대로 신뢰.
2. 설계 결정 확정 (§2) — 확정 항목 재논의 금지.
3. **Cross-cutting 영향/데이터 승계 (§3)** — 이 기능의 핵심. uid 연속성이 깨지면 뭐가 무너지는지.
4. 아키텍처 (§4) → 의존성·설정 변경 (§5) → Phase 0~4 순차 구현 (§6) + Claude Code 프롬프트 (§7).
5. 검증/게이트/LOG (§8) — follow 문서들과 동일 6단계 루프(`.claude/CLAUDE.md`).

스택은 확정 constitution을 따른다. **새 라이브러리는 §5에서 제안 후 승인 대기.** 네이티브 소셜에 필요한
모듈은 확정 스택 밖이므로 임의 도입하지 않는다. **DB 변경·마이그레이션·provider 설정·secrets·prebuild는
전부 안전 게이트** — 실행 전 사람 승인.

---

## 1. 현재 상태 (실측 · `20260706123009_remote_schema.sql` + 코드 기준)

### 1.1 uid 결합 지점 — 전부 `text` 컬럼 = `auth.uid()::text`
| 테이블 | uid 컬럼 | RLS 현황 |
|---|---|---|
| `courses` | `author_id` | `courses_modify`/`courses_select` (`author_id = auth.uid()::text`) |
| `course_items` | (courses 조인) | `course_items_modify/select` (courses.author_id 경유) |
| `course_comments` | `user_id` | RLS ON, **정책 0개(deny-all)** |
| `course_likes` | `user_id` | RLS ON, **정책 0개**, UNIQUE(course_id,user_id) |
| `course_saves` | `user_id` | RLS ON, **정책 0개** |
| `sessions` | `host_user_id` | RLS ON, **정책 0개** |
| `session_members` | `user_id` | RLS ON, **정책 0개** |
| `swipes` | `user_id` | RLS ON, **정책 0개** |
| `rec_events` | `user_id` | RLS ON, **정책 0개** |
| `user_follows` | `follower_id`/`following_id` | 정책 6개(follow 마이그레이션) |
| `users` | `id` | `users_select/insert/update` |

> **정책 0개** 테이블은 현재 클라이언트 직접 접근이 막혀 있어(Edge Function/service_role 경유 추정)
> 로그인 변경의 직접 대상은 아니지만, uid 결합은 동일하므로 데이터 승계 대상에 포함한다.

### 1.2 인증/설정 현황
- 부팅: `ensureAnonymousSession()`([mobile/lib/supabase.ts](../../mobile/lib/supabase.ts)) — 세션 없으면 무조건 `signInAnonymously()`. (익명 sign-in 이미 활성.)
- `handle_new_user` 트리거(`20260711000000_follow_rls_and_rpc.sql`): **AFTER INSERT ON `auth.users`** → `public.users` 자동 생성, username `user_<uid앞8자>`.
- deep link scheme `lunchie-munchie`(app.json), bundleId/package `com.pupfish.lunchmunchie`, `newArchEnabled: true`.
- `ios/`·`android/` prebuilt 존재(gitignore 대상). `eas.json` 없음 → 로컬 `expo run:*` 로 dev build 가능.
- **설치된 `@supabase/auth-js` 2.110 확인**: `linkIdentity`가 **2개 오버로드** — OAuth 리다이렉트용 +
  **`linkIdentity(SignInWithIdTokenCredentials)` = "Links an OIDC identity to an existing user"(네이티브 id-token 링킹)**.
  `signInWithIdToken`, `unlinkIdentity`, `getUserIdentities` 도 존재.
- **네이티브 소셜 모듈 미설치**: `expo-apple-authentication`, `@react-native-google-signin/google-signin`,
  `expo-crypto`, `expo-web-browser` 전무.
- `.gitignore`: `.env*`, `env.enc`, `/ios`,`/android`; `mobile/.gitignore`에 `*.p8`(루트엔 없음 → 보강 대상).

---

## 2. 설계 결정

### 2.1 확정 (재논의 금지)
Apple + Google **2종, 네이티브 플로우**. 익명→정식은 **uid 보존 링킹**. iOS엔 Apple 필수 노출(App Store
심사). Expo Go 불가 → **dev build 전제**. 이메일(매직링크/비번)은 스코프 밖 — fallback 자리만 남긴다.

### 2.2 핵심 아키텍처 결정 — 네이티브 id-token 링킹 (긴장 해소)
"네이티브 플로우"와 "linkIdentity uid 보존"은 통상 충돌한다(linkIdentity = 웹 OAuth 리다이렉트). 그러나
**설치된 auth-js 2.110의 `linkIdentity(SignInWithIdTokenCredentials)` 오버로드**로 **네이티브 id-token을
그대로 링킹**할 수 있어 둘 다 만족한다 — 웹 리다이렉트·`expo-web-browser` 불필요, 데이터 마이그레이션 불필요.
→ **이 오버로드 동작이 전체 설계의 린치핀. Phase 0 스파이크에서 실기 1회 검증 필수**(실패 시 전체 접근 재검토).

### 2.3 확정 (제품 결정)
- **충돌 처리**: 대상 identity가 이미 다른 유저 소유라 링킹 실패 시 → **경고 후 `signInWithIdToken`으로
  기존 계정 로그인**. 현재 익명 세션의 로컬 데이터는 승계되지 않음을 UI에서 사전 경고. 서버 병합은 post-MVP.
- **게이팅**: **익명 우선(현행 유지)** — 자유 탐색, 프로필/durable 액션 시점에 "로그인" 업그레이드 제안.
- **프로필 동기화**: 링크 성공 후 `public.users.username`이 아직 기본값(`user_<uid8>`)일 때만 provider
  이름/아바타로 update(`users_update` RLS 통과). 사용자 지정 핸들 미덮음. Apple은 최초 1회만 이름 제공 →
  없으면 기본값 유지.

---

## 3. Cross-cutting 영향 / 데이터 승계 (핵심 분석)

### 3.1 uid 보존 시 (정상 경로: 익명 + linkIdentity 성공)
`auth.uid()`가 링킹 전후 **동일** → §1.1의 **모든 행이 그대로 보존**(courses.author_id, course_items,
course_comments/likes/saves.user_id, sessions.host_user_id, session_members.user_id, swipes.user_id,
rec_events.user_id, user_follows.follower/following, users.id). RLS도 `auth.uid()::text` 기반이라 **정책
수정 0** — 링킹 후에도 동일하게 통과. JWT role은 계속 `authenticated`, `is_anonymous`만 true→false.

### 3.2 uid 변경 시 (파국 경로: 링크 실패→기존 로그인, 또는 fresh 로그인)
새 uid 발급 → **옛 anon uid의 모든 행이 orphan**: 내가 만든 코스 편집 불가(courses_modify 불일치),
팔로우/팔로워 그래프 소실, public.users 옛 행 고아화. → **링크-우선이 필수**이고, 충돌 시엔 "기존 계정에
이미 데이터가 있으니 그쪽으로 로그인, 현재 익명 로컬 데이터는 이 기기에만"을 명시 경고(§2.3). fresh 설치의
익명은 데이터가 없어 무해.

### 3.3 handle_new_user 커버리지 (3경로)
- **익명 가입**(signInAnonymously): `auth.users` INSERT → 트리거 O → public.users 생성. ✅(현행)
- **fresh OAuth 가입**(signInWithIdToken, 신규 유저): `auth.users` INSERT → 트리거 O → public.users 생성(기본 username). ✅
- **링킹**(linkIdentity idToken, 기존 anon): `auth.users` INSERT 아님(`auth.identities` INSERT) → **트리거
  미발화**. 단 public.users 행은 anon 생성 때 이미 존재 → 공백 없음. ✅ **provider 이름/아바타는 트리거로
  안 들어옴** → §2.3 클라이언트 사이드 동기화로 처리(별도 `auth.users` UPDATE 트리거는 복잡도·중복으로 미도입).

### 3.4 현재 익명 유저 승계
현 `auth.users` 익명 유저가 자기 Apple/Google로 링크하면 uid 보존 → 보유 데이터 유지. (씨드 코스 c1의
author_id는 'user1' 씨드값이라 애초 익명 uid 소유가 아님 — 무관.)

---

## 4. 아키텍처 (레이어)

```
┌────────────────────────────────────────────────────────────┐
│ UI  LoginSheet · 프로필 탭 로그인/로그아웃 · 충돌 경고      │
└───────────────┬────────────────────────────────────────────┘
                │ hooks  useAuthStatus (uid, isAnonymous)
┌───────────────▼────────────────────────────────────────────┐
│ service  services/authApi.ts (순수 함수)                    │
│  getAppleIdToken · getGoogleIdToken                         │
│  linkOrSignIn(provider) · signOutToAnonymous               │
│  syncProfileIfDefault                                       │
└──────┬───────────────────────────────┬─────────────────────┘
 네이티브 모듈                      supabase-js auth
 expo-apple-authentication        linkIdentity(idToken) ← 정상
 @react-native-google-signin      signInWithIdToken     ← 충돌/fresh
 expo-crypto(nonce)               onAuthStateChange
┌──────────────────────────────────────────────────────────── ┐
│ Supabase Auth (uid 보존) + public.users (RLS users_update)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 새 의존성 + 스키마/설정 변경

### 5.1 새 의존성 (확정 스택 밖 → 제안 후 승인 대기)
| 패키지 | 용도 | 정당성 / 대안 |
|---|---|---|
| `expo-apple-authentication` | 네이티브 Sign in with Apple → identityToken | Expo 공식, SDK54 호환, Apple HIG 버튼. 대안 없음(네이티브 요건). |
| `@react-native-google-signin/google-signin` | 네이티브 Google → idToken | Supabase RN 네이티브 권장. **대안** expo-auth-session(웹)은 "웹 지양"으로 기각. **newArch(true) 호환 버전 핀 필요.** |
| `expo-crypto` | Apple nonce SHA256 해시 | Apple 링킹 nonce 필수. 소형 Expo 공식. |
| ~~expo-web-browser~~ | (불필요) | id-token 링킹이라 웹 리다이렉트 없음 → 도입 안 함. |

### 5.2 스키마/설정 (전부 안전 게이트 — 계획만, 실행 금지)
- **DB 마이그레이션: 없음.** 로그인은 RLS/스키마 변경을 요구하지 않는다(§3.1). *(선택: "익명은 코스 생성
  불가" 같은 `auth.jwt()->>'is_anonymous'` 게이팅 정책은 별도 제안 대상, 이번 스코프 밖.)*
- **Supabase 대시보드**(사람): ① **Manual linking 활성화**(linkIdentity 전제) ② Apple provider 설정
  ③ Google provider 설정 ④ Anonymous(이미 on 확인).
- **Apple Developer**(사람): App ID에 Sign in with Apple capability, **AuthKey(.p8) 생성 — 시크릿, Supabase
  대시보드에만 저장. 번들·git 절대 금지.**
- **Google Cloud**(사람): iOS OAuth client ID + **Web client ID**(= Supabase Google provider의 authorized
  audience; RN google-signin의 `webClientId`). id token audience 불일치가 흔한 실패 원인 — Web client ID를
  정확히 맞출 것. client secret은 대시보드에만.
- **네이티브 재생성**: app.config.ts/app.json에 plugin(expo-apple-authentication, google-signin) + iOS Sign
  in with Apple 엔티틀먼트 + Google reversed-client-id URL scheme 추가 → **`expo prebuild --clean` 재빌드
  필요**(기존 Google Maps 키 네이티브-재주입 이슈와 동일 함정). ios/android는 gitignore 산출물이라 안전.

---

## 6. Phase 순차 구현 (각 Phase = 독립 커밋, 앞 Phase 검증 후 진행)

| Phase | 산출물 | 검증 게이트 |
|---|---|---|
| 0 | deps 제안 + 대시보드/콘솔 설정 + prebuild + **린치핀 스파이크** | 익명에서 linkIdentity(idToken) uid 보존 성공 실측 |
| 1 | `services/authApi.ts` (토큰 획득 + link/signin + 동기화) | 단위 호출로 링크/충돌/로그아웃 왕복 |
| 2 | 부팅/세션 흐름(supabase.ts·_layout.tsx·useAuthStatus) | 정식 세션 지속·익명 복귀·캐시 무효화 |
| 3 | UI(LoginSheet + 프로필 배선) | 화면에서 Apple/Google 로그인·로그아웃 |
| 4 | 검증 루프 + GATE + work-log | backend-verifier + security-auditor PASS |

### 6.1 Phase 0 상세 — 린치핀 스파이크
익명 세션 확보 상태에서 `linkIdentity({provider, token, nonce})` 실기 1회 실행 → **링킹 전후 `auth.uid()`
동일** + 기존 소유 데이터 조회·수정 유지 확인. 충돌 케이스(이미 링크된 identity) 에러 코드 확보. 여기서 실패하면
접근(예: 데이터 마이그레이션 방식)으로 선회 — **가장 먼저, 최소 코드로 리스크를 차단한다.**

### 6.2 Phase 1 상세 — `authApi.ts` 인터페이스
```
getAppleIdToken(): { identityToken, rawNonce, fullName? }   // rawNonce → expo-crypto SHA256 → Apple nonce
getGoogleIdToken(): { idToken }                              // GoogleSignin.configure({webClientId, iosClientId})
linkOrSignIn(provider): 익명이면 linkIdentity; 충돌이면 signInWithIdToken(기존 로그인); 비익명이면 signInWithIdToken
signOutToAnonymous(): signOut() → ensureAnonymousSession()
syncProfileIfDefault(user): username이 user_<uid8> 기본값일 때만 provider 이름/아바타로 users update
```

---

## 7. Claude Code 실행 프롬프트 (Phase별 · 하나씩 붙여넣기)

### Phase 0 — 전제 설정 + 스파이크
```
docs/workflow/login-workflow.md §5, §6.1 을 읽어.
1) 새 deps 3종(expo-apple-authentication, @react-native-google-signin/google-signin, expo-crypto)
   도입을 제안만 하고 승인 대기(임의 설치 금지). newArch 호환 버전을 함께 조사해 제시.
2) 대시보드/Apple/Google 콘솔/prebuild 설정 체크리스트를 사람에게 제시(전부 안전 게이트, 실행은 사람).
3) 승인·설정 완료 후, 익명 세션에서 linkIdentity({provider, token, nonce})가 uid를 보존하며 성공하는지
   실기 1회 스파이크. 결과(링크 전/후 auth.uid(), 충돌 에러 코드)를 로그로 남겨라. 마이그레이션·배포 금지.
```

### Phase 1 — auth 서비스 레이어
```
docs/workflow/login-workflow.md §6.2 를 읽어.
mobile/services/authApi.ts 를 만들어 getAppleIdToken/getGoogleIdToken/linkOrSignIn/signOutToAnonymous/
syncProfileIfDefault 를 구현해라. 링크-우선, 충돌 시 경고는 호출부(UI)가 하도록 에러를 명확히 반환.
React/hook 의존 금지(순수 함수). 참고: mobile/lib/supabase.ts, mobile/services/followsApi.ts.
```

### Phase 2 — 부팅/세션 흐름
```
docs/workflow/login-workflow.md §4, §6 을 읽어.
mobile/lib/supabase.ts 의 ensureAnonymousSession 을 "정식 세션 있으면 유지, 없을 때만 익명"으로 고치고,
mobile/hooks/useAuthStatus.ts (uid, isAnonymous)를 만들어라. onAuthStateChange 구독으로 링크/로그인/
로그아웃 시 queryClient.clear()(useDevAccounts 패턴). 참고: mobile/app/_layout.tsx, mobile/hooks/useDevAccounts.ts.
```

### Phase 3 — UI
```
docs/workflow/login-workflow.md §2.3, §4 를 읽어.
mobile/components/LoginSheet.tsx 와 프로필 탭 배선: 익명이면 Apple(AppleAuthenticationButton, HIG)+Google
버튼, 정식이면 계정 표시+로그아웃. 충돌 시 "이미 가입된 계정… 임시 데이터 미승계" 경고 다이얼로그.
DevAccountSwitcher는 __DEV__ 유지. 참고: mobile/components/DevAccountSwitcher.tsx, ProfileView.
```

### Phase 4 — 검증
```
docs/workflow/login-workflow.md §8 절차 수행:
1) backend-verifier: 링크 전/후 auth.uid() 동일 + 기존 courses/user_follows/likes 조회·수정 유지 실측, 충돌 케이스.
2) security-auditor: .p8/client secret 번들·git 미노출, provider·manual-linking 설정 확인. PASS 전 완료 금지.
3) docs/workflow/google-maps-integration-work-log.md 에 append.
```

---

## 8. 검증 / 게이트 / LOG

### 8.1 검증 포인트
- 익명에서 Apple/Google 링크 → **auth.uid() 불변** + 내 코스/팔로우/프로필 그대로.
- 충돌(다른 유저 소유 identity) → 경고 후 기존 계정 로그인, 현재 익명 데이터 미승계 안내.
- 로그아웃 → 새 익명 세션 복귀, 재로그인 시 원 계정으로.
- 프로필 동기화: 기본값 username일 때만 provider 값 반영.

### 8.2 안전 게이트 (실행 전 사람 승인)
새 deps 설치 · Supabase provider/manual-linking 설정 · Apple AuthKey(.p8) 생성 · Google client ID 생성 ·
`expo prebuild --clean` 재빌드. **자율 허용**: 읽기·설계, 로컬 코드 편집, read-only DB 조회.

### 8.3 멈춤 규칙
- linkIdentity(idToken) 자체가 실패(미지원/설정 누락) → Phase 0에서 중단·사람 보고(접근 재검토).
- id token audience mismatch(Google) → Web client ID ↔ Supabase authorized audience 불일치 확인.
- Apple nonce 불일치 → rawNonce/해시 전달 경로 확인.
- **[알려진 한계] iOS 시뮬레이터에서 Google 로그인 2번째 이상 시도가 매번 "문제가 발생했습니다" →
  재시도 무한 로딩**(work-log §10.3, §11 두 사이클에서 재현): 원인은 앱 내 특정 유저/세션이 아니라
  **시뮬레이터 OS 레벨의 `ASWebAuthenticationSession`/Google 웹세션 상태 오염** — 새 익명 유저로
  바꿔도 안 씻김. `@react-native-google-signin`의 iOS 네이티브 레이어가 ephemeral 웹세션 옵션을
  노출하지 않아(라이브러리 코드에 관련 설정 전무 확인됨) **코드로 회피 불가**. 매번
  `Device → Erase All Content and Settings` 후 재시도가 유일한 해결책. 반복 테스트가 많다면
  **실기기 테스트로 전환**을 권장(이 아티팩트는 시뮬레이터 한정, 실기기엔 없음).

### 8.4 LOG
사이클 종료 시 `docs/workflow/google-maps-integration-work-log.md` 에
`로그인 · Phase N → 확인/검증 → 결과 → 남은 TODO` append.

---

## 9. 완료 정의 (DoD)
- [ ] Apple + Google 네이티브 로그인 동작(dev build), iOS에 Apple 노출. — **Google만 완료**, Apple은 멤버십 취득 후(비활성 placeholder 버튼만 자리 표시 중, `LoginSheet.tsx`).
- [x] 익명→링크 후 uid 보존 + 기존 코스/팔로우/프로필 유지(backend-verifier 실측) — work-log §10, §11.
- [x] 충돌 시 경고 후 기존 계정 로그인 경로 동작 — work-log §11, §13, §14, 실기 확인 완료.
- [x] 프로필 기본값-한정 동기화, 로그아웃→익명 복귀 — work-log §14(버그 발견·수정·재검증), 라이브 DB 실측(`username="Work Testing"`, 아바타 반영).
- [x] 인증 시크릿 미노출 security-auditor PASS + work-log append — 매 사이클 GATE PASS, 최종 GATE도 PASS.

**Google 로그인 기능 — 완료.** 남은 유일한 미완료 DoD 항목은 Apple(스코프 아웃, 재개 조건: Apple Developer 멤버십 취득). 그 외 배포 전 확인 사항(Android/iOS Application restriction)은 GCP 콘솔 작업으로 §5.2에 이미 게이트로 명시됨.

---

## 10. security-auditor.md 추가 제안 문구 (에이전트 파일 직접 수정 X — 도입 시 반영 검토)
- **익명→정식 링킹 uid 연속성**: linkIdentity 후 `auth.uid()`가 링킹 전과 동일하고, 기존
  `courses.author_id` / `user_follows` / `course_likes·saves` / `sessions.host_user_id` / `public.users`
  행이 그대로 조회·수정 가능한가.
- **인증 시크릿 미노출**: Apple AuthKey(.p8) / Google client secret이 클라이언트 번들·git에 없는가
  (`grep` 번들 + `git log --all`). 클라이언트엔 public client ID / reversed client ID만 존재해야 함.
  루트 `.gitignore`에 `*.p8` 보강.
