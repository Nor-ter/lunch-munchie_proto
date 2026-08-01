# 런치엔진 — 로직 · 알고리즘 · 수집 데이터 (행동→이벤트→신호→알고리즘→추천)
# ReportLab + HYGothic-Medium. 이모지 미사용.
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable

pdfmetrics.registerFont(UnicodeCIDFont("HYGothic-Medium"))
F = "HYGothic-Medium"
CORAL = HexColor("#EB5053"); BLUE = HexColor("#3E719B"); INK = HexColor("#1A1A1A")
SUB = HexColor("#6E6E6E"); LINE = HexColor("#D8D2CB")
BOXF = HexColor("#FFFFFF"); BOXB = HexColor("#D3D1C7"); GRAYF = HexColor("#F1EFE8")
CRLF = HexColor("#FDEEE9"); CRLB = HexColor("#EB5053"); CRLT = HexColor("#B5282B")
BLUF = HexColor("#EAF1F8"); BLUB = HexColor("#5B8DEF"); BLUT = HexColor("#2E5BB8")
GRNF = HexColor("#EAF7EC"); GRNB = HexColor("#3CBA44"); GRNT = HexColor("#2E6B36")

ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Title"], fontName=F, fontSize=19, textColor=CORAL, spaceAfter=2, leading=23, alignment=TA_LEFT)
SUBT = ParagraphStyle("SUBT", fontName=F, fontSize=9.5, textColor=SUB, spaceAfter=10, leading=13)
H2 = ParagraphStyle("H2", fontName=F, fontSize=13, textColor=BLUE, spaceBefore=10, spaceAfter=4, leading=16)
BODY = ParagraphStyle("BODY", fontName=F, fontSize=9.5, textColor=INK, leading=15, spaceAfter=4, alignment=TA_LEFT)
BUL = ParagraphStyle("BUL", parent=BODY, leftIndent=10, spaceAfter=2)
CAP = ParagraphStyle("CAP", fontName=F, fontSize=8.5, textColor=SUB, leading=12, spaceBefore=3)
CELL = ParagraphStyle("CELL", fontName=F, fontSize=8.2, textColor=INK, leading=11)
MONO = ParagraphStyle("MONO", fontName=F, fontSize=9, textColor=INK, leading=14, backColor=HexColor("#F4F2EC"), borderPadding=6)
HEAD = ParagraphStyle("HEAD", fontName=F, fontSize=8.4, textColor=white, leading=11)


def P(s, st=BODY):
    return Paragraph(s, st)


def tbl(data, colw):
    rows = [[Paragraph(str(c), HEAD if ri == 0 else CELL) for c in row] for ri, row in enumerate(data)]
    t = Table(rows, colWidths=colw)
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("BACKGROUND", (0, 1), (0, -1), HexColor("#F7F5F0")),
    ]))
    return t


def _box(c, x, y, w, h, title, sub, fill, bd, tc, sc):
    c.setFillColor(fill); c.setStrokeColor(bd); c.setLineWidth(0.9)
    c.roundRect(x, y, w, h, 6, fill=1, stroke=1)
    c.setFillColor(tc); c.setFont(F, 8.6)
    c.drawCentredString(x + w / 2, y + (h - 13 if sub else h / 2 - 3), title)
    if sub:
        c.setFillColor(sc); c.setFont(F, 6.9)
        for i, ln in enumerate(sub.split("\n")):
            c.drawCentredString(x + w / 2, y + 8 - i * 8, ln)


def _arrow(c, x1, y1, x2, y2, col=SUB, dash=False):
    c.setStrokeColor(col); c.setLineWidth(1.1)
    if dash:
        c.setDash(2, 2)
    c.line(x1, y1, x2, y2); c.setDash()
    c.setFillColor(col)
    import math
    dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy) or 1
    ux, uy = dx / L, dy / L; px, py = -uy, ux
    c.lines([(x2, y2, x2 - 7 * ux + 3.5 * px, y2 - 7 * uy + 3.5 * py),
             (x2, y2, x2 - 7 * ux - 3.5 * px, y2 - 7 * uy - 3.5 * py)])


