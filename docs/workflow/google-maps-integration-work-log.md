# Google Maps API Integration 작업 로그

> 대상 문서: `course-edit-restaurant-crud-workflow.md`
> 범위: Phase 3(Edge Function 프록시) 로컬 검증·배포 → Phase 4(추가 기능) → Phase 5(저장 기능) 실기기 검증 → 보안 키 정리
> 이 문서는 실제로 겪은 에러·이슈와, 그걸 어떤 대화/판단으로 풀었는지를 시간 순으로 정리한 회고록이다.

---

## 1. 전체 목표

문서 §4의 원칙("Google API 키를 RN 앱에 절대 넣지 않는다")에 따라, 모바일 앱은 Google을 직접 호출하지 않고 Supabase Edge Function 4개(`places-search`, `places-autocomplete`, `place-details`, `directions`)를 프록시로 거친다. 이 기능을 로컬에서 검증하고 배포한 뒤, 실제 RN 앱에서 추가(add)·저장(commit) 기능까지 끝까지 동작하는지 확인하는 게 전체 목표였다.

---

## 2. Phase 3 — Edge Function 로컬 검증 + 배포

### 2.1 서버 키 발급
- Google Cloud Console에서 모바일 클라이언트 키와 별개인 서버 전용 키(`server-places-directions-key`) 발급.
- API restriction으로 Places API (New) + Directions API만 허용. IP 제한은 Supabase Edge Function이 고정 아웃바운드 IP를 보장하지 않아 생략.
- "서비스 계정을 통한 인증" 체크박스는 사용 안 함(불필요한 복잡도로 판단).

### 2.2 로컬 실행 환경 세팅에서 겪은 문제들
| 이슈 | 원인 | 해결 |
|---|---|---|
| `supabase: command not found` | CLI 미설치 | `brew install supabase/tap/supabase` |
| `docker: command not found` | Docker Desktop 미설치 | `brew install --cask docker` + `open -a Docker` |
| `supabase functions serve` → `supabase start is not running` | 로컬 Postgres/Auth 스택 자체가 안 떠 있음 | `supabase start` 먼저 실행 |
| `--no-verif` 플래그 에러 | 복사/붙여넣기 중 `--no-verify-jwt`가 잘림 | 전체 플래그 재입력 |
| `.env.local` ENOENT | README 안내 파일을 실제로 안 만듦 | README대로 파일 생성 + `.gitignore`에 추가 |

### 2.3 로컬 DB 스키마 동기화에서 겪은 문제 (가장 오래 걸린 부분)
- `restaurants`/`courses`/`course_items` 테이블이 원격에만 있고 로컬 마이그레이션 파일엔 없어서, 최초 마이그레이션 실행 시 `relation "restaurants" does not exist` 발생.
- `supabase db pull` 시도 → `Cannot find project ref` (link 안 됨) → `Cannot connect... SUPABASE_DB_PASSWORD` (비밀번호 없음) → 5432 direct connection timeout(IPv6 문제 추정) → 마이그레이션 이력 불일치(`migration history does not match`) 순서로 계속 막힘.
- 해결 순서:
  1. `supabase login` → `supabase link --project-ref <ref>`
  2. DB 비밀번호는 대시보드 "Connect" 버튼에서 pooler(6543) 연결 문자열로 확보 → 5432 direct connection의 IPv6 timeout 우회
  3. 로컬에 이미 있던 두 마이그레이션 파일(`restaurants` 브릿지 컬럼, RLS 정책)이 원격엔 이미 적용된 상태라 이력만 안 맞는 상황 → `supabase migration repair --status applied ...`로 이력 테이블만 정리
  4. 그래도 `db pull`의 shadow DB 재생 과정에서 "테이블 없음" 에러 반복 → 두 마이그레이션 파일을 원본 테이블 생성 SQL 없이 additive 문만 담고 있었던 게 원인 → 파일을 임시로 빼놓고 `db pull` 재실행 → 원격 전체 스키마를 새 마이그레이션 파일 하나로 통째로 받아옴
  5. 이 과정에서 파일을 뺐다가 이력이 반대로 또 안 맞음 → `migration repair --status reverted ...`로 재정리
  6. 최종적으로 `db pull` 성공 → `supabase db reset`으로 로컬 DB에 전체 스키마 반영

### 2.4 로컬 curl 4종 검증
- README에 있던 curl 4개를 순서대로 실행해 전부 200 OK 확인:
  - `places-search`: 멜버른 카페 20곳 검색 성공
  - `places-autocomplete`: "Brother Baba" 입력 시 정확한 후보 1순위 확인 (다만 중국 지역 결과도 섞여 나와 멜버른 locationBias 적용 여부는 추후 점검 필요로 남김)
  - `place-details`: `restaurants` 테이블에 실제 upsert 확인(`google_place_id`, `synced_at`, `source='google'`)
  - `directions`: 폴리라인/거리/소요시간 정상 반환

### 2.5 배포
- `supabase functions deploy` ×4 성공, `supabase secrets set GOOGLE_MAPS_SERVER_API_KEY=...` 완료.
- 프로덕션 curl 재검증 중 `Could not resolve host`(DNS 문제로 오인) → 실제로는 Authorization 헤더에 넣은 Publishable key 값이 터미널에 잘못 붙여넣어져 발생한 문제로 추정, 변수(`SUPA_KEY`)에 담아서 재시도 후 정상 200 OK 확인.

---

## 3. Xcode/시뮬레이터 빌드에서 겪은 문제 (Phase 4 실기기 테스트 준비)

| 이슈 | 원인 | 해결 |
|---|---|---|
| `Required property 'ios.bundleIdentifier' is not found` | `app.config.ts`에 번들 ID 미설정 | `ios.bundleIdentifier`, `android.package` 추가 |
| `CommandError: Failed to build iOS project` (exit code 70) | 여러 단계로 판명 | 아래 참고 |
| ㄴ 1차: 캐시된 시뮬레이터 UDID 문제로 추정 | `.expo`, DerivedData 캐시 삭제 후 재시도했지만 동일 에러 | 원인 아님으로 판명 |
| ㄴ 2차: `xcodebuild -showdestinations`에 시뮬레이터가 아예 안 잡힘 | **Xcode 26.6 버전이 기존 iOS 17.2 시뮬레이터 런타임과 호환 문제** | Xcode에서 iOS 26.5 플랫폼(8.52GB) 추가 다운로드 → 해결 |
| CocoaPods 미설치 | 새 Mac/새 프로젝트라 CLI 자체가 없었음 | `prebuild` 과정에서 자동 설치 진행(Gem 통해) |
| 학교 와이파이에서 Expo Go QR 스캔 연결 안 됨 | AP 격리(client isolation)로 추정 | tunnel 모드도 실패 → 최종적으로 iOS 시뮬레이터로 우회(네트워크 의존 없음) |

---

## 4. Phase 5 — 저장(commit) 기능 디버깅 (가장 핵심적인 부분)

### 4.1 증상
"순서 변경 후 저장" 등 저장 관련 테스트(a)(c)(d)가 전부 "저장에 실패했어요" 토스트로 실패.

