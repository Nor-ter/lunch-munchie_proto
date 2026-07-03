# 백로그 업데이트 (Miro 반영 대기) — 2026-06-15

> Miro 연결 장애(net::ERR_FAILED)로 보드 직접 반영 보류 중.
> 연결 복구 시 메인 백로그 표(`moveToWidget=3458764675454908996`)와 UI 표(`...989847`)에 적용 예정.
> 담당 매핑: 인성=HI · 종호=JP · 승연=JS · 태훈=TH.

## 신규 추가 항목

| 에픽 | 스토리 | 설명(AC 초안) | 상태 | 크기 | 담당 |
|---|---|---|---|---|---|
| Munchie 모드 | Munchie 정적 와이어프레임 | Static wireframe 작성 (JS·TH 공동) | In Progress | M | JS |
| Munchie 모드 | Munchie 동적 와이어프레임 | Dynamic wireframe 작성 (JS·TH 공동) | In Progress | M | TH |
| Lunchie 모드 | Lunchie 정적 와이어프레임 적용 | Static wireframe(md 완료) 바탕 Lunchie Mode 적용 (JP·HI) | In Progress | M | JP |
| Lunchie 모드 | Lunchie 동적 와이어프레임 | Dynamic wireframe md화 예정 → 적용 (JP·HI) | Ready | M | HI |
| Lunchie 모드 | Lunchie Mode 기능 연구 | 기능적 부분 연구 | In Progress | M | HI |
| 데이터·인프라 | Lunchie 데이터 연결 | Lunchie Mode 데이터 연결 구현 | In Progress | M | JP |
| 데이터·인프라 | Ticketing 아키텍처 상세 설계 | Ticketing 위한 architecture 자세히 분할 (HI·JP 공동) | In Progress | L | JP |
| 데이터·인프라 | Miro–Claude MCP 가이드라인 | 가이드라인 문서 작성 | In Progress | S | JP |
| 수익화 | 수익화 모델 best/worst 선정·발표 | best·worst 하나씩 골라 발표, 좋은 아이디어면 추가 (All) | In Progress | S | 미정 |
| UI·디자인 | 모션 효과 구현 | Motion effects 구현 | In Progress | M | HI |

## 적용 절차 (복구 시)
1. 메인 표 `table_list_rows`로 현재 행·중복 확인
2. 위 신규 행 `table_sync_rows`로 삽입 (Munchie/Lunchie/데이터·인프라/수익화)
3. UI 표에 "모션 효과 구현" 삽입
4. 기존 겹치는 항목 있으면 상태만 갱신(중복 생성 금지)
