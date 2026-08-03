# Lunchie Munchie CI/CD · Cloudflare 접근 정책

> 적용일: 2026-08-03  
> 원칙: **운영 변경은 GitHub `main` 병합 후 CI만 수행한다. 사람·토큰·워크플로 모두 Lunchie Munchie 리소스만 접근한다.**

## 1. 허용 대상(allowlist)

Cloudflare에서 이 정책이 허용하는 리소스는 아래뿐이다. 이름이 비슷하더라도 아래 목록에 없는 리소스는 Lunchie Munchie 범위가 아니다.

| 구분 | 허용 리소스 | 허용 목적 |
| --- | --- | --- |
| GitHub | `PlanJoker/lunch-munchie_proto` | 코드 검토, 품질 검사, 운영 배포 자동화 |
| Pages | 프로젝트 `lunchie-munchie` / `lunchie-munchie.pages.dev` | `main`의 공개 운영 사이트 배포 |
| D1 | `lunchie-db` (`7d0e2717-d86d-42f8-9104-e02f33797695`) | 커밋된 마이그레이션 적용 및 앱 런타임 데이터 저장 |
| Worker / Durable Objects | 스크립트 `lunchie-munchie-state` | `USER_DO`, `SESSION_DO` 상태 객체 배포·실행 |
| R2 | 버킷 `lunchie-photos` | 앱이 소유권 확인을 거친 게시물 사진 저장·조회·삭제 |
| Pages 런타임 비밀값 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SESSION_SECRET` | Google OAuth 및 세션 서명 |

다음은 명시적으로 **금지**한다: 다른 Pages/Workers/D1/R2, Vationo·researchq 등 다른 서비스, DNS·Zone, WAF·Access·Zero Trust 전역 관리, 계정 멤버·그룹·결제, 계정 API 토큰, 이메일·사용자 디렉터리, KV·Queues·AI·Analytics 설정 변경.

`lunchie-munchie.pages.dev`의 실제 사용자 서비스는 공개한다. Cloudflare Access는 미리보기와 관리용 배포에만 적용하며, 공개 운영 URL을 막지 않는다.

## 2. 역할별 최소 권한

| 주체 | 허용 | 금지 |
| --- | --- | --- |
| 일반 개발자 | GitHub feature branch/PR, 로컬 D1·로컬 Pages 개발, CI 로그 열람 | 운영 Cloudflare API 토큰, 운영 D1 직접 실행, Pages/Worker 수동 배포, 운영 비밀값 열람·변경 |
| 리뷰어 / Maintainer | PR 승인, CI 실패 분석, Cloudflare 읽기 전용 관측 | 일상적인 운영 수동 변경 또는 광범위한 계정 권한 부여 |
| GitHub Actions 배포 신원 | 이 문서의 3절에 적힌 최소 배포 작업 | 사람 계정으로 로그인, 미승인 리소스 접근, R2·DNS·멤버·결제 변경 |
| 비상 담당자 (break-glass) | 승인된 장애에서만 제한된 수동 복구·비밀값 교체 | 평상시 작업, 범위 밖 서비스 변경, 변경 기록 없는 작업 |

개발자를 Cloudflare 팀/Zero Trust 그룹에 추가해야 한다면 기본값은 **Lunchie Munchie 관측 전용**이다. Pages, Worker, D1, R2의 상태·로그를 읽는 권한만 부여하고, Write/Edit 권한은 CI에만 둔다. 사람별 개인 API 토큰은 만들지 않는다.

Cloudflare UI가 특정 권한을 리소스 단위로 좁힐 수 있으면 반드시 위의 이름 하나만 선택한다. UI가 계정 범위만 제공하는 경우에도 가장 작은 capability만 선택하고, 토큰은 GitHub Environment `production`의 secret에만 보관한다.

## 3. CI 토큰 허용 규칙

| GitHub Secret | 필요한 Cloudflare 권한 | 사용할 수 있는 명령 / 대상 | 명시적 제외 |
| --- | --- | --- | --- |
| `CLOUDFLARE_D1_MIGRATIONS_TOKEN` | D1 Edit — `lunchie-db`만 | `wrangler d1 migrations apply lunchie-db --remote` | 다른 DB, 임의 SQL·데이터 내보내기, R2, Pages, Worker, DNS, 멤버, 결제 |
| `CLOUDFLARE_WORKER_DEPLOY_TOKEN` | Workers Scripts Edit — `lunchie-munchie-state`; Durable Objects Edit — 해당 스크립트; Pages Edit — `lunchie-munchie` | `wrangler deploy --config wrangler.state.toml`, `wrangler pages deploy … --project-name=lunchie-munchie --branch=main` | D1, R2, 비밀값 읽기/변경, DNS, Access/Zero Trust, 멤버, 결제, 다른 Worker/Pages |
| `CLOUDFLARE_ACCOUNT_ID` | 권한 없음(식별자) | 위 두 명령의 대상 계정 지정 | 인증 수단으로 사용 금지 |

배포 토큰은 R2 권한을 갖지 않는다. 사진은 Pages Functions가 `PHOTOS_R2` 바인딩으로 처리하며, 앱은 게시물·계정 소유권을 확인한 뒤 해당 객체만 조작한다. 대량 목록 조회·버킷 전체 삭제·다른 버킷 접근은 금지한다.

Cloudflare Pages Secrets는 GitHub에 복제하지 않는다. 지정된 비상 담당자만 Cloudflare Dashboard에서 값을 등록·교체하며, 값 자체를 채팅·이슈·PR·로그·`.dev.vars.example`에 남기지 않는다.

## 4. 배포 정책

```text
feature branch → Pull Request → quality.yml 통과 → main 병합
 → D1 migrations → state Worker/DO → Pages production