### 4.2 원인 규명 과정 (단계별로 다른 원인이 겹쳐 있었음)

**1차 원인 — 익명 로그인 자체가 실패**
- Metro 로그에서 `[supabase] 익명 로그인 실패: Anonymous sign-ins are disabled` 발견.
- Supabase 프로젝트의 Authentication 설정에서 익명 로그인 기능 자체가 꺼져 있었음(문서 §3.5 설계의 전제조건이 안 갖춰진 상태).
- 대시보드 → Authentication → Settings에서 "Allow anonymous sign-ins" 토글을 켜고 **Save 버튼을 누락**해서 처음엔 반영이 안 됐다가, Save 후 로그인 성공으로 전환.

**2차 원인 — 로그인은 되는데 여전히 저장 실패**
- Postgres Logs에서 `42501: new row violates row-level security policy for table "course_items"` 확인.
- `courses` 테이블 최근 데이터를 조회해보니 여전히 seed 코스(`c9`,`c10`,`c11`, author_id가 `user1`~`user3`)만 있음 → **"새 코스 만들기" 자체가 실행된 적이 없다는 것을 발견**.
- 근본 원인: RN 앱에 아직 "코스 목록/새 코스 만들기" 화면이 구현되어 있지 않아서, 테스트할 때마다 자기도 모르게 seed 코스(남의 소유)를 열어서 편집하고 있었음. 즉 RLS가 막은 게 버그가 아니라 **정상 동작**이었던 것.

**3차 — 화면 없이 검증할 방법 모색**
- 웹 프로토타입에서 코스를 만드는 방법도 고려했으나, 웹이 같은 인증 흐름(익명 로그인)을 안 쓸 가능성이 높아 `author_id` 불일치가 재발할 리스크가 있다고 판단 → 채택 안 함.
- 대신 **SQL Editor에서 직접 테스트 코스 생성**:
  1. `auth.users` 테이블에서 현재 익명 세션의 실제 uid 조회
  2. 그 uid를 `author_id`로 하는 `courses` 행 직접 insert (도중 `total_distance` 등 NOT NULL 컬럼 누락으로 한 번 실패, 컬럼 채워서 재시도 성공)
  3. `course_items`에 기존 `restaurants` 행을 참조하는 테스트 아이템도 직접 insert
- **화면 접근 문제 해결**: "코스 선택 화면"이 없어도 되도록, Expo Router의 딥링크 기능 활용.
  - `app.config.ts`의 `scheme` 값(`lunchie-munchie`) 확인
  - `xcrun simctl openurl booted "lunchie-munchie://course/test-my-course-1/edit"`로 특정 코스 편집 화면에 직접 진입
  - 최초엔 "다른 식당들이 보였다"는 보고로 딥링크가 엉뚱한 코스를 열었나 의심했으나, 재확인 결과 실제로는 "테스트 코스"가 정상적으로 열린 것으로 확인됨

### 4.3 현재 상태 (미해결)
- 딥링크로 정확한 테스트 코스가 열리는 것은 확인됐으나, 그 이후 **식당 추가(add) 자체가 안 되는 증상**이 새로 발생.
- Google Maps 클라이언트 키 교체(§5 참고) 직후라 그것 때문인지 의심했으나, add/검색 플로우는 서버 키 기반 Edge Function 경로라 클라이언트 키와는 무관한 것으로 판단.
- 정확한 원인 파악을 위해 Edge Function 로그, API Logs(요청 body) 확인이 필요했으나, **Supabase 자체 장애("We are investigating a technical issue")**로 로그 조회가 막혀 디버깅이 일시 중단된 상태.
- Supabase 상태 복구 후 이어서 확인 필요.

---

## 5. Google Cloud 키 보안 정리

### 5.1 발견된 문제
- Google Cloud Console에 `server-places-directions-key`(정상, 오늘 만든 것) 외에 **"Maps Platform API Key"라는 이름의 동일한 키 2개**가 존재.
- 둘 다 확인해보니:
  - **API restrictions**: Directions, Places API (New), Places API 포함 사실상 Google Maps Platform 전체 API가 다 체크되어 있음(제한 없음과 다름없는 상태)
  - **Application restrictions**: None (앱 제한 전혀 없음)
- 이는 문서 §4.5의 "클라이언트 키 ≠ 서버 키, 각각 제한 필수" 원칙과 완전히 배치되는 상태였고, 예전에 `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`로 클라이언트 빌드에 박혀 노출됐을 가능성이 제기됨(Claude Code가 Phase 6 사전 점검에서 처음 지적).

### 5.2 해결
- 두 개의 "Maps Platform API Key" 중:
  - 하나는 이름을 `mobile-client-maps-key`로 변경, API restriction을 **Maps SDK for iOS / Maps SDK for Android**로만 좁힘, Regenerate로 키 값 자체를 새로 발급받아 이전 노출 가능성 무효화.
  - Application restriction(iOS bundle ID / Android 패키지명+SHA-1)은 시간 관계상 **당장은 None으로 유지**하기로 결정(API restriction만으로 우선 리스크 완화, Google Play/App Store 정식 배포 전 반드시 마무리하기로 함).
  - 나머지 중복 키 하나는 완전히 Delete.
- 새로 발급받은 키 값을 `mobile/.env`의 `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`에 반영.

### 5.3 남은 보안 관련 TODO
- `env.enc`(정체불명의 openssl 암호화 파일, 프로젝트 루트) `.gitignore` 처리 — 안내는 했으나 실행 여부 최종 확인 필요.
- Android bundle 제한(패키지명+SHA-1) 마무리.
- `hooks/useNearbyPlaces.ts`(클라이언트에서 Google 키 직접 노출하는 구식 코드) — 삭제 여부 논의 후 **"삭제하지 않고 유지"로 결정**(다른 팀원이 작업 중일 가능성 고려).

---

## 6. 대화를 통해 확인한 핵심 교훈

1. **에러 메시지의 표면적 원인과 실제 원인이 다를 때가 많았다.** "저장 실패"라는 한 가지 증상 뒤에 (1) 익명 로그인 비활성화 (2) 화면 미구현으로 인한 잘못된 테스트 대상(seed 코스) 두 가지 별개 원인이 순차적으로 숨어 있었다.
2. **로그를 어디서 봐야 하는지 아는 게 디버깅 속도를 좌우했다.** 앱 토스트 문구만으로는 원인 파악이 안 됐고, Metro 로그 → Postgres Logs(에러 코드) → API Logs(요청 payload) 순서로 파고들어야 각 단계의 진짜 원인이 드러났다.
3. **화면이 없어도 백엔드 로직은 검증 가능하다.** RN의 다른 화면(코스 목록, 코스 생성)이 구현 안 된 상태에서도, SQL 직접 insert + Expo Router 딥링크 조합으로 특정 화면에 원하는 데이터로 진입시켜 저장 로직만 독립적으로 검증할 수 있었다. 전체 화면을 먼저 다 구현할 필요는 없었다.
4. **보안 점검은 "이미 다 됐다"고 넘기지 않고 재확인이 필요했다.** 서버 키는 잘 관리됐지만, 별도로 방치된 무제한 클라이언트 키 2개가 발견된 것은 Claude Code의 사전 점검 프롬프트(Phase 6) 덕분이었다 — 기능 구현이 끝났다고 보안 상태까지 끝난 게 아니라는 점.
5. **외부 서비스 장애는 디버깅 판단에 넣어야 한다.** Supabase 자체 장애 중에 로그가 안 보이는 걸 "내 설정이 잘못됐다"로 오인하지 않고, 상태 페이지 확인 후 디버깅을 잠시 중단하고 무관한 작업(gitignore, 키 정리)으로 전환한 것이 시간 낭비를 줄였다.

