# Lunchie Engine · 운영 백엔드/데이터 감사

기준일: 2026-08-09  
대상: `lunchie_measurement_plan.pdf`, `lunchie_engine_architecture.pdf`,
`lunchie_engine_data_algo.pdf`, `unified-serving-contract.md`와 Pages Functions/D1 운영 경로.

## 결론

현재 시스템은 **v0(제약 필터 + 맥락/평판 기반 탐색 추천 + 행동 로그)** 으로는 운영할
기반이 있다. D1 카탈로그·세션·이벤트 스키마, Google 세션 기반 행위자 식별, 이벤트
멱등성 키, D1/R2/DO 분리는 유효하다.

그러나 이번 감사 전에는 문서의 가장 중요한 전제인 **서버가 실제로 제공한 불변 슬레이트**가
D1에 없었다. 따라서 클라이언트가 보낸 `slate_id`, score, propensity를 나중에 진위 검증할
수 없었고, 개인화/밴딧 성능을 주장할 근거도 없었다. 이는 “모델 성능 문제”가 아니라
학습 데이터 계약 문제다.

### 운영 D1 스냅샷 (2026-08-09, 집계)

* `SWIPE` 165건 중 score가 있는 행은 0건, propensity/model version은 141건이다.
* `IMPRESSION` 60건 중 propensity·score·model version이 모두 있는 행은 14건이다.
* `WINNER` 15건 중 slate 연결은 1건이다.

따라서 기존 로그는 제품 사용량을 보는 데는 쓸 수 있지만, IPS/DR이나 개인화 정책의
성과를 평가하는 학습 데이터로 사용하면 안 된다. 기존 로그는 보존하고, 새 서버 생성
슬레이트부터 별도 정책 버전으로 비교한다.

이번 변경은 `/api/recommend`가 다음을 하나의 D1 batch로 기록하도록 바꾼다.

1. `recommendation_slates`: 정책 버전, 맥락 스냅샷, 후보 수, 순서·점수·포함확률이 든 불변 슬레이트.
2. 해당 슬레이트의 서버 생성 `IMPRESSION` 이벤트.
3. 이후 스와이프가 이 슬레이트에 연결됐는지 보여 주는 운영 대시보드.

`WINNER`는 **결정**이지 실제 방문이 아니다. 방문/재방문은 `VISIT`/`REORDER` 또는
길찾기/회고 같은 별도 증거가 쌓일 때만 만족·재소비의 라벨로 사용한다.

## 문서 대비 현황

| 계약 | 현재 상태 | 판단 |
| --- | --- | --- |
| 식단·예산·의도·반경 하드 필터 | Pages `/api/recommend`와 세션 후보 풀에서 적용 | 유지 |
| 동일한 후보 풀이 같은 식당만 고정 노출되지 않게 탐색 | `buildSlate`의 epsilon 혼합·비복원 추출 | 이번에 Pages 경로로 통일 |
| `IMPRESSION`에 position/propensity/score/policy/context | 서버 생성으로 기록 | 이번에 보강 |
| 슬레이트가 실제로 무엇을 포함했는지 재현 | `recommendation_slates.items_json` | 이번에 보강 |
| 서버 식별자 기반 이벤트 소유권 | `/api/events`가 Google 세션 또는 guest cookie 사용 | 유지 |
| 사용자 taste posterior/온라인 업데이트 | DO 저장 구조는 있으나 Pages 이벤트 경로가 theta를 갱신하지 않음 | **미구현으로 명시** |
| 그룹 least-misery/결승 조율 | 별도 legacy `server/routes.ts` 구현은 존재하지만 Pages의 정식 추천 경로와 분리 | 통합 필요 |
| offline IPS/DR, A/B 판정, 배치 학습 | 모델·하니스 코드 일부는 legacy Node 경로에 있으나 운영 D1 파이프라인은 없음 | 아직 시작하지 않음 |
| 소비/재주문 정답 | 이벤트 타입만 있고 검증된 수집 플로우 부족 | 후속 |

## 현재의 권위 있는 경로

```text
Lunchie 설정/세션 필터
  → Pages /api/recommend
  → D1 hard filters + stage0 contextual policy
  → recommendation_slates + server IMPRESSION (원자 기록)
  → Swipe/Winner/Navigate event
  → D1 rec_events
  → /api/admin/metrics (익명 집계·학습 준비도)
```

`server/routes.ts`의 Express 엔진은 기존 연구/실험용 구현을 담고 있지만 Pages 배포가 직접
호출하지 않는다. 두 경로가 각기 다른 점수·propensity·taste 업데이트를 가지면 결과를
비교할 수 없으므로, 이후 기능은 Pages의 공용 policy 모듈만 사용하도록 옮긴다.

## 대시보드가 이제 답하는 질문

* **학습 준비도**: 필수 증거가 없으면 “학습 전제 미충족”으로 표시한다. 작은 표본을
  개인화 성공으로 보이지 않는다.
* **계측 계약**: 서버가 기록한 노출의 propensity, score, 정책 버전, 맥락 커버리지를
  각각 보여 준다. SWIPE 행의 임의 값으로 대체하지 않는다.
* **행동 귀속**: 실제 슬레이트에 연결된 스와이프 수를 따로 보여 준다.
* **카테고리 편향**: 노출량과 결정량을 함께 표시해 많이 노출된 항목의 단순 수락률을
  성과로 오해하지 않게 한다.

개인 이메일, 정확한 좌표, 개별 taste vector는 API와 화면에 포함하지 않는다.

## 다음 구현 순서

1. 모든 FINAL/그룹 reroll도 `recommendation_slates`를 통해 생성하고, 이벤트가
   `slate_id + restaurant_id + position`에 실제 포함되는지 서버에서 검증한다.
2. Pages 이벤트 수집 시 DO에 반응을 안전하게 반영하고, D1 기반 feature/taste store와
   버전된 policy를 도입한다. 이 전에는 `stage0-contextual-v1`만 운영 정책이다.
3. `VISIT`/`REORDER`/회고 설문을 명시적 동의 기반으로 수집하고, `WINNER`와 혼용하지 않는다.
4. 정책별 holdout, 최소 표본, 결정 시간·reroll·다양성 가드레일을 사전 등록한 뒤에만
   IPS/DR 및 온라인 A/B를 실행한다.
