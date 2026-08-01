# SQLite + Drizzle ORM 전환 계획 (Migration Plan)

현재 인메모리(In-Memory) 배열 기반으로 동작하는 데이터 저장소를 로컬 파일 기반의 **SQLite** 데이터베이스와 **Drizzle ORM**을 사용하도록 변경합니다.

## User Review Required

> [!IMPORTANT]
> Drizzle ORM 스키마를 `shared/schema.ts`에 정의하고, 프론트엔드 검증을 위해 `drizzle-zod` 패키지를 통해 Zod 스키마를 자동 생성하도록 아키텍처를 약간 조정할 예정입니다. 이 방식이 Zod와 DB 스키마의 중복 선언을 막아주어 유지보수에 훨씬 유리합니다. 계획에 동의하시면 승인해 주세요.

## Proposed Changes

### 1. 패키지 설치 (Dependencies)
- **런타임 패키지:** `drizzle-orm`, `drizzle-zod`, `better-sqlite3`
- **개발용 패키지(Dev):** `drizzle-kit`, `@types/better-sqlite3`

### 2. 스키마 재정의 (Schema Migration)
#### [MODIFY] [shared/schema.ts](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/shared/schema.ts)
- 기존의 순수 Zod 스키마 선언을 Drizzle의 `sqliteTable`을 이용한 스키마 선언으로 변경합니다.
- `drizzle-zod`의 `createSelectSchema`와 `createInsertSchema`를 사용하여 클라이언트가 재사용할 수 있는 Zod 스키마와 TypeScript 타입을 추출(Export)합니다.

### 3. 데이터베이스 연결 구성 (DB Setup)
#### [MODIFY] [server/db.ts](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/server/db.ts)
- 기존 In-Memory 배열(Mock DB)을 모두 삭제합니다.
- `better-sqlite3` 드라이버를 초기화하고 `drizzle-orm`을 연결하는 코드를 작성합니다. (`sqlite.db` 파일 사용)

### 4. API 라우터 수정 (Routes Migration)
#### [MODIFY] [server/routes.ts](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/server/routes.ts)
- In-memory 배열(`db.users.push` 등) 대신 Drizzle ORM 쿼리(`db.select()`, `db.insert()`)를 사용하여 SQLite 데이터베이스를 직접 읽고 쓰도록 모든 엔드포인트를 수정합니다.

### 5. Drizzle Config 설정
#### [NEW] [drizzle.config.ts](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/drizzle.config.ts)
- DB 마이그레이션 및 스키마 푸시를 위해 Drizzle Kit 설정 파일을 루트에 생성합니다.

## Verification Plan

### Automated Tests
- 타입스크립트 에러 점검 (`pnpm run check`)

### Manual Verification
- `pnpm exec drizzle-kit push` 명령어로 `sqlite.db` 파일이 정상적으로 생성되고 스키마가 반영되는지 확인.
- 로컬 서버 재시작 후 API 테스트를 진행하여 서버 재시작 시에도 데이터가 유지되는지(Persistence) 검증.