---

## 7. 다음에 이어서 할 것

- Supabase 장애 복구 확인 (status.supabase.com)
- Edge Function 로그로 "식당 추가 안 됨" 증상 원인 파악
- (a)(c)(d) 저장 테스트, (b)(e)(f) 나머지 시나리오 마저 검증
- Android 앱 제한(SHA-1) 마무리
- `env.enc` gitignore 처리 최종 확인

---

## 8. 팔로우 기능 · Phase 0→5 (2026-07-11)

> 대상 문서: `follow-feature-workflow.md`. 단방향 팔로우(Instagram 방식) 기능 신규 구현.

### 8.1 확인한 원인/배경
- `user_follows` 테이블은 이미 존재했지만 RLS ENABLED + 정책 0개 = 전면 거부 상태(§1.2), `public.users`도 동일. 실측(2026-07-10): `auth_users=1, public_users=0` — 익명 가입이 `public.users` 행을 자동으로 만들지 않는다는 게 이번 기능의 실질적 전제.

### 8.2 Phase별 진행
- **Phase 0**: `supabase/migrations/20260711000000_follow_rls_and_rpc.sql` 생성(§5.1 RLS 6개 + §5.2 프로비저닝 트리거 + §5.2.1 backfill + §5.3 follow/unfollow RPC). 적용은 안전 게이트라 파일만 만들고 대기 — 사용자가 직접 `supabase db push` 실행.
- **Phase 1**: `mobile/types/db.ts`에 `User`/`UserFollow`, `shared/schema.ts`에 `userFollows` drizzle 정의 추가. 타입체크 통과.
- **Phase 2**: `mobile/services/followsApi.ts` 6개 순수함수. FK 없음 → `itemsApi.getItems`와 동일한 2쿼리 클라이언트 조인 + orphan 제외 패턴 재사용.
- **Phase 3**: `mobile/hooks/`에 useCurrentUserId/useIsFollowing/useFollowCounts/useFollowers/useFollowing/useToggleFollow. useToggleFollow는 낙관적 업데이트 + 롤백 + 정착 시 무효화(문서 §6.2 대비 내 자신의 followCounts도 함께 무효화하도록 범위를 살짝 넓힘 — 안 그러면 팔로우해도 내 "팔로잉 수"가 안 바뀌는 UX 버그).
- **Phase 4**: `FollowButton`/`ProfileStats`/`FollowerListSheet` 3종. 문서는 "NativeWind로"라 했지만 기존 컴포넌트 전부가 StyleSheet+THEME만 쓰고 있어(NativeWind 설정은 있으나 미사용) 기존 관례를 따름. 아직 어떤 화면에도 배선 안 함(Phase 4 범위 자체가 컴포넌트만).

### 8.3 Phase 5 — 검증 결과
- **backend-verifier**(라이브 원격 DB, 사용자 명시 승인 후 진행 — `supabase db query`는 기본적으로 postgres superuser라 RLS를 우회하므로, 각 스텝을 `set local role authenticated` + `set_config('request.jwt.claims', ...)`로 uid를 실제로 흉내내는 트랜잭션으로 감싸 실행): §8.1 8단계 전부 PASS.
  - 멱등 팔로우/언팔로우, 자기팔로우 차단(RPC의 `raise exception`), B가 A의 팔로우 행을 못 지움(RLS), 카운트 정확 — 전부 실측 확인.
  - `auth_users=2, public_users=2` — 트리거가 신규 익명 유저(검증용으로 새로 만든 `uid_b`) 생성 즉시 `public.users`를 backfill하는 것도 실측.
  - 부작용: 검증 과정에서 만든 테스트 익명 유저(`uid_b = 4bd94aae-b3d4-4a53-b4e1-07431b71ae18`)가 `auth.users`/`public.users`에 남아 있음 — `user_follows` 테스트 행 자체는 언팔로우로 자연 정리됐지만, auth 유저 삭제는 권한 범위 밖이라 사람 판단 필요.
- **security-auditor** GATE: **PASS**(경미한 방어심층 권고, 차단 아님).
  - Google 키 분리/서버 키 미노출/.gitignore 전부 이상 없음(이번 diff가 Google 관련 코드를 안 건드림).
  - RPC(`follow_user`/`unfollow_user`) 둘 다 `security invoker` 확인(RLS 우회 없음), `handle_new_user`만 의도된 `security definer`.
  - **발견(비차단)**: `user_follows_insert` 정책이 `follower_id = auth.uid()`만 검사하고 `following_id <> follower_id`는 안 걸러서, 클라이언트가 RPC를 우회해 PostgREST로 직접 insert하면 자기팔로우 행 생성이 가능함(권한 상승/사칭은 불가 — `follower_id`는 여전히 강제됨. 데이터 정합성 이슈일 뿐). 사람에게 후속 마이그레이션(`user_follows_insert`에 `following_id <> follower_id` 추가 또는 CHECK 제약)으로 고칠지 결정 요청함.

### 8.4 GATE 발견 사항 후속 조치 (2026-07-11, 사람 승인 후 진행)
- `supabase/migrations/20260712000000_follow_self_follow_guard.sql` 생성·적용: `user_follows`에 `check (follower_id <> following_id)` CHECK 제약 추가 — RLS 정책이 아니라 테이블 제약으로 막아 RPC 우회(직접 PostgREST insert) 경로까지 원천 차단. 적용 후 `pg_constraint`로 실측 확인.
- `db push` 과정에서 겪은 이슈: 이전 마이그레이션(`20260711000000`)을 사용자가 SQL Editor로 직접 적용해서 CLI 마이그레이션 이력에 "적용됨"으로 안 남아 있었고, 그래서 `db push`가 그걸 재적용하려다 정책 중복 에러(`42710`)로 실패. `supabase migration repair --status applied 20260711000000`로 이력만 맞춘 뒤(안전 게이트 항목, 사람이 직접 터미널에서 실행) 재시도해 해결. **교훈: SQL Editor로 직접 적용한 마이그레이션은 CLI 이력과 어긋나므로, 다음에 파일 기반 마이그레이션을 추가할 땐 먼저 `migration list`로 drift 여부를 확인하는 게 낫다.**
- 검증용 익명 테스트 유저(`uid_b = 4bd94aae-b3d4-4a53-b4e1-07431b71ae18`) 및 연관 `public.users` 행 삭제 완료(사람 승인 후 진행). 삭제 후 `auth_users=1, public_users=1`로 원상 복구 확인.

