# `tl_branch` 초보자용 실행·업데이트 가이드 (Windows)

이 문서는 Git, Node.js, Google Cloud를 처음 사용하는 팀원이 `tl_branch`를 받아서
Google 로그인까지 정상적으로 실행하기 위한 안내서입니다. 아래 명령은 **Windows
PowerShell** 기준입니다.

> 정확한 Git 브랜치 이름은 하이픈(`tl-branch`)이 아니라 밑줄이 들어간
> **`tl_branch`**입니다.

## 가장 중요한 원칙

1. Google Cloud 설정은 프로젝트 관리자가 담당합니다. 팀원은 Google Cloud에서 새
   프로젝트나 OAuth 클라이언트를 만들 필요가 없습니다.
2. `tl_branch`는 팀에서 지정한 **bug-fixing 전용 OAuth 클라이언트**를 사용합니다.
   운영용 또는 다른 브랜치용 OAuth 설정과 섞지 않습니다.
3. 프로젝트 관리자가 전달한 bug-fixing용 `.dev.vars` 파일을 사용합니다.
4. 아래 명령은 **실행하지 않습니다.** 기존 `.dev.vars`의 로그인 정보를 빈 값으로
   덮어쓸 수 있습니다.

   ```powershell
   cp .dev.vars.example .dev.vars
   ```

5. `corepack enable`도 실행하지 않습니다. Windows의 `C:\Program Files\nodejs` 쓰기
   권한 때문에 `EPERM` 오류가 발생할 수 있습니다.
6. 접속 주소는 항상 `http://localhost:8788`을 사용합니다. `127.0.0.1`로 접속하지
   않습니다.
7. `.dev.vars`의 내용은 GitHub, 이슈, PR, 채팅 또는 화면 캡처에 올리지 않습니다.

## `tl_branch` OAuth 운영 정책

`tl_branch`의 로컬 로그인은 Google Cloud 프로젝트 안에 별도로 만든 bug-fixing 전용
OAuth 2.0 웹 클라이언트를 사용합니다. 권장 클라이언트 이름은 다음과 같습니다.

```text
Lunchie Bug Fixing
```

용도는 다음처럼 분리합니다.

| OAuth 클라이언트 | 용도 | 사용 위치 |
|---|---|---|
| `Lunchie Bug Fixing` | 버그 수정 및 `tl_branch` 로컬 검증 | 팀원의 로컬 `.dev.vars` |
| Production 클라이언트 | 실제 서비스 로그인 | Cloudflare 운영 Secrets |
| 기존 다른 개발 클라이언트 | 해당 브랜치 또는 기존 개발 환경 | 그 환경에서만 사용 |

Google Cloud 프로젝트 하나에 OAuth 클라이언트가 여러 개 있어도 충돌하지 않습니다.
실행 중인 앱은 `.dev.vars`에 들어 있는 Client ID 하나만 사용합니다. 다만 Client ID와
Client Secret은 반드시 **같은 OAuth 클라이언트에서 발급된 한 쌍**이어야 합니다.

bug-fixing 클라이언트에는 다음 리디렉션 URI를 등록합니다.

```text
http://localhost:8788/api/auth/google/callback
```

운영 서비스 콜백은 bug-fixing 클라이언트에 추가하지 않는 것을 권장합니다. 이 분리로
bug-fixing용 Secret을 교체하거나 폐기해도 운영 로그인에는 영향을 주지 않습니다.

팀원은 이 설정을 직접 만들지 않습니다. 프로젝트 관리자가 클라이언트를 한 번 만들고,
bug-fixing 클라이언트에서 발급된 Client ID와 Client Secret이 들어 있는 `.dev.vars`를
안전한 비밀 전달 수단으로 제공합니다. 기존 클라이언트나 Secret은 다른 팀원이 사용
중일 수 있으므로 확인 없이 삭제하지 않습니다.

---

## 1. 시작 전에 관리자에게 받을 것

프로젝트 관리자가 다음 세 가지를 준비해야 합니다.

- Git 저장소 접근 권한과 저장소 주소
- 비밀 전달 도구를 통해 전달된 bug-fixing 전용 `.dev.vars` 파일
- 로그인할 Google 이메일을 OAuth 테스트 사용자로 등록했다는 확인

`.dev.vars` 안에는 다음 네 항목이 모두 채워져 있어야 합니다.

```dotenv
GOOGLE_CLIENT_ID=bug-fixing_클라이언트에서_발급한_값
GOOGLE_CLIENT_SECRET=같은_bug-fixing_클라이언트에서_발급한_값
AUTH_SESSION_SECRET=관리자가_전달한_긴_임의문자열
MEDIA_ORIGIN=https://lunchie-munchie.pages.dev
```

실제 값을 다른 사람에게 다시 전달하거나 이 문서에 적지 마세요.

---

## 2. 필수 프로그램 확인

PowerShell을 열고 아래 명령을 한 줄씩 실행합니다.

```powershell
git --version
node --version
pnpm --version
```

정상 기준:

- `git version ...`이 출력됨
- Node.js가 `v22` 이상
- pnpm이 `10.4.1` 또는 호환되는 10.x 버전

