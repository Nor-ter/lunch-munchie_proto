# 런치 엔진 아키텍처 설계 PDF — ReportLab + HYGothic-Medium(한글 CID)
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable,
)

pdfmetrics.registerFont(UnicodeCIDFont("HYGothic-Medium"))
F = "HYGothic-Medium"

CORAL = HexColor("#EB5053")
AMBER = HexColor("#F09D09")
BLUE = HexColor("#3E719B")
GREEN = HexColor("#3CBA44")
INK = HexColor("#1A1A1A")
SUB = HexColor("#6E6E6E")
LINE = HexColor("#D8D2CB")
BLUEFILL = HexColor("#E6F1FB")
BLUEBORDER = HexColor("#85B7EB")
BLUETXT = HexColor("#0C447C")
BOXFILL = HexColor("#FFFFFF")
BOXBORDER = HexColor("#D3D1C7")
GRAYFILL = HexColor("#F1EFE8")

ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Title"], fontName=F, fontSize=20, textColor=CORAL, spaceAfter=2, leading=24)
SUBT = ParagraphStyle("SUBT", fontName=F, fontSize=9.5, textColor=SUB, spaceAfter=12, leading=13)
H2 = ParagraphStyle("H2", fontName=F, fontSize=13.5, textColor=BLUE, spaceBefore=12, spaceAfter=5, leading=17)
BODY = ParagraphStyle("BODY", fontName=F, fontSize=9.5, textColor=INK, leading=15, spaceAfter=4, alignment=TA_LEFT)
BULLET = ParagraphStyle("BULLET", parent=BODY, leftIndent=10, spaceAfter=2)
CODE = ParagraphStyle("CODE", fontName=F, fontSize=9, textColor=INK, leading=15, backColor=GRAYFILL, borderPadding=8)
CAP = ParagraphStyle("CAP", fontName=F, fontSize=8.5, textColor=SUB, leading=12, spaceBefore=3)