### 8.5 남은 TODO (팔로우 백엔드/컴포넌트 사이클 기준 — §9 화면 배선으로 해소됨)
- ~~`FollowButton`/`ProfileStats`/`FollowerListSheet`를 실제 프로필 화면에 배선~~ → §9에서 완료.
- `mobile/.env.example`이 `.gitignore`의 `.env.*` 패턴에 걸려 커밋 추적이 안 되고 있음(값 없는 템플릿이라 비차단, 온보딩 편의상 예외 규칙 고려 가능).

---

## 9. 팔로우 화면 배선 · Phase 0→5 (2026-07-11)

> 대상 문서: `follow-screen-wiring-workflow.md`. §8에서 완성된 팔로우 백엔드/컴포넌트를 실제 화면(탭바+프로필)에 얹고 동선을 연결.

### 9.1 확인한 원인/배경
- §8까지 백엔드·서비스·훅·컴포넌트(`FollowButton`/`ProfileStats`/`FollowerListSheet`)는 완성됐지만 `mobile/app`엔 프로필 화면도 탭바도 전혀 없어 실제로 쓸 방법이 없었다.
- 웹 `client/src/pages/ProfilePage.tsx`는 mock 데이터(이모지 아바타·스와이프 스탯·카테고리 Top5·식단)를 쓰지만 실제 `public.users` 컬럼은 `id/username/profile_image_url/bio/location/created_at`뿐 — 그대로 포팅하면 존재하지 않는 데이터에 배선하게 되므로, 문서 §2에서 "실데이터 있는 것만 배선, 나머지는 defer" 원칙을 먼저 확정하고 시작.

### 9.2 Phase별 진행
- **Phase 0**: `followsApi.getUser(userId)` + `hooks/useUser.ts`(`coursesApi.getCourse`/`useCourse` 패턴 재사용).
- **Phase 1**: `app/(tabs)/_layout.tsx`(Expo Router `Tabs`, '프로필' 탭만 필수, 지도/런치/저장은 백업 라우트가 없어 주석 자리만). 기존 루트 `app/index.tsx`(자동 리다이렉트 `/course/c1/edit`)를 그대로 옮기면 탭 진입 즉시 다른 화면으로 튕겨나가 탭바 자체를 확인할 수 없어서, `(tabs)/index.tsx`는 정적 스텁 + 개발용 링크로 대체(자동 리다이렉트 아님 — 문서가 "이전 or 스텁" 둘 다 허용해서 스텁을 택함). 이 때문에 `Tabs.Screen(name="profile")`이 참조할 라우트가 없어 깨지는 걸 막으려고 `(tabs)/profile.tsx`도 최소 스텁으로 먼저 만들어둠(Phase 3에서 교체).
- **Phase 2**: `components/ProfileView.tsx` — 헤더(아바타/이니셜 플레이스홀더/username/가입일/bio·location) + `FollowButton` + `ProfileStats` + `FollowerListSheet`(visible/mode 소유, `AddRestaurantSheet` 패턴). defer 항목(스와이프/카테고리/식단)은 빈 데이터 배선 없이 "맛집 분석 준비중" 카드 하나로만 자리 유지.
  - **자체 발견 버그**: 처음 작성 시 `FollowerListSheet`를 별도 미사용 export로 분리해버려서 시트가 전혀 렌더링 안 되는 상태였음. 같은 턴에서 발견해 `<>...</>` 프래그먼트로 `ScrollView`와 형제로 함께 반환하도록 즉시 수정.
- **Phase 3**: `(tabs)/profile.tsx`(Phase 1 스텁 교체, `useCurrentUserId()`로 내 uid) + `profile/[id].tsx`(`useLocalSearchParams`, 뒤로가기 헤더는 `course/[id]/share.tsx` 헤더 스타일 재사용) — 둘 다 `<ProfileView>` 공유.
- **Phase 4**: 진입 동선 2곳 배선 — (1) `course/[id]/edit.tsx`에 작성자 칩 신규 추가(원래 작성자 표시 UI 자체가 없었음, `useUser(course.author_id)` + 탭 시 `/profile/<author_id>`), (2) `FollowerListSheet` 행의 아바타/username 영역 탭 → `onClose()` 후 `/profile/<id>` push(`FollowButton`은 별도 형제 엘리먼트라 버튼 탭이 행 이동으로 안 번짐).

### 9.3 Phase 5 — 검증 결과
- **시뮬레이터 실기 확인**: 이 작업 환경엔 iOS/Android 시뮬레이터가 없어 직접 스크린샷 검증 불가. `expo start --web`도 `react-native-maps`/`reanimated`/`gesture-handler` 등 네이티브 모듈 의존성 때문에 무관한 실패를 유발할 위험이 커서 시도하지 않음. **사용자가 직접 `npx expo run:ios`로 확인하고 결과를 알려주기로 합의** — 문서 §6.1의 "탭바→프로필, 코스 작성자→타인 프로필, 팔로우 토글, 시트 순회" 왕복은 아직 사람 확인 대기 중.
- **backend-verifier**(코드 경로 추적 + read-only 라이브 점검 — 실기 대체): 두 진입 동선(팔로우 버튼 탭→`follow_user`/`unfollow_user` RPC, `FollowerListSheet` 행 탭→`/profile/[id]`→`getUser`→`users` 테이블) 전부 file:line 단위로 끊김 없는 호출 체인 확인, PASS. 라이브 read-only 점검(유저 데이터 존재, RPC가 여전히 `security invoker`)도 PASS.
- **security-auditor** GATE: **PASS**. 이번 diff는 순수 프론트 배선(마이그레이션/새 env 없음)이라 Google 키·서버 키 노출 항목은 회귀 없음 확인. 화면-배선 특유 점검(라우트 파라미터 인젝션 표면, `getUser` 컬럼 노출 범위, `router.push` open-redirect류, 루트 `index.tsx` 삭제로 인한 딥링크 회귀) 전부 이상 없음. 미완료 TODO는 기존에 알려진 것들(Android 키 제한, `.env.example` 미추적, 지도/런치/저장 탭 미구현)만 승계.

### 9.4 남은 TODO
- 시뮬레이터 실기 왕복 확인 — 사용자가 `npx expo run:ios`로 직접 확인 후 결과 공유 예정.
- 지도/런치/저장 탭 실제 구현, 스와이프/좋아요 스탯 집계, 카테고리 Top5(ML), 식단 설정(스키마 확장 필요) — 전부 문서 §8 "스코프 밖"으로 명시된 후속 작업.
- 프로필 편집(username/avatar/bio) — `users_update` RLS는 이미 준비돼 있으나 UI는 아직 없음.
- `mobile-client-maps-key`의 Application restriction(iOS bundle ID / Android 패키지명+SHA-1) 마무리 — 기존부터 이어지는 TODO, 이번 사이클과 무관하게 여전히 미해결.

---

## 10. 로그인(Google) · Phase 0 스파이크 + "무한 로딩" 이슈 해결 (2026-07-12)

