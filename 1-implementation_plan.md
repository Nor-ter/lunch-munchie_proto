# 데이터 구조 적용 계획 (Data Architecture Implementation Plan)

현재 루트 디렉토리에 있는 `erd.mmd` (ER Diagram)을 바탕으로 LunchieMunchie 프로토타입에 데이터 구조를 적용하기 위한 구현 계획입니다.

## User Review Required

> [!IMPORTANT]
> 본 프로젝트는 프로토타입 단계입니다. 데이터 영속성(Persistence)을 위해 어떤 데이터베이스 방식을 사용할지 결정이 필요합니다.
> 현재 `package.json`에는 ORM이나 DB 드라이버가 포함되어 있지 않습니다.
> 아래 **Open Questions**에서 DB 방식을 선택해 주시면 그에 맞춰 구현을 진행하겠습니다.

## Open Questions

> [!WARNING]
> **데이터 저장소(DB) 방식 선택 요청:**
> 1. **In-Memory (임시 저장소):** 별도 DB 없이 메모리 상의 배열(Array) 객체를 이용. 서버 재시작 시 데이터가 날아가지만, 가장 빠르게 프로토타입 UI/UX를 테스트할 때 유리합니다.
> 2. **SQLite + Drizzle ORM:** 파일 기반의 로컬 DB를 사용하여 서버 재시작 시에도 데이터가 유지되며, 추후 실제 DB(PostgreSQL 등)로 마이그레이션이 용이합니다. (추천)
> 3. **기타:** 외부 BaaS (Firebase, Supabase 등)를 사용할 계획이신가요?

## Proposed Changes

데이터 모델 검증(Validation)과 타입 추론(Type Inference)을 위해 클라이언트와 서버가 공유하는 `shared/schema.ts`에 Zod 스키마를 정의하는 것을 기본 골조로 합니다.

---

### Shared (공통 데이터 스키마)

클라이언트와 서버에서 공통으로 사용할 데이터 구조를 Zod로 정의하여 타입 안정성을 확보합니다.

#### [NEW] [shared/schema.ts](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/shared/schema.ts)
`erd.mmd`에 명시된 테이블(엔티티)과 속성을 Zod 스키마로 선언하고 TypeScript 타입을 추출합니다.
- `UserSchema`, `RestaurantSchema`, `LunchieSessionSchema` 등 주요 엔티티
- `LunchieParticipantSchema`, `LunchieSwipeSchema` 등 관계/액션 엔티티
- `CourseSchema`, `CourseItemSchema` 등 코스 관련 엔티티
- 각 스키마로부터 추론된 TypeScript 타입 (`type User = z.infer<typeof UserSchema>`)

---

### Server (백엔드 데이터 계층)

사용자가 선택한 DB 방식에 따라 데이터 접근 및 조작을 처리할 모듈을 구성합니다.

#### [NEW] [server/db.ts](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/server/db.ts)
- 선택된 DB 방식에 따른 데이터 저장소 초기화 코드.
- in-memory 방식일 경우 엔티티별 Array 객체 생성. SQLite 방식일 경우 DB 연결 설정.

#### [NEW] [server/routes.ts](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/server/routes.ts)
- `shared/schema.ts`를 바탕으로 데이터를 조회(GET)하고 생성/수정(POST/PUT/PATCH)하는 Express API 라우트 작성.
- 세션 생성, 스와이프 액션, 음식점/코스 조회 등 핵심 기능에 대한 목업(Mock) 혹은 실제 DB 쿼리 구현.

#### [MODIFY] [server/index.ts](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/server/index.ts)
- `server/routes.ts`에서 작성한 API 라우터를 Express 앱에 등록. (`app.use('/api', routes)`)

---

### Client (프론트엔드 데이터 연동 준비)

#### [NEW] [client/src/lib/api.ts](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/client/src/lib/api.ts) (필요시)
- 공유된 타입(`shared/schema.ts`)을 활용하여 서버의 `/api`와 통신하는 헬퍼 함수 작성.

## Verification Plan

### Automated Tests
- TypeScript 컴파일 체크 (`npm run check`)로 프론트엔드 및 백엔드 타입 불일치 검사.

### Manual Verification
- 로컬 개발 서버 환경(`npm run dev`)에서 `/api/users`, `/api/sessions` 등 작성된 API 엔드포인트에 REST 클라이언트(Postman 또는 cURL)로 요청을 보내 올바른 Zod 검증 오류나 예상 데이터가 반환되는지 확인.
