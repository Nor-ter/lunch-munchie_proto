# 팔로우 화면 배선(Screen Wiring) 워크플로우 설계

> Lunchie Munchie · React Native + Expo · 후속 문서(선행: `follow-feature-workflow.md`)
> 목적: 완성된 팔로우 백엔드/로직/컴포넌트(`FollowButton`·`ProfileStats`·`FollowerListSheet`)를
> **실제 화면에 얹고 동선을 연결**해 사용자가 앱에서 실제로 팔로우하게 만든다.
> 결정: **하단 탭바 도입** · 프로필 화면은 **웹 프로토타입 `ProfilePage.tsx` 참고** · 화면 하나로 내/타인 통합.

---

## 0. 이 문서의 사용법

1. 전제·현황 파악 (§1)
2. 데이터 현실 매핑 확정 (§2) — **웹 참고 화면 ≠ 실 DB 스키마**. 무엇을 포팅하고 무엇을 defer할지 먼저 못박는다.
3. 배선 아키텍처 (§3)
4. Phase 0~5 순차 구현 (§4) + Claude Code 프롬프트 (§5)
5. 검증/게이트/LOG (§6) — `follow-feature-workflow.md §8`과 동일 루프.

스택은 확정 constitution을 따른다. **새 라이브러리 도입 금지.** 특히 네비게이션은 **Expo Router만** 사용(React Navigation 직접 config 금지).

---

## 1. 전제 · 현황 (실측)

### 1.1 이미 완성된 것 (선행 문서 Phase 1~5)
- 백엔드: `user_follows` RLS + `follow_user`/`unfollow_user` RPC + `handle_new_user` 트리거 (적용/검증 완료)
- service: `mobile/services/followsApi.ts` (getCurrentUserId, followUser, unfollowUser, getIsFollowing, getFollowCounts, getFollowers, getFollowing)
- hooks: `useCurrentUserId`, `useIsFollowing`, `useFollowCounts`, `useFollowers`, `useFollowing`, `useToggleFollow`
- 컴포넌트: `mobile/components/FollowButton.tsx`, `ProfileStats.tsx`, `FollowerListSheet.tsx` (하우스 스타일 `StyleSheet + THEME`, self-contained)

### 1.2 없는 것 (이 문서가 채운다)
- **화면 없음**: `mobile/app` 에 `index.tsx`(→ `/course/c1/edit` 리다이렉트), `course/[id]/edit`, `course/[id]/share` 뿐. **프로필 화면·탭바 없음.**
- **동선 없음**: 다른 유저 프로필로 진입할 경로가 전무.
- **단일 유저 조회 함수 없음**: `followsApi` 에 특정 uid의 `users` 행(username/avatar/bio)을 읽는 `getUser`가 없다 → §4 Phase 0에서 추가.

### 1.3 참고: 웹 프로토타입 프로필 (`client/src/pages/ProfilePage.tsx`)
"내 정보 👤" 화면. 구성: 이모지 아바타 + 이름 + 가입일, 스탯 3종(총 스와이프/좋아요/저장 맛집), 선호 카테고리 Top5(막대), 식단 제한 설정, 브랜드 푸터.
- **주의: 이 화면은 `AppContext` mock 기반이고 팔로우 UI가 없다.** 우리가 얹을 팔로우(ProfileStats/FollowButton/FollowerListSheet)는 웹엔 아직 없는 신규 요소다.
- 탭바 참고: `client/src/components/TabBar.tsx` — 5탭(홈/지도/런치/저장/프로필).

---

## 2. 데이터 현실 매핑 (⚠️ 가장 중요 — 여기서 스코프가 갈린다)

웹 `ProfilePage` 는 mock 필드를 쓰지만 실제 `public.users` 컬럼은 **`id, username, profile_image_url, bio, location, created_at`** 뿐이다. 그대로 포팅하면 존재하지 않는 데이터에 배선하게 된다. 아래로 확정한다.

| 웹 프로필 요소 | 실제 소스 | 이 문서에서 |
|---|---|---|
| 이모지 아바타 | `users.profile_image_url` (이모지 아님) | **아바타 이미지**로 포팅. 이미지 없으면 이니셜/플레이스홀더 |
| 이름 | `users.username` | 포팅 |
| 가입일 | `users.created_at` | 포팅 |
| **팔로워/팔로잉** | `user_follows` (완성됨) | **`ProfileStats` 로 신규 추가 — 이 배선의 핵심** |
| bio / location | `users.bio`, `users.location` | 포팅(있으면 표시) |
| 총 스와이프/좋아요 | `swipes` / `rec_events` 테이블 | **defer** (별도 집계 쿼리 필요, 이 문서 스코프 밖 — 플레이스홀더/숨김) |
| 저장한 맛집 수 | `course_saves` | 선택(간단하면 포함, 아니면 defer) |
| 선호 카테고리 Top5 | ML 도메인(데이터 사이언티스트) | **defer** — 데이터 없음. 자리만 두고 "분석 준비중" |
| 식단 제한 설정 | `users`에 컬럼 없음 | **defer** — 스키마에 없음. 넣으려면 별도 마이그레이션 제안 후 대기 |