`pnpm`을 찾을 수 없을 때만 다음 명령을 실행합니다.

```powershell
npm install --global pnpm@10.4.1
```

설치 후 PowerShell을 닫았다가 다시 열고 확인합니다.

```powershell
pnpm --version
```

그래도 실행되지 않으면 임의로 다른 설치 명령을 반복하지 말고 프로젝트 관리자에게
문의합니다.

---

## 3-A. 프로젝트를 처음 받는 경우

관리자에게 받은 저장소 주소를 사용합니다.

```powershell
cd C:\Users\본인Windows사용자이름
git clone 저장소주소
cd snl_pupfish_project
git switch tl_branch
git pull --ff-only origin tl_branch
```

`저장소주소`는 예시 문구이므로 실제 Git 주소로 바꿔야 합니다.

## 3-B. 프로젝트 폴더가 이미 있는 경우

프로젝트 폴더로 이동한 다음 브랜치를 업데이트합니다.

```powershell
cd C:\Users\본인Windows사용자이름\snl_pupfish_project
git fetch origin
git switch tl_branch
git pull --ff-only origin tl_branch
```

`git pull`에서 로컬 변경사항 때문에 중단되면 파일을 삭제하거나 `git reset --hard`를
실행하지 말고 프로젝트 관리자에게 문의합니다.

---

## 4. `.dev.vars` 파일 넣기

관리자에게 받은 `.dev.vars` 파일을 프로젝트 최상위 폴더에 넣습니다.

정확한 구조는 다음과 같습니다.

```text
snl_pupfish_project\
├─ client\
├─ server\
├─ functions\
├─ package.json
├─ .dev.vars.example
└─ .dev.vars              ← 전달받은 파일이 여기 있어야 함
```

PowerShell에서 파일이 정확한 위치에 있는지 확인합니다.

```powershell
Get-Item -Force .dev.vars
```

파일을 찾을 수 없으면 다음을 확인합니다.

- 파일 이름이 `.dev.vars.txt`가 아닌지 확인
- 파일이 `client`나 `server` 폴더 안에 들어가지 않았는지 확인
- `.dev.vars.example`을 `.dev.vars` 대신 사용하고 있지 않은지 확인

다음 검사는 비밀값을 화면에 출력하지 않고 필수 값이 채워졌는지만 확인합니다. 블록
전체를 PowerShell에 붙여넣어 실행하세요.

```powershell
$requiredVars = @(
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'AUTH_SESSION_SECRET',
  'MEDIA_ORIGIN'
)
$devVarsText = Get-Content -Raw -LiteralPath .dev.vars
foreach ($requiredVar in $requiredVars) {
  if ($devVarsText -notmatch "(?m)^$requiredVar=[^\r\n]*\S[^\r\n]*\r?$") {
    throw ".dev.vars의 $requiredVar 값이 없거나 비어 있습니다. 관리자에게 정상 파일을 다시 받으세요."
  }
}
Write-Host '.dev.vars 필수 설정 확인 완료'
```

`필수 설정 확인 완료`가 출력되어야 다음 단계로 진행할 수 있습니다.

---

## 5. 최초 설치 및 로컬 데이터베이스 준비

프로젝트 최상위 폴더에서 순서대로 실행합니다.

```powershell
pnpm install --frozen-lockfile
pnpm cf:d1:migrate:local
pnpm cf:d1:seed:local
```

정상적인 seed 결과에는 다음과 같이 0보다 큰 식당 수가 표시됩니다.

```text
Generated ...: 77/118 verified restaurants.
```

Wrangler 출력에 `--local`과 `Resource location: local`이 표시되어야 합니다. 이 과정은
운영 데이터베이스를 수정하지 않습니다.

`Ignored build scripts: esbuild, workerd` 경고만 나오고 이후 명령이 정상 완료된다면 계속
진행해도 됩니다.

---

## 6. 앱 실행

```powershell
pnpm dev:pages
```

첫 빌드는 시간이 조금 걸릴 수 있습니다. PowerShell을 닫지 말고 서버가 준비될 때까지
기다린 다음 Chrome에서 아래 주소를 엽니다.

<http://localhost:8788>

서버가 실행 중인 PowerShell 창은 그대로 둡니다. 서버를 종료할 때만 그 창에서
`Ctrl+C`를 누릅니다.

---

## 7. Google 로그인 확인

1. 앱에서 **Google 계정으로 로그인**을 누릅니다.
2. 관리자에게 등록을 요청했던 Google 계정을 선택합니다.
3. Google 로그인 후 Lunchie 화면으로 돌아오는지 확인합니다.
4. 새로고침 후에도 로그인 상태가 유지되는지 확인합니다.

정상 동작 기준:

- Google의 `client_id` 오류가 없음
- Google의 `redirect_uri_mismatch` 오류가 없음
- Lunchie로 다시 이동함
- 앱 새로고침 후에도 로그인 상태가 유지됨

---

## 8. 이후 `tl_branch` 업데이트 방법