```

1. `.github/workflows/quality.yml`은 PR과 브랜치 푸시에서 타입 검사, Vitest, 로컬 Playwright E2E, Pages 빌드를 실행한다.
2. `.github/workflows/deploy-cloudflare.yml`은 `main` push에서만 실행된다. 작업 순서는 **D1 마이그레이션 → Durable Object Worker → Pages**로 고정한다.
3. 일반 개발자는 `wrangler … --remote`, `wrangler deploy`, `wrangler pages deploy`를 운영 대상으로 직접 실행하지 않는다.
4. `--no-verify`, 강제 푸시, CI 우회, GitHub secret을 로컬/코드에 복사하는 행위는 금지한다.
5. `main`에는 PR·필수 quality check·최소 1명 리뷰를 요구한다. GitHub `production` Environment 승인 규칙을 켰다면 승인 후에만 배포한다.

## 5. 데이터·마이그레이션 안전 규칙

- 운영 마이그레이션은 저장소의 `migrations/`에 커밋된 forward-only SQL만 적용한다.
- 자동 배포에는 테이블/컬럼 즉시 삭제, 무제한 데이터 갱신, 원복 불가능한 변환을 넣지 않는다. 이런 변경은 백업·되돌리기 계획·별도 승인 후 break-glass 절차로 실행한다.
- D1 사용자 데이터, R2 사진, OAuth 비밀값은 테스트·데모·개발 편의 목적의 초기화 대상이 아니다.
- 배포 후 최소 확인 항목은 `/api/auth/session`, 핵심 D1 API, 사진 업로드/조회, 신규 세션 참가 흐름이다.

## 6. 예외 및 감사

긴급 장애에서만 Maintainer가 다음을 기록한 뒤 제한적으로 수동 조치할 수 있다: 장애 사유, 변경 리소스, 실행 명령, 시작/종료 시각, 검증 결과, 후속 PR. 조치가 끝나면 임시 권한·토큰은 바로 회수하거나 만료시킨다.

매월 한 번 다음을 점검한다.

- GitHub Actions secrets가 위 세 개뿐인지와 마지막 사용 시각
- Cloudflare API token의 대상·권한이 3절과 일치하는지
- Lunchie Munchie 그룹의 사람 권한이 읽기 전용인지
- Cloudflare Audit Log와 GitHub 배포 이력이 `main` 병합 이력과 일치하는지

권한을 추가하려면 먼저 이 문서의 allowlist를 수정하는 PR을 열고, 필요한 기능·리소스·최소 권한·만료/회수 방법을 명시한다. “나중에 쓸 수도 있음”은 권한 부여 사유가 아니다.