**원칙: 실데이터가 있는 것만 배선한다.** defer 항목은 화면에 억지로 넣지 않거나, 명시적 "준비중" 플레이스홀더로 둔다(빈 값에 배선해 깨지는 것 방지). 웹 디자인의 레이아웃/톤(Soft Coral, 카드형)은 참고하되 **데이터는 실 스키마 기준.**

---

## 3. 배선 아키텍처

### 3.1 네비게이션 (Expo Router `(tabs)` 그룹)
```
mobile/app/
├── _layout.tsx                 (기존 Stack — QueryClient/GestureRoot/익명세션. 유지)
├── (tabs)/
│   ├── _layout.tsx             (신규: <Tabs>. 하단 탭바)
│   ├── index.tsx               (홈 — 기존 index 이전 or 플레이스홀더)
│   └── profile.tsx             (신규: '내 프로필' 탭 → 내 uid로 ProfileView)
├── profile/
│   └── [id].tsx                (신규: 타인 프로필 → ProfileView(userId=params.id))
└── course/[id]/...             (기존 유지)
```
- 탭바는 **Expo Router `Tabs`** 사용(웹 `TabBar.tsx` 디자인 참고, 새 네비 라이브러리 금지).
- 이 문서 스코프의 **필수 탭은 "프로필"** 하나. 홈/지도/런치/저장 탭은 **플레이스홀더 스텁**으로 두고 채우는 건 별도 작업(스코프 밖).
- "내 프로필"(탭)과 "타인 프로필"(`profile/[id]`)은 **`ProfileView` 컴포넌트 하나를 공유**한다(중복 방지).

### 3.2 화면 조립 (`ProfileView`)
```
<ProfileView userId>
  useUser(userId)         → 헤더(아바타/username/created_at/bio)
  FollowButton(userId)    → userId===myId 면 자동 숨김(컴포넌트가 이미 처리)
  ProfileStats(userId)    → 팔로워/팔로잉 카운트, 탭 시 시트 open
  FollowerListSheet       → visible/mode 상태를 ProfileView가 소유(AddRestaurantSheet 패턴)
  [defer 자리] 스와이프 스탯 / 카테고리 Top5 / 식단  → 준비중 플레이스홀더 or 생략
</ProfileView>
```

### 3.3 진입 동선 (discovery)
- **탭바 "프로필"** → 내 프로필.
- **코스 작성자 탭** → `/profile/<course.author_id>` (타인 프로필). ← 앱에서 남을 팔로우하는 주 경로.
- **`FollowerListSheet` 행 탭** → 그 유저의 `/profile/<id>` (목록 → 프로필 순회).

---

## 4. Phase 순차 구현 (0~5)

| Phase | 산출물 | 검증 |
|---|---|---|
| 0 | `getUser`/`useUser`(단일 users 행 읽기) + §2 매핑 확정 | uid로 username 반환 확인 |
| 1 | `app/(tabs)/_layout.tsx` 탭바 + 탭 재배치 | 앱에 하단 탭 뜸 |
| 2 | `ProfileView` 컴포넌트(헤더+FollowButton+ProfileStats+시트) | 내 uid로 렌더 |
| 3 | `(tabs)/profile.tsx`(내) + `profile/[id].tsx`(타인) 배선 | 두 경로 진입 |
| 4 | 진입 동선: 코스 작성자 탭 + 시트 행 탭 → 프로필 이동 | 실제 팔로우 왕복 |
| 5 | 검증 루프 + GATE + work-log append | security-auditor PASS |

### 4.1 Phase 0 — 단일 유저 조회 (선결)
`mobile/services/followsApi.ts`(또는 신규 `usersApi.ts`)에 추가:
```ts
getUser(userId: string): Promise<User | null>   // users.select('*').eq('id',userId).maybeSingle()
```
+ `mobile/hooks/useUser.ts` (`queryKey: ['user', userId]`, `enabled: !!userId`). `getCourse`/`useCourse` 패턴 그대로.

### 4.2 Phase 2 — ProfileView 데이터 배선 규칙
- 아바타: `profile_image_url` 있으면 `<Image>`, 없으면 username 이니셜 플레이스홀더.
- `FollowButton`/`ProfileStats` 는 props로 `userId`만 넘기면 끝(내부에서 훅 처리, 내 프로필이면 버튼 자동 숨김).
- defer 항목(스와이프/카테고리/식단)은 **빈 배열/undefined에 배선 금지** — 섹션 자체를 조건부로 숨기거나 "분석 준비중" 문구.