class Arch(Flowable):
    """3-레이어 아키텍처 다이어그램 (서빙 / 피처 스토어 / 오프라인) + 피드백 루프."""
    def __init__(self, w=520, h=232):
        super().__init__()
        self.w, self.h = w, h

    def wrap(self, *a):
        return self.w, self.h

    def _box(self, c, x, y, w, h, title, sub, fill, border, tcol, scol):
        c.setFillColor(fill); c.setStrokeColor(border); c.setLineWidth(0.8)
        c.roundRect(x, y, w, h, 5, fill=1, stroke=1)
        c.setFillColor(tcol); c.setFont(F, 8.6)
        c.drawCentredString(x + w / 2, y + h - 13, title)
        c.setFillColor(scol); c.setFont(F, 7.6)
        c.drawCentredString(x + w / 2, y + 5.5, sub)

    def _arrow(self, c, x1, y, x2, label):
        c.setStrokeColor(BLUE); c.setLineWidth(1.1)
        c.line(x1, y, x2, y)
        d = 4 if x2 > x1 else -4
        c.setFillColor(BLUE)
        c.lines([(x2, y, x2 - d, y + 3), (x2, y, x2 - d, y - 3)])
        c.setFillColor(BLUETXT); c.setFont(F, 7.4)
        c.drawCentredString((x1 + x2) / 2, y + 4, label)

    def draw(self):
        c = self.canv
        W, H = self.w, self.h
        # 3 layer containers
        c1x, c1w = 6, 150
        c2x, c2w = 192, 116
        c3x, c3w = 344, 150
        top = H - 6
        bandh = 168
        for x, w, border in [(c1x, c1w, BOXBORDER), (c2x, c2w, BLUEBORDER), (c3x, c3w, BOXBORDER)]:
            c.setStrokeColor(border); c.setFillColor(white); c.setLineWidth(1)
            c.roundRect(x, top - bandh, w, bandh, 8, fill=0, stroke=1)
        # headers
        c.setFont(F, 9.2)
        c.setFillColor(INK); c.drawCentredString(c1x + c1w / 2, top - 15, "1) 서빙 / TS (실시간)")
        c.setFillColor(BLUETXT); c.drawCentredString(c2x + c2w / 2, top - 15, "2) 피처 스토어")
        c.setFillColor(INK); c.drawCentredString(c3x + c3w / 2, top - 15, "3) 오프라인 / Python")
        # serving boxes
        sx, sw = c1x + 10, c1w - 20
        sb = [("FeatureProvider", "취향/피처 로드"),
              ("스코어러 파이프라인", "평판/맥락/취향/피로"),
              ("슬레이트 빌더", "K개 + propensity"),
              ("온라인 학습 (SGD)", "스와이프 즉시 반영")]
        sy = top - 30
        for t, s in sb:
            self._box(c, sx, sy - 30, sw, 30, t, s, BOXFILL, BOXBORDER, INK, SUB); sy -= 36
        # store boxes
        tx, tw = c2x + 8, c2w - 16
        tb = [("restaurant_features", "아이템 벡터 x_i"),
              ("user_taste", "취향 벡터 theta_u"),
              ("rec_events", "이벤트 로그")]
        ty = top - 34
        for t, s in tb:
            self._box(c, tx, ty - 30, tw, 30, t, s, BLUEFILL, BLUEBORDER, BLUETXT, HexColor("#185FA5")); ty -= 40
        # offline boxes
        ox, ow = c3x + 10, c3w - 20
        ob = [("피처/임베딩", "맛 프로파일/텍스트"),
              ("배치 학습", "IPS / survival"),
              ("off-policy 평가", "IPS/DR 추정"),
              ("스케줄러", "야간 cron / GH Action")]
        oy = top - 30
        for t, s in ob:
            self._box(c, ox, oy - 30, ow, 30, t, s, BOXFILL, BOXBORDER, INK, SUB); oy -= 36
        # arrows between serving and store
        self._arrow(c, c2x, top - 52, c1x + c1w + 2, "읽기")
        self._arrow(c, c1x + c1w + 2, top - 78, c2x, "로깅")
        # arrows between store and offline
        self._arrow(c, c2x + c2w, top - 52, c3x - 2, "학습")
        self._arrow(c, c3x - 2, top - 78, c2x + c2w, "갱신")
        # footer experiment band
        fy = top - bandh - 26
        c.setFillColor(GRAYFILL); c.setStrokeColor(HexColor("#B4B2A9")); c.setLineWidth(0.8)
        c.roundRect(6, fy, W - 12, 20, 5, fill=1, stroke=1)
        c.setFillColor(INK); c.setFont(F, 8.4)
        c.drawCentredString(W / 2, fy + 6.5, "4) 실험 — assignVariant(user) -> control / B / off-policy -> A/B 판정 (Tier 4 대시보드)")


CELL = ParagraphStyle("CELL", fontName=F, fontSize=8.2, textColor=INK, leading=11)
HEAD = ParagraphStyle("HEAD", fontName=F, fontSize=8.4, textColor=white, leading=11)


def tbl(data, colw, header=True):
    rows = [[Paragraph(str(cell), HEAD if (header and ri == 0) else CELL) for cell in row]
            for ri, row in enumerate(data)]
    t = Table(rows, colWidths=colw)
    st = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    if header:
        st += [("BACKGROUND", (0, 0), (-1, 0), BLUE)]
    t.setStyle(TableStyle(st))
    return t


def P(s, style=BODY):
    return Paragraph(s, style)


story = []
# ---------- PAGE 1 ----------
story += [P("런치 엔진 아키텍처 설계", H1),
          P("온라인 서빙 / 피처 스토어 / 오프라인 학습 — 2026-06-23", SUBT)]
