# Lunchie Munchie 팀 업데이트 상세

> 기준 브랜치: `tl_branch`  
> 기준 커밋: `97149b2b`  
> 작성일: 2026-07-13  
> 대상: 기획, 디자인, 프론트엔드, 백엔드, QA

## 1. 이번 업데이트 요약

이번 업데이트는 Munchie Mode를 단순 코스 탐색 화면에서 **피드 작성 → 코스 제작 → 템플릿 편집 → 공유 → 재탐색**이 연결되는 제작 흐름으로 확장하는 데 초점을 맞췄습니다.

핵심 결과는 다음과 같습니다.

1. Munchie Feed 작성 전에 실제 카드 형태의 미리보기를 확인할 수 있습니다.
2. Munchie Template에서 코스를 만들고 곧바로 공유 템플릿을 편집할 수 있습니다.
3. 템플릿 사진을 교체, 삭제, 추가, 이동, 확대·축소, 회전할 수 있습니다.
4. 공유 옵션은 Instagram 스토리, 앱 링크, 이미지 저장으로 정리되었습니다.
5. Munchie 관련 태그는 음식 중심의 단일 분류 체계로 통합되었습니다.
6. 화면을 나갔다 돌아와도 Feed 또는 Template 출발 탭이 유지됩니다.
7. 홈의 리뷰 요청과 오늘의 여정은 전구 형태의 알림 센터로 통합되었습니다.

---

## 2. 사용자 흐름 변경

### 2.1 새 코스 만들기 → 템플릿 완성

최신 사용자 동선은 아래와 같습니다.

```text
Munchie Mode
  → Munchie Template 탭
  → 새 코스 만들기
  → 제목·해시태그·장소·장소 사진 편집
  → 코스 공유하기
  → Munchie 템플릿 에디터 / 공유하기
  → 템플릿 선택 및 사진 배치 편집
  → 공유 또는 이미지 저장
  → 템플릿 완성 및 홈으로
  → Munchie Mode / Template 탭
```

변경 사항:

- 새 코스 화면의 완료 버튼 문구를 `코스 만들기`에서 `코스 공유하기`로 변경했습니다.
- 코스 생성 후 코스 상세 화면을 거치지 않고 공유 템플릿 에디터로 바로 이동합니다.
- 새로 입력한 제목, 장소, 거리, 소요 시간, 해시태그와 사진이 실제 공유 템플릿에 반영됩니다.
- 새 코스에서 변경한 장소 사진은 코스 ID 단위로 임시 보존되어 공유 화면까지 유지됩니다.
- 공유 화면 뒤로가기는 코스 편집 화면으로 돌아갑니다.
- `템플릿 완성 및 홈으로`는 `/feed?tab=template`로 이동합니다.

관련 파일:

- `client/src/pages/course/CourseEditPage.tsx`
- `client/src/pages/course/CourseSharePage.tsx`
- `client/src/lib/courseMapSync.ts`
- `client/src/lib/imageUtils.ts`

### 2.2 Munchie Feed 작성

```text
Munchie Feed
  → 피드 작성
  → 코스 선택
  → 사진/한줄평 작성
  → 피드 미리보기
  → 수정 또는 최종 게시
  → 게시 완료
  → Munchie Feed 탭
```

- 사진과 한줄평 입력 직후 게시되던 흐름을 4단계 작성 흐름으로 변경했습니다.
- 게시 전에 실제 `FeedPostCard` 형태로 결과물을 확인할 수 있습니다.
- 미리보기에서 이전 단계로 돌아가 사진과 한줄평을 수정할 수 있습니다.
- 작성 취소 또는 완료 후 Munchie Feed 탭으로 복귀합니다.

### 2.3 출발 탭 유지

| 출발 위치 | 상세/작성 화면 | 뒤로가기 또는 완료 후 |
|---|---|---|
| Munchie Feed | 피드 코스 보기 | Munchie Feed |
| Munchie Template | 템플릿 코스 상세 | Munchie Template |
| Munchie Feed | 새 피드 작성 | Munchie Feed |
| Munchie Template | 새 코스 만들기 취소 | Munchie Template |
| 템플릿 공유 에디터 | 템플릿 완성 및 홈으로 | Munchie Template |

쿼리스트링의 `from`, `tab`, `editorFrom` 값을 이용해 복귀 위치를 구분합니다.

---

## 3. Munchie 템플릿 에디터 / 공유하기

### 3.1 템플릿