> 대상 문서: `login-workflow.md`. Apple Developer 멤버십 미보유로 **Google 단독 1차 구현**으로 스코프 축소(문서에 명시). 목적: §2.2 "네이티브 id-token linkIdentity가 uid를 보존하는가"라는 전체 설계의 린치핀을 실기로 검증.

### 10.1 Phase 0 셋업
- 게이트 2(Google Cloud OAuth client ID 2종: iOS/Web) · 게이트 3(Supabase Google provider + manual linking) 사람이 완료.
- `@react-native-google-signin/google-signin@16.1.2`, `expo-crypto@15.0.9` 설치. `mobile/.env`에 `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`/`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` 추가(둘 다 공개 OAuth client ID, 시크릿 아님 — security-auditor가 GOCSPX 패턴 부재로 재확인).
- `mobile/app.config.ts`: google-signin config plugin + `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`에서 reversed URL scheme(`com.googleusercontent.apps.<id>`) 자동 계산해 주입. "Firebase 설정파일 없이" 모드라 `iosUrlScheme` 명시 필수(라이브러리 `validateOptions` 확인).
- `mobile/components/GoogleLinkSpike.tsx` — Phase 1(`services/authApi.ts`) 이전 1회성 검증 도구로 신규 작성, `(tabs)/profile.tsx`에 `__DEV__` 한정 배선.

### 10.2 겪은 이슈 1 — nonce 불일치 (`resolve-issue` 밖, 즉시 해결)
- 증상: `AuthApiError: Passed nonce and nonce in id_token should either both exist or not.`
- 원인: `@react-native-google-signin`의 "Original" iOS API는 커스텀 nonce를 노출하지 않는데, Google iOS SDK가 자체 nonce를 id_token에 내부적으로 넣어 반환 — Supabase의 "nonce 파라미터와 id_token의 nonce 존재 여부가 XOR로 일치해야 함" 검증에 걸림. 라이브러리 쪽에서 고칠 방법 없음(다수 GitHub 이슈 확인).
- 해결: Supabase 대시보드 **Authentication → Providers → Google → "Skip nonce checks"** 토글(정확히 이 라이브러리 조합 때문에 Supabase가 공식 제공하는 옵션). 서명·issuer·audience·만료 검증은 그대로 유지되고, nonce 기반 replay 방지 한 겹만 빠짐 — 네이티브 모바일 흐름이라 실무상 허용되는 절충으로 판단.