story += [P("핵심 결정: 온라인(서빙)과 오프라인(학습)을 분리하고, 그 사이를 '피처 스토어'가 잇는 "
            "표준 추천 아키텍처. 지금 스택(Node/Express + Postgres)을 거의 그대로 쓰고, 무거운 ML만 "
            "Python으로 분리한다. 두 언어는 직접 엮이지 않고 DB(피처 스토어)로만 소통한다.", BODY),
          Spacer(1, 8), Arch(), Spacer(1, 4),
          P("[그림 1] 서빙(TS)이 이벤트를 로깅 -> 오프라인(Python)이 그 로그로 학습 -> 피처 스토어에 "
            "갱신 -> 서빙이 다시 읽는 피드백 루프. 실험(A/B)은 model_version으로 버전을 서빙한다.", CAP)]

# ---------- PAGE 2 ----------
story += [PageBreak(), P("1. 레이어별 기술", H2)]
story += [tbl([
    ["레이어", "무엇을 하나", "기술"],
    ["서빙 (실시간)", "score() 추론 + 슬레이트 + 온라인 SGD", "Node/Express + TypeScript (기존 server/engine)"],
    ["피처 스토어", "x_i / theta_u / 이벤트 로그", "Postgres(Supabase) + Drizzle + pgvector"],
    ["오프라인 (배치)", "임베딩 / IPS 학습 / survival / off-policy", "Python (numpy/scikit-learn, lifelines, sentence-transformers)"],
    ["실험", "배정 / 판정", "assignVariant + Tier 4 readout (구축 완료)"],
], [80, 200, 200])]

story += [P("2. 모듈형 서브스코어러", H2),
          P("스코어러는 하나의 거대 함수가 아니라, 교체 가능한 서브스코어러의 합이다. 각 항을 "
            "휴리스틱 -> 학습형으로 하나씩 교체한다. 이 구조가 곧 B2B 이식성(외부가 자기 피처만 꽂음).", BODY)]
story += [Table([[Paragraph(
    "score(c | user, ctx) =<br/>"
    "&nbsp;&nbsp; w1*취향 + w2*맥락 + w3*평판 + w4*새로움 + w5*그룹<br/>"
    "&nbsp;&nbsp; - w6*노출피로  +/-  w7*재소비(satiation)  + eps(탐색)", CODE)]],
    colWidths=[480], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), GRAYFILL),
                                       ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                                       ("TOPPADDING", (0, 0), (-1, -1), 8),
                                       ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                                       ("LEFTPADDING", (0, 0), (-1, -1), 10)]))]
story += [Spacer(1, 4),
          P("• 인터페이스: SubScorer.score(candidate, ctx, userState) -> number. 파이프라인이 가중합.", BULLET),
          P("• v0은 평판/맥락만 휴리스틱. 비어있는 취향/노출피로/satiation 항을 로그로 학습해 채운다.", BULLET),
          P("• 가중치 w1..w7은 맥락별로 동적(점심 vs 디저트, 자국 vs 여행). 최종적으로 학습 대상.", BULLET)]

# ---------- PAGE 3 ----------
story += [PageBreak(), P("3. 데이터 흐름 / 피드백 루프", H2)]
story += [P("1) 앱 -> /api/recommend: 맥락 스냅샷과 함께 추천 요청.", BULLET),
          P("2) 서빙: FeatureProvider가 스토어에서 theta_u/x_i를 읽어 스코어 -> 슬레이트(K개 + propensity).", BULLET),
          P("3) 노출/스와이프가 rec_events에 로깅(propensity 승계). 온라인 학습기는 스와이프마다 "
            "theta_u를 즉시 SGD 갱신.", BULLET),
          P("4) 오프라인(야간): rec_events를 ETL -> IPS 배치 학습/임베딩/survival -> 스토어 갱신.", BULLET),
          P("5) 서빙이 갱신된 피처를 다시 읽는다. 루프가 닫힌다.", BULLET)]