- ZIP 디자인을 기반으로 한 9:16 템플릿 19개를 제공합니다.
- 네컷, 로드맵, 런치 트레이, CD, 영수증, 티켓 계열로 구성됩니다.
- 템플릿 이미지는 `public/templates/munchie-share/`에서 관리합니다.
- 캐러셀에서 선택된 템플릿만 편집 가능한 상태가 됩니다.

### 3.2 사진 편집

사진 위에 마우스를 올리거나 터치하면 다음 컨트롤이 표시됩니다.

- 좌측 상단 초록색 `+`: 새 사진 추가 또는 기존 사진 교체
- 우측 상단 빨간색 `×`: 사진 제거
- 하단 파란색 회전 핸들: 사진 각도 조절
- 사진 드래그: 템플릿 내부 위치 변경
- 두 손가락 핀치 또는 마우스 휠: 확대·축소

선택 해제 규칙:

- 사진 외부를 터치하거나 클릭하면 편집 아이콘이 숨겨집니다.
- 다른 사진을 선택하면 이전 사진의 컨트롤은 닫힙니다.
- 최종 이미지 캡처 시 `data-share-editor-control` 요소는 제외됩니다.

### 3.3 공유 옵션

현재 노출하는 공유 방식은 세 가지입니다.

| 옵션 | 동작 |
|---|---|
| IG 스토리 | 템플릿 이미지를 생성하고 모바일 공유 기능을 우선 사용 |
| 앱 링크 | Web Share API 사용, 미지원 환경에서는 링크 복사 |
| 이미지 저장 | PNG 생성 후 기기 다운로드 |

기존에 노출되던 카카오톡, Threads, TikTok 등 다른 미디어 옵션은 제거했습니다.

하단 액션은 2열 코랄 버튼입니다.

- 왼쪽: 현재 선택한 공유 방식 실행
- 오른쪽: `템플릿 완성 및 홈으로`

### 3.4 이미지 저장 안정화

- 원격 이미지는 허용 호스트 기반 동일 출처 프록시를 사용합니다.
- 이미지 디코딩 완료를 기다린 후 DOM 캡처를 시작합니다.
- 선택되지 않은 템플릿과 편집 아이콘은 최종 렌더링에서 제외합니다.
- 로컬 업로드 사진은 리사이즈한 Data URL로 저장합니다.

관련 파일:

- `client/src/pages/course/CourseSharePage.tsx`
- `client/src/hooks/useCourseShare.ts`
- `client/src/constants/coursemapTemplates.ts`
- `client/src/lib/imageUtils.ts`
- `server/routes.ts`

---

## 4. 음식 태그 필터 통합

### 4.1 새 태그 체계

앱에서 사용하는 음식 중심 태그 순서는 다음과 같습니다.

```text
전체 · 맛집 · 데이트코스 · 혼밥 · 카페 · 펍나이트 · 브런치 · 디저트 · 가성비
```

`전체`는 필터 전용이며 실제 코스 태그 타입에는 포함되지 않습니다.

적용 화면:

- Munchie Feed
- Munchie Template
- 코스 탐색
- 저장된 Munchie 템플릿
- Lunchie 취향 설정
- 코스 상세 태그

### 4.2 공통 관리

`client/src/constants/foodTags.ts`에서 다음 항목을 통합 관리합니다.

- `FOOD_TAGS`: 앱에서 허용하는 음식 태그
- `FOOD_FILTER_TAGS`: `전체`를 포함한 필터 버튼 목록
- `normalizeFoodTag()`: 이전 태그를 새 태그로 변환
- `hasFoodTag()`: 기존 데이터까지 고려한 필터 일치 판정

### 4.3 이전 데이터 호환

| 이전 태그 | 새 태그 |
|---|---|
| 데이트 코스 | 데이트코스 |
| 혼자 여행 | 혼밥 |
| 전시/문화 | 데이트코스 |
| 액티비티 | 데이트코스 |
| 맛집 투어 | 맛집 |
| 펍 나이트 | 펍나이트 |

정규화는 다음 데이터 진입점에서 수행합니다.

- `lm_courses` 로컬 저장 데이터 로드
- `lm_feed_v2` 로컬 피드 데이터 로드
- `/api/restaurants` 응답
- `/api/courses` 응답

기존 코랄 디자인 시스템은 유지하며 `client/src/constants/courseTheme.ts`의 기존 팔레트를 순환 적용합니다.

---

## 5. Munchie Feed 표시 정책

### 홈 랜딩

- 작성자의 한줄평을 먼저 표시합니다.
- 이후 공개 상태의 인기 댓글을 5초 간격으로 순환합니다.
- 댓글 길이가 바뀌어도 카드 높이는 유지됩니다.
- 숨김 댓글은 숫자·문자열 형태의 과거 저장 상태를 모두 고려해 제외합니다.