---

## 5. Claude Code 실행 프롬프트 (Phase별 · 참고파일 명시)

> 하나씩 붙여넣는다. 앞 Phase 검증 후 다음. `/wire-follow-screen <N>` 커맨드로도 실행 가능(§커맨드).

### Phase 0 — 단일 유저 조회
```
docs/workflow/follow-screen-wiring-workflow.md §2, §4.1 을 읽어.
mobile/services/followsApi.ts 에 getUser(userId): Promise<User|null> 을 추가하고
(users.select('*').eq('id',userId).maybeSingle(), coursesApi.getCourse 패턴),
mobile/hooks/useUser.ts 를 만들어라 (queryKey ['user', userId], enabled !!userId).
새 라이브러리 금지. 참고: mobile/services/coursesApi.ts, mobile/hooks/useCourse.ts, mobile/types/db.ts.
```

### Phase 1 — 탭바 도입
```
docs/workflow/follow-screen-wiring-workflow.md §3.1 을 읽어.
Expo Router 로 mobile/app/(tabs)/_layout.tsx 를 만들어 하단 Tabs 를 구성해라.
필수 탭은 '프로필'(profile.tsx) 하나. 홈(index.tsx)은 기존 index 리다이렉트 로직을 옮기거나 간단한 홈 스텁으로.
지도/런치/저장 탭은 지금 만들지 말고 자리만(주석) 남겨 스코프를 키우지 마.
탭바 디자인 톤은 웹 client/src/components/TabBar.tsx 참고(아이콘/라벨), 단 Expo Router Tabs 로 구현.
React Navigation 직접 config 금지. 참고: mobile/app/_layout.tsx.
루트 리다이렉트(index.tsx)가 (tabs) 도입 후에도 동작하는지 확인.
```

### Phase 2 — ProfileView 컴포넌트
```
docs/workflow/follow-screen-wiring-workflow.md §2, §3.2, §4.2 를 읽어.
mobile/components/ProfileView.tsx (props: userId) 를 만들어라.
- useUser(userId) 로 헤더: 아바타(profile_image_url 없으면 username 이니셜), username, created_at 가입일, bio/location(있으면).
- FollowButton(userId), ProfileStats(userId) 배치. FollowerListSheet 의 visible/mode 상태는 ProfileView 가 useState 로 소유(AddRestaurantSheet 패턴), ProfileStats.onPressFollowers/onPressFollowing 으로 open.
- defer 항목(스와이프 스탯/카테고리 Top5/식단)은 데이터 없음 — 넣지 말거나 '분석 준비중' 플레이스홀더. 빈 값에 배선 금지.
디자인 톤은 웹 client/src/pages/ProfilePage.tsx 참고(카드형/Soft Coral), 데이터는 실 스키마(types/db.ts User) 기준.
스타일은 하우스 스타일(StyleSheet+THEME). 참고: mobile/components/ProfileStats.tsx, FollowButton.tsx, FollowerListSheet.tsx, AddRestaurantSheet.tsx, mobile/constants/theme.ts.
```

### Phase 3 — 화면 라우트 배선
```
docs/workflow/follow-screen-wiring-workflow.md §3.1 을 읽어.
mobile/app/(tabs)/profile.tsx: useCurrentUserId() 로 내 uid 를 얻어 <ProfileView userId={myId}/> 렌더(로딩/미확보 처리).
mobile/app/profile/[id].tsx: useLocalSearchParams 로 id 를 받아 <ProfileView userId={id}/> 렌더, 헤더에 뒤로가기.
참고: mobile/app/course/[id]/edit.tsx (useLocalSearchParams 사용례), mobile/hooks/useCurrentUserId.ts.
```

### Phase 4 — 진입 동선 연결
```
docs/workflow/follow-screen-wiring-workflow.md §3.3 을 읽어.
1) 코스 화면에서 작성자(author_id)를 탭하면 router.push(`/profile/${authorId}`) 로 이동하게 배선
   (작성자 표시 UI가 없으면 최소한의 작성자 칩/이름을 추가). 참고: mobile/app/course/[id]/edit.tsx.
2) FollowerListSheet 의 각 행을 탭하면 그 유저 /profile/[id] 로 이동(onClose 후 push). 참고: mobile/components/FollowerListSheet.tsx.
실제로 '타인 프로필 진입 → 팔로우 → 목록 반영' 왕복이 되는지 확인.
```