class Pipeline(Flowable):
    """행동 → 이벤트 → 신호·알고리즘 → 추천, + propensity/off-policy 피드백 루프."""
    def __init__(self, w=500, h=150):
        super().__init__(); self.w, self.h = w, h

    def wrap(self, *a):
        return self.w, self.h

    def draw(self):
        c = self.canv
        _box(c, 8, 86, 112, 44, "유저 행동", "스와이프·우승\n거부·reroll·저장", CRLF, CRLB, CRLT, CRLT)
        _arrow(c, 120, 108, 138, 108)
        _box(c, 138, 86, 112, 44, "이벤트", "rec_events\n로깅(propensity)", GRAYF, BOXB, INK, SUB)
        _arrow(c, 250, 108, 268, 108)
        _box(c, 268, 86, 128, 44, "신호 · 알고리즘", "취향·pairwise·least-\nmisery·피로·재소비·연쇄", BLUF, BLUB, BLUT, BLUT)
        _arrow(c, 396, 108, 414, 108)
        _box(c, 414, 86, 80, 44, "추천", "슬레이트\n(Thompson)", GRNF, GRNB, GRNT, GRNT)
        # 피드백 루프 (추천 → 이벤트, off-policy)
        c.setStrokeColor(BLUB); c.setLineWidth(1.1); c.setDash(3, 2)
        c.line(454, 86, 454, 60); c.line(454, 60, 194, 60); c.line(194, 60, 194, 86)
        c.setDash(); _arrow(c, 200, 66, 194, 84, col=BLUB)
        c.setFillColor(BLUT); c.setFont(F, 7.4)
        c.drawCentredString(324, 50, "propensity / off-policy (IPS) — 노출이 곧 다음 학습의 분모")


story = []
story += [P("런치엔진 — 로직 · 알고리즘 · 수집 데이터", H1),
          P("모든 행동이 학습 신호다 · 행동→이벤트→신호→알고리즘→추천 · 2026-06-27", SUBT)]

story += [P("0. 철학 — 모든 행동이 학습 신호", H2),
          P("결정에만 쓰고 버리는 행동은 없다. 좋아요·우승뿐 아니라 <b>거부·둘 다 별로·reroll·합의 실패</b>까지 "
            "전부 이벤트로 남겨 엔진을 먹인다. 노출(IMPRESSION)은 propensity와 함께 기록돼 off-policy 평가(IPS)의 "
            "분모가 된다 — 즉 '무엇을 보여줬는가'가 다음 학습의 편향을 보정한다.", BODY),
          Spacer(1, 4), Pipeline(), Spacer(1, 2),
          P("[그림] 행동 → 이벤트 → 신호·알고리즘 → 추천. 점선 = 추천이 다시 이벤트(propensity)로 남아 off-policy로 되먹임.", CAP)]

story += [P("1. 수집 데이터 — 행동 → 이벤트 → 엔진 신호", H2),
          tbl([
              ["유저 행동", "이벤트", "엔진 신호"],
              ["예선 노출", "IMPRESSION (propensity)", "off-policy(IPS) 기반"],
              ["예선 스와이프 LIKE/NOPE", "SWIPE (round1)", "취향 θ(pointwise) · 그룹 least-misery 집계"],
              ["결승 노출", "IMPRESSION (FINAL ×2)", "슬레이트 품질(off-policy)"],
              ["결승 선택 (A>B)", "SWIPE CHOOSE (opponent_id, decision_ms)", "pairwise A>B (+신뢰도 가중)"],
              ["둘 다 별로 / 별로", "SWIPE NOPE (FINAL)", "명시 음성 (역치 미달)"],
              ["우승 확정", "WINNER", "취향(+2) · satiation · chain"],
              ["저장 / 회고", "COURSE_SAVE / SURVEY(POS·NEU·NEG)", "취향(+3) / 만족 정답"],
              ["중도 이탈", "ABANDON (phase·swipes_done)", "피로 · 이탈 위치"],
              ["reroll / 합의 실패", "REROLL + 제외 곳 / NO_CONSENSUS", "불만족 · 강한 음성 / 슬레이트 품질↓·탐색"],
          ], [120, 195, 170]),
          P("굵은 음성 신호(둘 다 별로 · reroll 제외 곳)는 *명시적 거부*라 특히 값지다 — 현재 일부는 미수집(코드 작업 G).", CAP)]