이미 최초 설정을 마친 사용자는 `.dev.vars`를 다시 만들거나 Google Cloud를 다시 설정할
필요가 없습니다. 다음 순서만 사용합니다.

1. 실행 중인 서버 PowerShell에서 `Ctrl+C`를 누릅니다.
2. 프로젝트 폴더에서 아래 명령을 실행합니다.

```powershell
git switch tl_branch
git pull --ff-only origin tl_branch
pnpm install --frozen-lockfile
pnpm cf:d1:migrate:local
pnpm cf:d1:seed:local
pnpm dev:pages
```

`.dev.vars`는 Git에서 제외되므로 정상적인 `git pull`이 파일을 변경하지 않습니다. 업데이트
중에 `.dev.vars.example`을 복사하지 마세요.

---

## 9. 자주 발생하는 오류

### `EPERM: operation not permitted ... Program Files\nodejs`

`corepack enable`을 실행할 때 발생할 수 있습니다. `pnpm --version`이 정상 출력되면
`corepack enable`은 필요 없으므로 건너뜁니다.

### `Missing required parameter: client_id`

`.dev.vars`가 없거나 `GOOGLE_CLIENT_ID`가 빈 값입니다. `.dev.vars.example`을 복사하지 말고
관리자에게 bug-fixing용 `.dev.vars`를 다시 받으세요. 팀원이 Google Cloud에서 새
클라이언트를 만들 필요는 없습니다.

### `400: redirect_uri_mismatch`

주소창이 정확히 `http://localhost:8788`로 시작하는지 확인합니다. `127.0.0.1` 또는 다른
포트로 접속하지 마세요. 계속 발생하면 관리자에게 화면을 전달합니다.

### `403: access_denied` 또는 테스트 사용자 오류

로그인한 Google 이메일이 OAuth 테스트 사용자에 등록되지 않았습니다. 프로젝트
관리자에게 해당 이메일 등록을 요청하세요.

### `SQL code did not contain a statement` 또는 `0/118 verified restaurants`

Windows 및 fresh clone seed 수정이 포함되지 않은 오래된 코드일 수 있습니다.

```powershell
git switch tl_branch
git pull --ff-only origin tl_branch
```

업데이트 후에도 발생하면 전체 로그를 관리자에게 전달하세요.

### `'MEDIA_ORIGIN' is not recognized as an internal or external command`

Windows 실행 수정이 포함되지 않은 오래된 `package.json`입니다. `tl_branch` 최신 내용을
pull한 뒤 다시 실행하세요.

### `localhost:8788`에 접속할 수 없음

- `pnpm dev:pages`를 실행한 PowerShell이 닫히지 않았는지 확인
- 빨간색 오류가 있는지 확인
- 이전 서버가 실행 중이면 해당 PowerShell에서 `Ctrl+C`를 누른 후 다시 실행
- 해결되지 않으면 PowerShell의 마지막 오류 부분을 관리자에게 전달

### 사진만 보이지 않음

로그인 및 나머지 화면이 정상이라면 먼저 새로고침합니다. 계속 404가 발생하면
`MEDIA_ORIGIN` 값이 있는지 확인하고 관리자에게 사진 경로와 함께 문의합니다.

---

## 10. 프로젝트 관리자 체크리스트

팀에 이 문서를 전달하기 전에 관리자가 확인합니다.

- [ ] 실제 브랜치 이름 `tl_branch`로 최신 변경사항을 commit/push함
- [ ] Windows 호환 `dev:pages` 수정이 브랜치에 포함됨
- [ ] fresh clone에서 D1 seed가 0건이 되지 않는 수정이 브랜치에 포함됨
- [ ] `tl_branch` 전용 OAuth 웹 클라이언트(`Lunchie Bug Fixing`)를 지정함
- [ ] bug-fixing 클라이언트의 Client ID와 Client Secret이 같은 클라이언트에서 발급된
      한 쌍인지 확인함
- [ ] bug-fixing OAuth 클라이언트에 아래 콜백이 등록됨
  - `http://localhost:8788/api/auth/google/callback`
- [ ] bug-fixing 클라이언트가 Cloudflare 운영용 OAuth 설정과 분리되어 있음
- [ ] 각 팀원의 Google 이메일을 OAuth 테스트 사용자로 추가함
- [ ] bug-fixing용으로 완성된 `.dev.vars`를 Git이 아닌 안전한 비밀 전달 수단으로 전달함
- [ ] 사용 여부를 확인하지 않은 기존 OAuth 클라이언트나 Secret을 삭제하지 않음
- [ ] `.dev.vars` 또는 Client Secret을 README, commit, PR, 이슈에 넣지 않음
- [ ] 한 명의 새 팀원 컴퓨터에서 이 문서만 보고 fresh clone 실행을 검증함

## 관리자에게 오류를 전달할 때

다음 정보만 전달합니다.

- 실패한 단계 번호
- 실행한 명령
- PowerShell의 오류 메시지
- 브라우저 오류 화면(비밀번호와 Client Secret은 가림)
- `node --version`, `pnpm --version`

`.dev.vars` 내용 자체는 전달하지 않습니다.