### Phase 5 — 검증
```
docs/workflow/follow-screen-wiring-workflow.md §6 절차 수행:
1) 시뮬레이터에서 탭바→프로필, 코스 작성자→타인 프로필, 팔로우 토글, 팔로워/팔로잉 시트, 시트 행→프로필 순회를 실제 확인(스크린샷/로그).
2) backend-verifier 로 §6.1 화면-우회 재검증(팔로우가 UI 없이도 서버 반영되는지 이미 확인됐으니, 여기선 UI 경로가 같은 RPC를 타는지 로그로 확인).
3) security-auditor GATE. PASS 전 완료 선언 금지.
4) docs/workflow/google-maps-integration-work-log.md 에 append.
```

---

## 6. 검증 / 게이트 / LOG (선행 문서 §8과 동일 루프)

### 6.1 검증 포인트
- **탭 '프로필'** 진입 → 내 프로필, FollowButton **안 보임**(내 uid).
- **코스 작성자 탭** → 타인 프로필, FollowButton **보임** → 탭하면 즉시 팔로잉 토글(낙관적) → `ProfileStats` 팔로워 수 반영.
- **팔로워/팔로잉 탭** → `FollowerListSheet` 목록, 각 행 FollowButton 동작, 행 탭 → 해당 프로필 이동.
- **orphan 방지 확인**: `handle_new_user` 트리거 적용 후 신규 유저가 목록에 username 으로 뜨는지(§선행 문서 §3).

### 6.2 흔한 실패 (멈춤 규칙)
- 프로필이 비어 보임(username null) → `public.users` 프로비저닝(선행 §5.2) 미적용 또는 backfill 누락.
- 타인 프로필에서 FollowButton 안 뜸 → `useCurrentUserId` 가 내 uid를 아직 못 얻음(익명 세션 미확보) → `_layout.tsx` ensureAnonymousSession 확인.
- 목록이 항상 빈 상태 → getFollowers/getFollowing orphan 제외로 전부 걸러짐(users 행 없음).
- 같은 층 가설 3회 실패 → 사람에게 요약 보고 후 대기.

### 6.3 안전 게이트 / LOG
- 이 문서는 **DB 변경 없음**(순수 프론트 배선). defer된 식단 컬럼 등을 넣으려면 마이그레이션 = 안전 게이트 → 제안 후 대기.
- 사이클 종료 시 `google-maps-integration-work-log.md` 에 `팔로우 화면배선 · Phase N → 확인/검증 → 결과 → 남은 TODO` append.

---

## 7. 완료 정의 (DoD)
- [ ] 하단 탭바 + '프로필' 탭 동작
- [ ] `ProfileView` 하나로 내/타인 프로필 렌더(내 프로필 시 FollowButton 숨김)
- [ ] 코스 작성자 탭 → 타인 프로필 → 팔로우 왕복 동작
- [ ] `FollowerListSheet` 행 탭 → 프로필 순회
- [ ] defer 항목(스와이프/카테고리/식단)은 빈 배선 없이 숨김/플레이스홀더 처리
- [ ] security-auditor GATE PASS + work-log append

## 8. 스코프 밖 (후속 TODO로 명시)
- 홈/지도/런치/저장 탭 실제 구현
- 스와이프/좋아요 스탯 집계(`swipes`/`rec_events`), 저장 맛집(`course_saves`)
- 선호 카테고리 Top5(ML 도메인), 식단 설정(스키마 확장 필요 — 마이그레이션 제안 대상)
- 프로필 편집(username/avatar/bio 수정 — `users_update` RLS는 이미 준비됨)

---

## 9. 로그인 도입 시 영향 (설계: `login-workflow.md`)

이 배선은 **내 프로필 = `useCurrentUserId()`(현재 `auth.uid()`)** 를 전제로 한다.

- **정상 경로(익명→링킹, uid 보존)**: 로그인 후에도 `auth.uid()`가 동일하므로 `(tabs)/profile.tsx` 의
  "내 프로필"은 그대로 같은 유저를 가리키고, 코스 작성자 칩/팔로워 시트 순회도 무손상.
- **파국 경로(uid 변경)**: 내 프로필이 새 uid를 가리켜 이전 프로필/팔로우가 사라진 것처럼 보인다 →
  login-workflow의 링크-우선·충돌 경고가 방어선.
- **프로필 헤더 동기화**: 로그인 성공 시 provider 이름/아바타를 `public.users`에 반영(username 기본값일
  때만)하면 `ProfileView` 헤더가 즉시 갱신된다. 캐시 무효화는 login-workflow Phase 2의
  `onAuthStateChange → queryClient.clear()`가 담당.
- **DevAccountSwitcher**: 정식 로그인 도입 후에도 `__DEV__` 검증 도구로 유지(공존).