story += [PageBreak(), P("2. 알고리즘 — 신호를 무엇으로 바꾸나", H2),
          tbl([
              ["알고리즘", "입력 신호", "학습 / 출력"],
              ["취향 모델 (베이지안 선형회귀)", "SWIPE·WINNER·SAVE (가중 1/2/3)", "θ_u 사후분포 N(μ, A⁻¹), A=λI+Σxxᵀ"],
              ["Thompson Sampling", "취향 사후분포", "θ 샘플 → 불확실하면 탐색, 알면 활용"],
              ["pairwise (Bradley-Terry류)", "CHOOSE (듀얼·결승)", "d=x_win−x_lose 방향으로 θ 끌어당김"],
              ["least-misery (그룹)", "멤버별 θ / 예선 LIKE·DISLIKE", "후보별 멤버 최소만족·싫어요 적은 순"],
              ["노출 피로 (exposure)", "IMPRESSION 누적", "exposurePenalty (단기 식상 −)"],
              ["재소비 (satiation)", "WINNER / 소비", "최근 카테고리 억제 + 회복 곡선"],
              ["음식 연쇄 (chain)", "WINNER 시퀀스 (6h occasion)", "P(다음 카테고리 | 직전) 전이"],
              ["propensity / IPS", "IMPRESSION propensity", "off-policy 평가(노출 편향 보정)"],
          ], [135, 175, 175]),
          Spacer(1, 4),
          P("스코어 합성 (추천 슬레이트):", BODY),
          P("score = 0.4·평판 + 0.3·맥락 + 0.3·취향(θ_u) − 0.3·노출피로 + 0.3·재소비 + 0.4·연쇄 + Thompson(탐색)", MONO),
          P("그룹은 취향(θ_u) 자리에 멤버 least-misery(최소 만족)를 대입 — '아무도 불행하지 않게'.", CAP)]

story += [P("3. 로직 ↔ 데이터 ↔ 알고리즘 (결정 단계별 연결)", H2),
          P("결정 플로우의 각 단계가 어떤 데이터를 수집하고 어떤 알고리즘을 먹이는지 — 로직과 엔진은 한 몸이다.", BODY),
          tbl([
              ["결정 단계", "수집 데이터", "알고리즘"],
              ["예선 슬레이트 노출", "IMPRESSION (propensity)", "스코어러 + Thompson 탐색"],
              ["예선 스와이프", "SWIPE LIKE/NOPE", "취향 θ (pointwise) · 그룹 least-misery"],
              ["솔로 결승 듀얼", "SWIPE CHOOSE / NOPE", "pairwise (A>B) / 음성"],
              ["그룹 후보 선정·결승", "예선 집계 · 결승 표", "least-misery 랭크 · 다수결"],
              ["reroll (둘 다 별로)", "REROLL + 제외 다수미움", "강한 음성 + 새 슬레이트(탐색↑)"],
              ["우승 · 회고", "WINNER · SURVEY", "취향(+)·satiation·chain · 만족 정답"],
          ], [130, 175, 180]),
          Spacer(1, 4),
          P("핵심: 추천(엔진) → 노출(propensity) → 행동(이벤트) → 학습(알고리즘) → 더 나은 추천. "
            "이 순환에서 *거부·reroll·합의 실패까지* 신호로 흡수하는 게 런치엔진의 설계 원칙이다.", BODY),
          P("관련: 그룹 결정 모델 스펙(docs/superpowers/specs/2026-06-27-group-decision-model.md) · "
            "결정 메커니즘(lunchie_decision_mechanics.pdf) · 엔진 아키텍처(lunchie_engine_architecture.pdf).", CAP)]

out = os.path.join(os.path.dirname(__file__), "lunchie_engine_data_algo.pdf")
SimpleDocTemplate(out, pagesize=A4, topMargin=18 * mm, bottomMargin=16 * mm,
                  leftMargin=18 * mm, rightMargin=18 * mm,
                  title="런치엔진 — 로직·알고리즘·수집 데이터").build(story)
print("wrote", out)