### Munchie Feed 탭

- 댓글 로테이션을 사용하지 않습니다.
- 작성자가 작성한 한줄평을 큰 따옴표가 포함된 인용문 카드로 고정 표시합니다.
- 코스 제목을 눌러 이동하던 링크는 제거했습니다.
- 별도의 `코스 보기` 동작을 통해서만 코스 상세로 이동합니다.

---

## 6. 홈 알림 센터

홈에 상시 노출되던 리뷰 요청과 오늘의 여정을 전구 아이콘 기반 알림 센터로 통합했습니다.

- 업데이트가 있으면 전구가 켜진 상태로 표시됩니다.
- 업데이트가 없어도 전구를 눌러 최근 여정을 확인할 수 있습니다.
- 최근 여정은 최대 5개까지 최신순으로 표시합니다.
- 알림을 열면 주변 배경이 어두워집니다.
- 전구 또는 닫기 버튼으로 다시 닫을 수 있습니다.
- 확인 후 전구는 꺼진 상태로 전환됩니다.

서버:

- `GET /api/journey/history`
- DB 조회 실패 시 메모리 이벤트 히스토리 폴백

---

## 7. Lunchie Mode 및 프로필 UI

### Lunchie Mode

- 예선 시작 화면에 공식 Lunchie Munchie 로고와 진행 바를 표시합니다.
- 검정 배경에 맞춘 floating 로고 애니메이션을 적용했습니다.
- Quick Match 설정 화면의 런먼이 GIF는 제거했습니다.
- 런먼이 애니메이션은 세션 로비의 `투표 시작하기` 아래에 배치했습니다.
- 결승 공유 카드의 임시 로고를 공식 캐릭터 및 워드마크로 교체했습니다.

### 프로필

- `나의 코스맵`을 `나의 템플릿`으로 변경했습니다.
- 템플릿은 2행·3열이 보이고 다음 열 일부가 노출되는 가로 스와이프 구조입니다.
- 프로필 통계 순서는 `팔로워 → 팔로잉 → 좋아요`입니다.

### 저장 목록

- `Munchie 코스맵`을 `Munchie 템플릿`으로 변경했습니다.
- Munchie Template 저장 목록에도 공통 음식 태그 필터를 적용했습니다.

---

## 8. 주요 구현 파일

| 영역 | 주요 파일 |
|---|---|
| 앱 전역 데이터 | `client/src/contexts/AppContext.tsx` |
| 음식 태그 | `client/src/constants/foodTags.ts` |
| 코스 컬러 | `client/src/constants/courseTheme.ts` |
| Munchie 탭 | `client/src/pages/MunchieFeedPage.tsx` |
| 피드 카드 | `client/src/components/munchie/FeedPostCard.tsx` |
| 새 피드 작성 | `client/src/pages/FeedComposePage.tsx` |
| 코스 편집 | `client/src/pages/course/CourseEditPage.tsx` |
| 코스 상세 | `client/src/pages/course/CourseDetailPage.tsx` |
| 템플릿 공유 | `client/src/pages/course/CourseSharePage.tsx` |
| 템플릿 정의 | `client/src/constants/coursemapTemplates.ts` |
| 공유 캡처 | `client/src/hooks/useCourseShare.ts` |
| 홈 알림 | `client/src/pages/HomePage.tsx` |
| 저장 목록 | `client/src/pages/SavedPage.tsx` |
| 프로필 | `client/src/pages/ProfilePage.tsx` |

> 파일명은 현재 저장소 기준입니다. 기능을 수정하기 전에 실제 라우트와 import 관계를 한 번 더 확인하세요.

---

## 9. 로컬 저장소 키

| 키 | 용도 |
|---|---|
| `lm_courses` | 사용자가 생성·편집한 코스 |
| `lm_feed_v2` | 피드 및 댓글 데이터 |
| `lm_saved` | 저장한 코스 ID |
| `lm_saved_restaurants` | Lunchie 저장 식당 ID |
| `lm_course_skins` | 코스별 선택 스킨 |
| `lm_course_share_photos_{courseId}` | 코스 공유용 사용자 사진 |
| `lm_profile` | 사용자 프로필 |

기존 사용자 데이터를 수동 삭제하지 않아도 이전 태그는 로드 과정에서 새 음식 태그로 정규화됩니다.

---

## 10. QA 체크리스트

### 새 코스 및 공유