### 10.3 겪은 이슈 2 — `/resolve-issue`: "계정 선택 후 무한 로딩" (6단계 루프)
- **TRIAGE**: 태그 `auth`+`client-key`. Skip-nonce-checks 켠 뒤 재빌드(AppCheckCore 11.2.0 핀 추가 포함) → Google 계정 선택 시 "문제가 발생했습니다" → 재시도 시 무한 로딩. 외부 장애 낮은 우선순위(결정론적 재현이라 아웃티지 패턴과 불일치).
- **RCA**: `issue-debugger` 서브에이전트 **의도적으로 미사용** — 결정적 신호가 기기(Metro/네이티브 콘솔)와 Supabase 대시보드에만 있어 read-only repo 도구로는 관측 불가, 직접 조사가 더 빠르다고 판단해 스킵(사유를 사람에게 먼저 설명하고 진행).
  - repo-side 전수 확인(전부 무죄로 결론): `expo-build-properties` 실제 설치 확인, `app.config.ts` 정합 확인, 빌드된 `ios/lunchiemunchie/Info.plist`에서 Google URL scheme이 reversed client ID와 정확히 매칭 확인, `Podfile.lock`에서 GoogleSignIn 9.2.0/AppCheckCore 11.2.0/AppAuth 2.1.0 등 pod 버전 전수 정합 확인 + `use_frameworks!` 미사용(애초에 AppCheckCore 핀이 막으려던 static-link 이슈 #1517 대상 아님, 핀 자체는 무해하지만 불필요했음을 확인).
  - 콘솔 로그 계측(`[GoogleLinkSpike]` prefix)을 스파이크에 추가해 JS 층까지는 정상 진행되고 `GoogleSignin.signIn()` 호출 이후 native에서 hang되는 지점을 확정.
  - 최종 원인: **iOS 시뮬레이터의 `ASWebAuthenticationSession` 웹세션 오염** — 직전 성공 로그인(nonce 에러 전 run)이 남긴 시뮬레이터 쿠키/세션 상태가 재시도를 방해. `Device → Erase All Content and Settings`로 해결.
- **FIX**: 코드 수정 2건(재발 방지·관측성, 안전 게이트 아님) — `signIn()` 전 `GoogleSignin.signOut()`으로 매번 fresh picker 강제(재시도 hang 방지), `hasPlayServices`를 Android 전용으로 플랫폼 가드. 근본 수정은 사람의 시뮬레이터 초기화.
- **VERIFY**: 사람이 시뮬레이터 초기화 후 재시도 → 앱 자체 리포트로 uid 보존(`5280cea9-...` 전후 동일) 확인. **backend-verifier**로 독립 재검증(자기 신고만 믿지 않음): `auth.users.is_anonymous=false` 실측, `auth.identities`에 `provider='google'` row가 정확히 그 uid에 연결됨 실측, `public.users` 중복 없음(트리거가 링킹에서 미발화 = §3.3 설계대로) 실측, 전체 카운트 4/4(기존 dev 테스트 유저 3명 + 이번 유저, 전부 1:1 매칭) 확인. **PASS**.
- **GATE**: `security-auditor` **PASS**. OAuth client ID vs Maps 키 혼동 없음, `client_secret`/`service_role` 유출 0건, `mobile/.env`·`*.p8` gitignore 정상. 비차단 권고 1건 — `GoogleLinkSpike.tsx`가 `JSON.stringify(signInResult)`로 idToken 포함 전체 응답을 콘솔에 로그 → 그 자리에서 즉시 수정(요약 필드만 로그, idToken 원문 제거).

### 10.4 핵심 결론
**login-workflow.md §2.2의 린치핀 가설이 실기+DB 독립 검증으로 확정됨**: 네이티브 id-token `linkIdentity`는 `auth.uid()`를 보존하며 동작한다. Phase 1(`services/authApi.ts` 정식 구현)로 진행 가능.

### 10.5 남은 TODO
- ~~`GoogleLinkSpike.tsx`는 Phase 1에서 `services/authApi.ts`로 대체~~ → §11에서 완료(대체는 됐으나 파일 자체는 dogfooding 도구로 유지, Phase 3에서 최종 삭제 예정).
- Apple Sign-In 보류 — App Store 제출 전 Apple Guideline 4.8 준수를 위해 필수(login-workflow.md에 명시), Apple Developer 멤버십 취득 후 재개.
- Android Application restriction(패키지명+SHA-1) — 기존부터 이어지는 TODO, 미해결.
- (참고) `AppCheckCore` 11.2.0 핀은 이 프로젝트엔 불필요했던 것으로 판명(static frameworks 미사용) — 제거해도 무방하나 무해하므로 이번엔 유지, 후속 정리 대상으로만 기록.

---

## 11. 로그인(Google) · Phase 1 서비스 레이어 + 충돌 경로 (2026-07-12)

> 대상 문서: `login-workflow.md` §6.2. §10에서 검증된 린치핀(uid 보존)을 바탕으로 정식 서비스
> 레이어 구현, 그리고 남아있던 미검증 항목(§2.3 충돌 케이스)까지 겸사겸사 확인.

### 11.1 구현
- `mobile/services/authApi.ts` 신규: `getGoogleIdToken`/`getAppleIdToken`(스텁, Apple 멤버십 취득 전까지 미구현 에러만 던짐, `expo-apple-authentication` import 안 함)/`linkOrSignIn`/`confirmConflictSignIn`/`signOutToAnonymous`/`syncProfileIfDefault`.
- **충돌 처리 2단계 설계**(§2.3 요구사항 "충돌 시 경고는 호출부(UI)가" 그대로 구현): `linkOrSignIn`이 `identity_already_exists` 에러 코드를 만나면 예외 대신 `{kind:'conflict'}`를 반환 → UI가 경고를 보여준 뒤에만 별도 함수 `confirmConflictSignIn` 호출.
- `GoogleLinkSpike.tsx`를 자체 로직 없이 `authApi.ts`를 그대로 호출하는 dogfooding 도구로 전환 — 정식 서비스 레이어의 첫 실사용처가 됨.

### 11.2 겪은 이슈 — 같은 시뮬레이터 세션 오염 재발 (반복, 새 버그 아님)
- 새 익명 유저로 Google 로그인 시도 시 §10.3과 동일한 "문제가 발생했습니다 → 무한 로딩" 재현.
- RCA를 처음부터 다시 하지 않고 **repo-side 무변경 확인**(git status, Info.plist scheme grep)만으로 "동일 원인 재발"을 빠르게 확정 — 원인은 앱 내 유저/세션이 아니라 **시뮬레이터 OS 레벨 `ASWebAuthenticationSession` 웹세션 상태**라 익명 유저를 바꿔도 안 씻김. `@react-native-google-signin` iOS 네이티브 레이어에 ephemeral 세션 옵션이 없어(라이브러리 코드 확인) **코드로 회피 불가**한 구조적 한계로 결론.
- 조치: 문서화만(`login-workflow.md` §8.3에 "알려진 한계"로 추가) — 매번 `Erase All Content and Settings` 필요, 반복 테스트 많으면 실기기 전환 권장. 사람이 시뮬레이터 초기화 후 재시도해 해결.
- 부가: 실기기 연결 방법(USB 직결, 신뢰, iOS 16+ Developer Mode, Xcode Devices 창 확인 순서)을 별도로 안내함 — Apple 유료 멤버십 없이도 무료 Apple ID 서명으로 실기기 테스트 가능(인증서 7일 만료 제약은 있음).

### 11.3 검증 — 충돌 경로 (§2.3 마지막 미검증 항목)
- 시나리오: 신규 익명 uid_B가 이미 uid_A(`5280cea9-...`)에 링크된 Google 계정으로 링크 시도.
- 앱 자기신고: uid 전=uid_B, 확인 후=uid_A, `is_anonymous(후)=false`, uid 보존 아님(의도된 동작 — 다른 계정으로 전환이므로).
- **backend-verifier 독립 재검증(read-only, 5개 항목 전부 PASS)**:
  1. uid_A `is_anonymous=false`, `last_sign_in_at`이 검증 시점 기준 매우 최근(≈2.6분 전) — 실제로 방금 로그인했음 확인.
  2. `auth.identities`에 `google` provider row **정확히 1개**, uid_A 소유(uid_B 소유 아님, 중복 없음) — 충돌 처리로 identity가 새로 생기거나 잘못된 uid에 붙지 않았음 확인.
  3. uid_B는 `is_anonymous=true`로 **미변경**(충돌 시도가 uid_B를 건드리지 않음 확인 — linkIdentity가 실패 시 아무 부작용 없이 깨끗하게 실패한다는 뜻).
  4. `public.users`에 uid_A/uid_B 각각 1행씩, 병합·중복 없음 — uid_B의 행은 문서화된 대로(§3.2) 도달 불가능한 잔여 데이터로 남음(버그 아님, 의도된 "파국 경로" 비용).
  5. 전체 카운트 `auth.users`=7, `public.users`=7 (1:1 일치).
- **security-auditor GATE**: **PASS**. `syncProfileIfDefault`가 anon-key 클라이언트로만 동작해 `users_update` RLS(`id=auth.uid()`)를 그대로 통과 — service-role 우회 없음 실측 확인. 콘솔 로깅 회귀 없음(idToken 원문 미노출 유지), `__DEV__` 게이팅 정상. 비차단 관찰 1건: `confirmConflictSignIn`이 독립 export라 서비스 레이어 자체는 "conflict를 먼저 봤는지"를 강제하지 않음 — 현재는 UI(스파이크/향후 LoginSheet)가 유일한 안전장치. Phase 3에서 유지해야 할 설계 제약으로 기록.

### 11.4 핵심 결론
§2.3에서 확정한 충돌 처리 설계 전체(경고 → 확인 → 기존 계정 전환, identity 중복 없음, uid_B 무결성 보존)가 **실기+DB 독립 검증으로 확정**됨. 이로써 `login-workflow.md` Phase 0(Google 몫)이 문서 기준으로 완전히 종료.

### 11.5 남은 TODO
- ~~순서 강제를 서비스 레이어에 넣을지~~ → §13에서 UI 단독 책임 유지로 재확인, 신규 회귀 아님.
- ~~`authApi.ts` 자동화 테스트 없음~~ → 여전히 없음(수동 검증만), §13에서도 승계.
- ~~Phase 2가 다음 단계~~ → §12에서 완료.
- Apple Sign-In·Android 키 제한 — §10.5와 동일, 여전히 미해결.

---

## 12. 로그인(Google) · Phase 2 부팅/세션 흐름 (2026-07-12)

> 대상 문서: `login-workflow.md` §6 Phase 2.

### 12.1 구현
- `mobile/lib/supabase.ts`의 `ensureAnonymousSession()`은 코드 변경 없이 **이미** "세션 있으면 그대로, 없으면 익명"이라 정식 로그인도 자동 보존됨을 재확인 — 불필요한 수정 안 하고 docstring만 명시.
- `mobile/hooks/useAuthStatus.ts` 신규: `{uid, isAnonymous}` 반환(`queryKey: ['authStatus']`). 기존 `useCurrentUserId`(uid만, follow 기능 전반이 이미 의존)는 시그니처 유지.
- `mobile/app/_layout.tsx`: `onAuthStateChange` 전역 구독 추가 — `SIGNED_IN`/`SIGNED_OUT`/`USER_UPDATED` 시 `queryClient.clear()`(`TOKEN_REFRESHED`/`INITIAL_SESSION` 제외). 개별 호출부(`authApi.linkOrSignIn` 등)마다 캐시 무효화를 기억할 필요 없이 세션 변경의 유일한 진실 공급원에서 한 번에 처리.

### 12.2 검증
네이티브 변경 없음(순수 JS), `tsc --noEmit` 통과. 실기 스모크 테스트는 §13 Phase 3 UI 완성 후 통합 확인.

---

## 13. 로그인(Google) · Phase 3 UI (2026-07-12)

> 대상 문서: `login-workflow.md` §7 Phase 3. Phase 0/1의 1회성 dogfooding 도구(`GoogleLinkSpike.tsx`)를 정식 프로덕션 UI로 교체.

### 13.1 구현
- `mobile/services/authApi.ts` 확장: `getGoogleIdToken()` 반환 타입을 `GoogleSignInResult`(`IdTokenCredentials` + `displayName`/`avatarUrl`)로 확장 — `GoogleSignin.signIn()` 응답에 이미 있던 프로필 필드를 그대로 흘려보내 `syncProfileIfDefault` 연결에 사용.
- `mobile/components/LoginSheet.tsx` 신규 — `FollowerListSheet`/`AddRestaurantSheet`와 동일한 Modal 바텀시트 패턴. `getGoogleIdToken → linkOrSignIn` 흐름, 충돌 시 경고 UI(`state.kind==='conflict'`일 때만 렌더) 뒤에만 `confirmConflictSignIn` 도달 가능하도록 상태 머신으로 강제. Apple 버튼은 `onPress` 없는 순수 코스메틱 placeholder(§2.1 "iOS엔 Apple 필수 노출" App Store 요건을 잊지 않기 위한 자리, 실제 API 호출 없음).
- `mobile/components/AccountBanner.tsx` 신규 — `(tabs)/profile.tsx`(내 프로필)에만 배선(`ProfileView`는 타인 프로필과 공유되므로 로그인 UI를 그 안에 넣지 않음, §3.2). 익명이면 로그인 유도+`LoginSheet` 오픈, 정식이면 계정 표시+로그아웃(`Alert.alert` 확인 후 `signOutToAnonymous()`).
- `mobile/components/GoogleLinkSpike.tsx` 삭제 — 정식 UI 완성으로 더 이상 필요 없음(자기 파일 docstring에 예고된 대로), 잔여 참조 0건 확인.

### 13.2 검증
- **security-auditor GATE**: **PASS**. 프로덕션 도달 가능 파일(`authApi.ts`/`LoginSheet.tsx`/`AccountBanner.tsx`) 전부 토큰/시크릿 로깅 없음(예전 스파이크와 달리 이제 `__DEV__` 가드가 없는 실사용 코드라 더 엄격히 확인함). `confirmConflictSignIn`이 경고 UI 렌더링 상태(`step.kind==='conflict'`)를 거치지 않고는 도달 불가능함을 상태 머신 추적으로 확인(회귀 없음, 기존 설계 제약 유지). 로그아웃은 `Alert.alert` 확인 없이 즉시 실행되는 경로 없음. 신규 env/Apple 관련 설정 없음, `GoogleLinkSpike` 완전 제거 확인.
- 사람 승인 필요(코드 범위 밖, GCP 콘솔 직접 조회 필요): 서버/클라이언트 Maps 키 API restriction 재확인, 무제한 키 전수 점검, Android Application restriction — 전부 기존부터 이어지는 항목.
- 실기 스모크 테스트는 사용자가 직접 확인 예정.

### 13.3 핵심 결론
`login-workflow.md` Phase 0~3(Google 몫) 전체 완료 — 백엔드 린치핀 검증(§10) → 서비스 레이어+충돌 처리(§11) → 세션/캐시 흐름(§12) → 실사용 UI(§13)까지 한 사이클로 이어짐. 남은 건 Apple(멤버십 취득 후)과 배포 전 보안 체크리스트 마무리뿐.

### 13.4 남은 TODO (§14에서 해소된 항목은 취소선)
- ~~실기 스모크 테스트 사용자 확인 대기~~ → §14에서 완료(전체 왕복 통과).
- Apple Sign-In — Apple Developer 멤버십 취득 후 재개(App Store Guideline 4.8, 제출 전 필수).
- GCP 콘솔 직접 점검(API restriction, 무제한 키, Android SHA-1) — 기존부터 이어지는 항목.
- `authApi.ts`/`LoginSheet.tsx`/`AccountBanner.tsx` 자동화 테스트 없음(수동 검증만).

---

## 14. 로그인(Google) · Phase 4 최종 검증 + 프로필 동기화 버그 발견·수정 (2026-07-12)

> 대상 문서: `login-workflow.md` §6 Phase 4(검증 루프 + GATE + work-log) — Google 로그인 기능의 마지막 사이클.

### 14.1 사용자 실기 테스트
프로필 배너 → 로그인 시트 → Google 로그인 → 로그아웃 → 익명 복귀 전체 왕복 통과 보고.

### 14.2 backend-verifier 최종 DB 검증 — 프로필 동기화 미동작 발견 (FAIL → RCA → FIX → 재검증 PASS)
- read-only 전수 점검(5개 항목): `auth.users` 최근 상태, `auth.identities` google row 유일성, **`public.users` 프로필 동기화**, `auth.users`↔`public.users` 양방향 LEFT JOIN 고아 검사, `user_follows` 스모크 체크.
- 4개 PASS, **1개 FAIL**: `syncProfileIfDefault`가 동작 안 함 — uid `5280cea9`의 `public.users.username`이 여전히 기본값(`user_5280cea9`), `profile_image_url`도 `null`.
- **RCA**: `auth.identities.identity_data`(JSON) 직접 조회로 Google이 `full_name="Work Testing"`/`avatar_url`을 정상 제공했음을 먼저 확인 — "데이터 없음"(원인 b) 가설을 배제하고 코드 버그(원인 a)로 확정. 코드 재검토 결과 `LoginSheet.tsx`의 `handleConfirmConflict`(충돌 경로)가 `confirmConflictSignIn`만 호출하고 `syncProfileIfDefault`를 아예 안 부르고 있었음 — 직접 성공 경로(`handleGoogle`)에만 붙어있던 누락. **이 버그는 사실상 거의 모든 실사용자에게 영향**을 준다 — 로그아웃 후 재로그인은 항상 새 익명 세션에서 이미 링크된 계정으로 붙는 충돌 경로를 타므로, 실질적으로 "최초 1회만 직접 링크, 그 이후는 전부 충돌 경로"가 정상적인 반복 사용 패턴이기 때문.
- **원인 상세**: `authApi.ts`의 `LinkOrSignInResult`의 `conflict` 케이스가 `credentials: IdTokenCredentials`(token/nonce)만 들고 있어, `getGoogleIdToken()`이 원래 반환한 `displayName`/`avatarUrl`이 충돌 경로에서 유실됨.
- **FIX**: `LoginSheet.tsx`의 `Step` 타입을 `credentials: IdTokenCredentials` 대신 **전체 `GoogleSignInResult`**(`displayName`/`avatarUrl` 포함)를 들고 있도록 변경, `handleConfirmConflict`도 `confirmConflictSignIn` 성공 후 `syncProfileIfDefault` 호출하도록 추가 — 직접 경로와 동일한 데이터 소스 사용.
- **재검증(사람 + backend-verifier 독립 확인)**: 앱 재시작 후 프로필 헤더가 "Work Testing" + Google 아바타로 표시됨(사람 확인) → DB read-only 재조회로 `public.users.username="Work Testing"`, `profile_image_url`에 실제 Google 아바타 URL 채워짐 확인(독립 재확인) — **PASS**.

### 14.3 최종 GATE
`security-auditor` **PASS**(전체 사이클 통틀어 최종 게이트). 수정된 두 경로(`handleGoogle`/`handleConfirmConflict`) 모두 동일한 프로필 데이터로 `syncProfileIfDefault` 호출 확인, `syncProfileIfDefault` 자체의 RLS 게이팅(anon-key 클라이언트만 사용, `users_update using(id=auth.uid())`) 약화 없음 재확인, 토큰/시크릿 로깅 0건, `.gitignore`/git 히스토리 재확인 전부 클린.

### 14.4 login-workflow.md §9 DoD 최종 상태
- [x] 익명→링크 후 uid 보존 + 기존 데이터 유지
- [x] 충돌 시 경고 후 기존 계정 로그인
- [x] 프로필 기본값-한정 동기화(이번 사이클에서 버그 수정 후 확정) + 로그아웃→익명 복귀
- [x] 인증 시크릿 미노출
- [ ] Apple — 스코프 아웃 유지(멤버십 취득 후 재개)

**Google 로그인 기능은 이것으로 완료.**

### 14.5 핵심 교훈
"UI에서 로그인 성공했다"와 "그 성공 경로의 모든 분기가 동일하게 동작한다"는 다른 명제다 — 이번 버그는 앱에서 여러 번 로그인 시도가 전부 '성공'으로 보였지만, 그중 실사용 흐름에서 가장 흔한 경로(재로그인=충돌 경로)만 조용히 프로필 동기화를 건너뛰고 있었다. `backend-verifier`의 read-only 전수 점검이 아니었다면 "기능은 되는데 왜 프로필이 안 바뀌지"가 나중에 별도 버그 리포트로 들어왔을 사안 — Phase별 GATE를 통과했어도 마지막에 실제 최종 상태를 다시 훑는 Phase 4가 이 클래스의 버그를 잡는 유일한 지점이었다.

### 14.6 남은 TODO
- Apple Sign-In — Apple Developer 멤버십 취득 후 재개(App Store Guideline 4.8, 제출 전 필수).
- GCP 콘솔 직접 점검(API restriction, 무제한 키, Android SHA-1) — 기존부터 이어지는 항목, 미해결.
- `authApi.ts`/`LoginSheet.tsx`/`AccountBanner.tsx` 자동화 테스트 없음(수동 검증만) — 여전한 갭.

---

## 15. Lunchmate 미니룸 테마 에셋 교체 (2026-07-24)

### 15.1 구현
- 기존 `lm_profile.foodieSkin` 여섯 ID와 저장 흐름은 유지하고, 별도 `skinId → assetKey` 매핑을 추가했다. 예외 매핑은 `yellow-munchtray → yellow-lunch-tray`이며 저장값 마이그레이션은 없다.
- 제공 ZIP의 `stages`/`profile`/`thumbnails` 1x·2x PNG를 정적 에셋으로 설치했다. FoodieRoom은 3:2 stage, Profile은 compact profile crop, 선택기는 2열 thumbnail card를 사용한다.
- 캐릭터 렌더러와 costume/face/feeding/sitting/drag/tap/reduced-motion 흐름은 변경하지 않고 배경만 가장 아래 레이어로 교체했다.

### 15.2 검증
- `pnpm check` PASS.
- 전체 Vitest 31 files / 377 tests PASS.
- production `pnpm build` PASS, `git diff --check` PASS.
- 360×800 Chrome 확인: 카드 범위 32–328px, 각 142px로 잘림 없음. `yellow-munchtray` 선택 직후 stage가 `yellow-lunch-tray`로 변경되고 localStorage 저장값은 기존 ID로 유지됨. `/profile` 복귀 후 720×260 compact crop과 동일 테마 복원 확인.

### 15.3 GATE
- **PASS (메인 에이전트 1회 검토)**: DB/API/localStorage schema, XP/reward, Lunchbox/feeding, pointer 처리, loadout 계약 변경 없음. 신규 env/키/네트워크 입력 없음. 클라이언트에 서버 키나 `service_role` 추가 없음. `.env`, `.env.*`, `env.enc` ignore 유지.
- 기존 미완료 보안 TODO인 Google 키의 GCP 콘솔 제한 전수 확인과 Android 패키지명+SHA-1 Application restriction은 이번 순수 프론트 에셋 작업과 무관하며 그대로 남아 있다.

---

## 16. Lunchmate 방 독립 커스터마이징 (2026-07-24)

### 16.1 구현
- `lm_profile`에 optional `lunchmateRoomLoadout`만 추가했다. 필드가 없는 legacy 프로필은 현재 `foodieSkin` preset을 render-time에 파생하며 읽기만으로 필드나 storage를 마이그레이션하지 않는다.
- manifest의 벽지/바닥/가구/소품 24개 ID를 검증하는 정규화 계층과 공용 `LunchmateRoomRenderer`를 추가했다. stage와 Profile crop 모두 wallpaper → floor → furniture → props 순서이며 character/status/interaction보다 아래에 렌더한다.
- 추천 테마와 네 개별 카테고리를 pill + 2열 카드 UI로 제공한다. preset 선택은 실제 기존 `foodieSkin`과 네 필드를 함께, 개별 선택은 해당 필드만 기존 `updateProfile` merge 경로로 즉시 저장한다. 가구/소품의 `null`은 없음으로 유지한다.
- runtime asset만 `room-customization/`에 설치했고 ZIP의 `source/`, `previews/`, 생성 문서는 번들하지 않았다.

### 16.2 검증
- 집중 Vitest 8 files / 182 tests PASS, 전체 32 files / 392 tests PASS. 마지막 legacy 최초-write guard 추가 후 관련 2 files / 19 tests도 PASS.
- `pnpm check`, production `pnpm build`, `git diff --check` PASS. 마지막 guard 후 전체 재실행은 잔여 Vitest worker 부하로 120초 timeout이 났고, 관련 suite 재검증과 최종 `git diff --check`는 통과했다.
- 360×800 Chrome: document width=viewport width=360으로 page overflow 없음, 다섯 pill은 내부 horizontal scroll. 혼합 선택 후 `wallpaper_blue_note` + `floor_walnut` + `furnitureId=null` + `props_blue_note`가 즉시 저장되고 stage/Profile에 동일 조합 적용 확인.
- 모든 room image의 computed `pointer-events:none`, Profile DOM에서 background가 character보다 앞(아래 layer)에 위치함을 확인했다.

### 16.3 GATE
- **PASS (메인 에이전트 1회 검토)**: DB/API/Supabase/migration/package 변경 없음. foodieSkin, costume/loadout, feeding/XP/Level Up/reward, tap/drag 계약 회귀 없음. 신규 env·키·외부 입력 없음.
- 기존 미완료 보안 TODO인 Google 키 GCP 제한 전수 확인과 Android 패키지명+SHA-1 Application restriction은 그대로 남아 있다.
