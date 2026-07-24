# Codex install prompt

첨부한 `lunchmate-room-themes-v1.zip`을 사용해 현재 Lunchmate의
`방 꾸미기`를 테두리 스킨 선택에서 실제 미니룸 테마 선택으로 교체하세요.

## 범위

이번 단계에서는 기존 여섯 `foodieSkin`을 그대로 유지하면서 시각 에셋과
선택 UI만 교체합니다. DB/API/localStorage 스키마를 변경하지 마세요.

테마:

- 핑크 피크닉 → `pink-picnic`
- 옐로우 런치트레이 → `yellow-lunch-tray`
- 빈티지 프레임 → `vintage-frame`
- 블루 노트 → `blue-note`
- 플라워 가든 → `flower-garden`
- 모던 미니멀 → `modern-minimal`

현재 코드의 실제 skin ID를 먼저 확인하고 그 값을 유지하세요.
위 이름으로 저장값을 강제 마이그레이션하지 말고 기존 ID에서 새
`assetKey`로 매핑하세요.

## 에셋 설치

ZIP의 폴더를 프로젝트 정적 에셋 경로 아래에 설치하세요.

- `stages/1x`, `stages/2x`: FoodieRoom 큰 미리보기
- `profile/1x`, `profile/2x`: Profile 상단 배너
- `thumbnails/1x`, `thumbnails/2x`: 테마 선택 카드

PNG를 다시 crop하거나 캐릭터를 이미지 안에 합치지 마세요.
`manifest.json`의 규격과 anchor를 참고하세요.

## FoodieRoom 큰 미리보기

1. 기존 체크무늬 border skin, 흰색 빈 배경, 점선 바닥선을 제거하세요.
2. 선택한 `stages` 이미지를 3:2 비율의 rounded stage 전체에 채우세요.
3. 배경 위에 기존 `LunchmateCharacterRenderer`를 별도 레이어로 유지하세요.
4. 캐릭터, 표정, 옷, 모자, 안경, 가방, feeding, sitting, drag 동작은
   변경하지 마세요.
5. 레벨 칩, 맞추억 수, 테마명은 background와 character보다 높은
   z-index를 유지하세요.
6. preview 안내 문구는 바닥을 가리지 않도록 하단에 약한 scrim 또는
   별도 caption 영역으로 두세요.

렌더 순서:

`room background → bagBack/outfitBack → character/body/outfit/face/accessories → interaction effects → status UI`

## Profile 상단 배너

1. 기존 파란 체크무늬 영역을 선택 테마의 `profile` 이미지로 교체하세요.
2. 기존 배너 크기, Profile 카드 구조, 캐릭터 위치, Lunchbox 버튼/badge,
   레벨 칩, 말풍선, drag/tap/feeding 동작을 유지하세요.
3. 큰 stage 파일을 CSS로 억지로 축소하지 말고 제공된 compact crop을
   사용하세요.
4. 작은 배너에서 텍스트가 묻히면 칩 뒤에만 기존 흰색 surface를 유지하고
   배경 전체를 어둡게 만들지 마세요.

## 테마 선택 UI

1. 현재의 작은 정사각형 이모지/심볼 타일을 제거하세요.
2. `thumbnails`를 사용하는 2열 가로형 room card로 바꾸세요.
3. 각 카드에는 실제 방 미리보기와 현재 한글 테마명을 표시하세요.
4. 선택 카드는 coral outline과 우측 상단 check badge로 표시하세요.
5. 선택 즉시 큰 미리보기와 Profile banner에 반영하고, 기존 저장 흐름으로
   `foodieSkin`을 저장하세요.
6. 지금은 `테마` preset만 동작하게 하세요. 벽지/바닥/가구/소품을
   작동하는 것처럼 가짜 구현하거나 새로운 layout schema를 추가하지 마세요.

## 변경 금지

- `lm_profile` 및 현재 `foodieSkin` 저장 계약
- DB/API/localStorage schema
- Profile 레이아웃과 통계
- XP, 레벨업, 보상 지급, reward claims
- Lunchbox, 음식 수량, feeding/shareFood
- 표정/tap/drag pointer 처리
- 코스튬 및 owned item/loadout
- 하단 navigation과 다른 FoodieRoom 탭

## 검증

- 여섯 기존 skin 저장값이 모두 새 방 에셋으로 정상 매핑됨
- 새 사용자와 기존 사용자 모두 저장된 테마 복원
- FoodieRoom에서 선택 즉시 stage 변경
- Profile로 돌아갔을 때 같은 테마의 compact crop 적용
- 360px 폭 모바일에서 2열 카드가 잘리지 않음
- character와 status UI가 background 뒤로 숨지 않음
- feeding, sitting, drag, tap expression 중 배경이 유지됨
- reduced motion 동작 회귀 없음
- production build, 관련 테스트, `git diff --check` 통과

완료 보고에는 실제로 유지한 기존 skin ID 매핑, 수정 파일, 테스트 결과와
FoodieRoom/Profile 모바일 확인 항목을 포함하세요.