- [ ] Template 탭에서 `새 코스 만들기` 진입
- [ ] 제목 없이 공유 시 validation 메시지 확인
- [ ] 장소 없이 공유 시 validation 메시지 확인
- [ ] 장소 1~4개 추가 및 순서 변경
- [ ] 장소 사진 업로드·교체 후 `코스 공유하기` 선택
- [ ] 생성한 제목과 장소가 공유 템플릿에 표시되는지 확인
- [ ] 사진 드래그, 핀치/휠 확대, 회전 동작 확인
- [ ] 사진 추가·삭제 아이콘과 바깥 선택 시 아이콘 숨김 확인
- [ ] IG 스토리, 앱 링크, 이미지 저장 각각 확인
- [ ] 저장된 PNG에 편집 아이콘이 포함되지 않는지 확인
- [ ] `템플릿 완성 및 홈으로` 선택 후 Template 탭 복귀 확인

### 탭 복귀

- [ ] Feed에서 코스 상세 진입 후 Feed로 복귀
- [ ] Template에서 코스 상세 진입 후 Template으로 복귀
- [ ] 새 피드 작성 취소 후 Feed로 복귀
- [ ] 새 코스 만들기 취소 후 Template으로 복귀
- [ ] 공유 화면 뒤로가기 후 코스 편집으로 복귀

### 필터

- [ ] 모든 적용 화면에서 태그 순서와 표기가 동일한지 확인
- [ ] 가로 스크롤로 마지막 `가성비`까지 접근 가능한지 확인
- [ ] 각 태그 선택 시 올바른 피드·코스만 표시되는지 확인
- [ ] 과거 저장 데이터가 있을 때 이전 태그가 정상 변환되는지 확인

### 홈 및 알림

- [ ] 전구 열기·닫기 토글 반응 확인
- [ ] 업데이트가 없는 상태에서도 최근 여정 조회 확인
- [ ] 최근 여정 최대 5개 및 최신순 확인
- [ ] 알림을 닫은 후 전구 소등 상태 확인
- [ ] 홈 카드 댓글 로테이션이 5초 간격인지 확인
- [ ] 숨김 댓글 미노출 및 카드 높이 유지 확인

---

## 11. 자동 검증 상태

최신 커밋 기준 결과:

- `corepack pnpm check`: 통과
- `corepack pnpm test`: 3개 테스트 파일, 총 17개 테스트 통과
- `corepack pnpm build`: 프로덕션 빌드 통과

알려진 경고:

- 테스트 환경에서 `DATABASE_URL`이 없으면 DB 관련 경고가 출력되지만 메모리 폴백을 사용하며 테스트는 통과합니다.
- 프로덕션 번들이 500 kB 권장 크기를 초과합니다. 추후 route 단위 dynamic import 또는 manual chunk 분리가 필요합니다.
- UI 자동화 범위는 아직 제한적이므로 위 QA 체크리스트에 따른 실제 모바일 터치 검증이 필요합니다.

---

## 12. Git 커밋 기준점

최근 주요 커밋:

| 커밋 | 내용 |
|---|---|
| `97149b2b` | 새 코스 생성 후 템플릿 공유 흐름 연결 |
| `4a5c3015` | 음식 중심 Munchie 태그 필터 통합 |
| `0ca9fc28` | 새 피드·새 코스 작성 후 출발 탭 복귀 수정 |
| `846eb0ac` | 코스 상세에서 Munchie 출발 탭 유지 |
| `e57ba51f` | 템플릿 에디터, 피드 미리보기, 홈 알림 센터 |
| `df3293da` | Munchie UI, 프로필, Lunchie 애니메이션 개선 |
| `d99f883a` | Munchie Feed와 코스맵 커스터마이징 기반 구현 |

팀원이 동일 상태를 받으려면:

```bash
git fetch origin
git switch tl_branch
git pull origin tl_branch
corepack pnpm install
corepack pnpm check
corepack pnpm test
corepack pnpm dev
```

---

## 13. 다음 작업 제안

우선순위가 높은 후속 작업:

1. Playwright 또는 Cypress로 새 코스 → 템플릿 완료 E2E 테스트 추가
2. iOS Safari와 Android Chrome에서 핀치·회전 제스처 실기기 검증
3. 이미지 저장 실패 로그에 원인 코드와 대상 이미지 URL 구분 추가
4. 템플릿 편집 상태를 영구 저장해 화면 재진입 시 배치 복원
5. 번들 크기 축소를 위한 공유 템플릿 코드 지연 로딩
6. mock/in-memory 데이터의 운영 DB 마이그레이션 및 인증·권한 검증