story += [P("4. 학습 메커니즘 (v1 + off-policy)", H2)]
story += [P("취향 벡터 theta_u", ParagraphStyle("b", parent=BODY, fontSize=10, textColor=BLUE, spaceAfter=2)),
          P("• 라벨: 모든 SWIPE = LIKE(1)/NOPE(0), 아이템 x_i에 대한 암묵 정답.", BULLET),
          P("• 모델: P(like|u,i) = sigmoid(theta_u dot x_i + b) — 아이템 피처 위 유저별 로지스틱.", BULLET),
          P("• 온라인: theta_u += lr*(y - p)*x_i (스와이프 즉시 반영). 오프라인: IPS 가중 1/propensity로 재적합.", BULLET),
          P("• 콜드스타트: 신규 유저 theta_u = 모집단 평균(계층 베이즈 shrink) -> 스와이프 쌓이며 개인화.", BULLET)]
story += [P("노출 피로 / off-policy", ParagraphStyle("b2", parent=BODY, fontSize=10, textColor=BLUE, spaceBefore=4, spaceAfter=2)),
          P("• 노출 피로: -w6*g(누적 노출). g는 Tier 2 노출피로 패널의 실제 감소곡선에서 적합.", BULLET),
          P("• off-policy: v0의 편향된 슬레이트를 1/propensity로 보정(IPS). 출시 전 IPS/DR로 V(pi_v1) "
            "추정 -> v0보다 나으면 Tier 4 A/B로 온라인 확정.", BULLET)]

# ---------- PAGE 4 ----------
story += [PageBreak(), P("5. 로드맵 — 단계 / 학습신호 / 검증패널", H2)]
story += [tbl([
    ["단계", "학습 신호", "모델", "검증 패널"],
    ["v0.5 아이템 피처", "메뉴/리뷰/태그(오프라인)", "구조적+맛 프로파일+임베딩 -> x_i", "(기반)"],
    ["v1 취향+노출피로", "스와이프 + 노출횟수", "theta_u 로지스틱 + 피로 패널티", "Tier 2 분별력/노출피로"],
    ["v2 satiation+연쇄", "소비 timestamp(검열)", "생존분석 hazard + occasion 시퀀스", "Tier 2 satiation"],
    ["v3 밴딧+그룹", "propensity + 보상", "Thompson Sampling + least-misery", "Tier 2 탐색/공정성"],
    ["v4 전이+명시신호", "새 도시 스와이프 + 저장/수정", "city-invariant 부분공간 매핑", "Tier 2 여행전이"],
], [86, 150, 158, 86])]

story += [P("6. 재사용 vs 신규 / 규모 확장", H2),
          P("• 재사용: scorer.ts(서브스코어러로 리팩터), events.ts(피드백 수집), context.ts, "
            "Tier 2/4 패널(검증 하니스), propensity 로깅(off-policy 연료).", BULLET),
          P("• 신규: restaurant_features/user_taste 테이블(+pgvector), 온라인 SGD 학습기(TS), Python 배치 잡 1개.", BULLET),
          P("• 확장: neural로 가면 Python 추론 서비스(FastAPI) 분리. 카탈로그 거대화 시 pgvector -> 전용 벡터DB. "
            "24개 식당 규모에선 인라인 TS + Postgres가 정답(과설계 금물).", BULLET)]

story += [P("7. 첫 스프린트", H2),
          P("1) v0.5: restaurant_features 테이블 + 맛 프로파일 추출(구조적 먼저, 임베딩 후속).", BULLET),
          P("2) v1: scoreCandidate에 w1*sigmoid(theta_u dot x_i) 추가 + 온라인 SGD + IPS 야간 배치.", BULLET),
          P("3) 검증: Tier 2 분별력 gap 상승, Tier 4 A/B에서 v1 arm이 random/v0를 이기는지.", BULLET)]

out = os.path.join(os.path.dirname(__file__), "..", "Documents", "GitHub", "lunch-munchie_proto",
                   "docs", "engine", "lunchie_engine_architecture.pdf")
out = "/Users/jonghopark/Documents/GitHub/lunch-munchie_proto/docs/engine/lunchie_engine_architecture.pdf"
doc = SimpleDocTemplate(out, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm,
                        topMargin=16 * mm, bottomMargin=16 * mm,
                        title="런치 엔진 아키텍처 설계", author="Lunchie")
doc.build(story)
print("WROTE", out)
