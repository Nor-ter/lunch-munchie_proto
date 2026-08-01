# 코스 썸네일 맵 오버레이 (Course Map Overlay) 구현 계획

코스 탐색 화면(`ExplorePage`) 등의 포스트(카드) 썸네일 이미지(`heroImage`) 위에, 해당 코스에 포함된 실제 장소들의 **상대적인 위치(위도/경도)를 기반으로 선과 마커를 그리는 오버레이 SVG**를 추가합니다.

## User Review Required

> [!TIP]
> 백엔드에서 받아오는 실제 식당들의 좌표(`lat`, `lng`)를 기반으로 상대적인 위치를 계산합니다. 카드 크기에 맞게 자동으로 스케일링되어 코스의 대략적인 동선을 썸네일에서 바로 직관적으로 확인할 수 있게 됩니다.
> 
> 이 기능은 모든 코스 리스트 화면에 적용됩니다. 진행할까요?

## Proposed Changes

### 1. 맵 오버레이 컴포넌트 신규 작성
#### [NEW] [client/src/components/CourseMapOverlay.tsx](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/client/src/components/CourseMapOverlay.tsx)
- `Course` 객체를 prop으로 받습니다.
- `AppContext`의 `getRestaurantById`를 이용해 코스 내 모든 정거장(stops)의 위도와 경도를 가져옵니다.
- 위도/경도의 최댓값과 최솟값을 구해 Bounding Box를 계산하고, 각 정거장의 좌표를 0~1 사이의 상대 좌표(`nx`, `ny`)로 변환합니다.
- 변환된 상대 좌표를 기반으로 `framer-motion` 또는 일반 SVG 태그를 활용해 부드러운 곡선(선형 패스)과 숫자 마커(1, 2, 3...)를 렌더링합니다.

### 2. 코스 리스트 카드 컴포넌트 수정
#### [MODIFY] [client/src/pages/ExplorePage.tsx](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/client/src/pages/ExplorePage.tsx)
- `CourseListCard` 컴포넌트 내부의 `<img src={course.heroImage} />` 부분 위에 `CourseMapOverlay`를 띄우도록 수정합니다.
- 오버레이 선을 잘 보이게 하기 위해 이미지 위에 약한 그라데이션 딤(dim) 처리를 유지/강화합니다.

#### [MODIFY] [client/src/pages/HomePage.tsx](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/client/src/pages/HomePage.tsx) (해당 시)
#### [MODIFY] [client/src/pages/SavedPage.tsx](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/client/src/pages/SavedPage.tsx) (해당 시)
- 다른 페이지의 코스 카드들도 통일성을 위해 맵 오버레이를 적용합니다.

## Verification Plan
### Manual Verification
- `npm run dev` 실행 후 코스 탐색 탭으로 이동합니다.
- 각 코스 카드의 썸네일 위에 1 -> 2 -> 3 형태의 경로 선이 실제 장소 위치에 맞게 오버레이되어 렌더링되는지 확인합니다.
- 1개 장소만 있는 코스의 경우 선 없이 중앙에 마커 하나만 표시되는지 예외 케이스를 확인합니다.
