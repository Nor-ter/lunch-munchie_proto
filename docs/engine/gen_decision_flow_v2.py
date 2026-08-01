# 런치 결정 플로우 v2 (통일) PDF — ReportLab + HYGothic-Medium(한글 CID)
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
CORAL = HexColor("#EB5053"); AMBER = HexColor("#F09D09"); BLUE = HexColor("#3E719B")
GREEN = HexColor("#3CBA44"); INK = HexColor("#1A1A1A"); SUB = HexColor("#6E6E6E"); LINE = HexColor("#D8D2CB")
BOXF = HexColor("#FFFFFF"); BOXB = HexColor("#D3D1C7"); GRAYF = HexColor("#F1EFE8")
AMBF = HexColor("#FAEEDA"); AMBB = HexColor("#EF9F27"); AMBT = HexColor("#8A5A0B")
GRNF = HexColor("#EAF7EC"); GRNB = HexColor("#3CBA44"); GRNT = HexColor("#2E6B36")

ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Title"], fontName=F, fontSize=20, textColor=CORAL, spaceAfter=2, leading=24)
SUBT = ParagraphStyle("SUBT", fontName=F, fontSize=9.5, textColor=SUB, spaceAfter=12, leading=13)
H2 = ParagraphStyle("H2", fontName=F, fontSize=13.5, textColor=BLUE, spaceBefore=12, spaceAfter=5, leading=17)
BODY = ParagraphStyle("BODY", fontName=F, fontSize=9.5, textColor=INK, leading=15, spaceAfter=4, alignment=TA_LEFT)
BULLET = ParagraphStyle("BULLET", parent=BODY, leftIndent=10, spaceAfter=2)
CAP = ParagraphStyle("CAP", fontName=F, fontSize=8.5, textColor=SUB, leading=12, spaceBefore=3)
CELL = ParagraphStyle("CELL", fontName=F, fontSize=8.2, textColor=INK, leading=11)
HEAD = ParagraphStyle("HEAD", fontName=F, fontSize=8.4, textColor=white, leading=11)


def tbl(data, colw):
    rows = [[Paragraph(str(c), HEAD if ri == 0 else CELL) for c in row] for ri, row in enumerate(data)]
    t = Table(rows, colWidths=colw)
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, 0), (-1, 0), BLUE)]))
    return t


def P(s, st=BODY):
    return Paragraph(s, st)


class Flow(Flowable):
    """통일 결정 플로우 다이어그램 (세로). 예선 → 좋아요 → 분기 → 듀얼(고르기/둘 다 별로)."""
    def __init__(self, w=520, h=300):
        super().__init__(); self.w, self.h = w, h

    def wrap(self, *a):
        return self.w, self.h

    def box(self, c, x, y, w, h, title, sub, fill, bd, tc, sc):
        c.setFillColor(fill); c.setStrokeColor(bd); c.setLineWidth(0.9)
        c.roundRect(x, y, w, h, 6, fill=1, stroke=1)
        c.setFillColor(tc); c.setFont(F, 9)
        c.drawCentredString(x + w / 2, y + h - 14, title)
        if sub:
            c.setFillColor(sc); c.setFont(F, 7.6)
            c.drawCentredString(x + w / 2, y + 6, sub)

    def arrow(self, c, x1, y1, x2, y2, label=None):
        c.setStrokeColor(SUB); c.setLineWidth(1.1); c.line(x1, y1, x2, y2)
        c.setFillColor(SUB)
        if y2 < y1:
            c.lines([(x2, y2, x2 - 3, y2 + 5), (x2, y2, x2 + 3, y2 + 5)])
        else:
            c.lines([(x2, y2, x2 - 3, y2 - 5), (x2, y2, x2 + 3, y2 - 5)])
        if label:
            c.setFillColor(AMBT); c.setFont(F, 7.4)
            c.drawCentredString((x1 + x2) / 2 + 16, (y1 + y2) / 2, label)

    def draw(self):
        c = self.canv; W, H = self.w, self.h
        cx = W / 2
        # 세로 스택
        self.box(c, cx - 110, H - 40, 220, 34, "예선 7장 (이진 좋아요/싫어요)", "엔진 추천 top-7", BOXF, BOXB, INK, SUB)
        self.arrow(c, cx, H - 40, cx, H - 52)
        self.box(c, cx - 110, H - 86, 220, 34, "좋아요 집합", "pointwise like/nope", BOXF, BOXB, INK, SUB)
        self.arrow(c, cx, H - 86, cx, H - 98)
        # 분기 박스
        self.box(c, cx - 150, H - 138, 300, 36, "분기 (좋아요 수)", "0 -> 엔진 top-2 완화  /  1 -> 바로 우승  /  2+ -> 듀얼", AMBF, AMBB, AMBT, AMBT)
        self.arrow(c, cx, H - 138, cx, H - 150)
        # 듀얼
        self.box(c, cx - 130, H - 196, 260, 38, "엔진 top-2 듀얼 (A vs B)", "1:1 비교 = 2AFC 선호 실험", BLUE, BLUE, white, white)
        self.canv.setFillColor(white)
        # 듀얼 양쪽 출구
        self.arrow(c, cx - 70, H - 196, cx - 130, H - 224, "고르기")
        self.arrow(c, cx + 70, H - 196, cx + 130, H - 224, "둘 다 별로")
        self.box(c, cx - 230, H - 258, 200, 34, "우승 확정", "CHOOSE(A>B) -> WINNER", GRNF, GRNB, GRNT, GRNT)
        self.box(c, cx + 30, H - 258, 200, 34, "다음 후보 쌍", "두 곳 NOPE -> 남은 좋아요", AMBF, AMBB, AMBT, AMBT)
        # 둘 다 별로 -> 다시 듀얼(루프) 표시
        c.setStrokeColor(AMBB); c.setLineWidth(1); c.setDash(2, 2)
        c.line(cx + 130, H - 258, cx + 130, H - 272); c.line(cx + 130, H - 272, cx - 200, H - 272); c.line(cx - 200, H - 272, cx - 200, H - 196 - 19)
        c.setDash()
        c.setFillColor(AMBT); c.setFont(F, 7.2)
        c.drawString(cx - 120, H - 280, "둘 다 별로 -> 다음 쌍으로 듀얼 반복 (소진 시 새 추천 reroll)")


story = []
story += [P("런치 결정 플로우 v2 — 통일", H1),
          P("미니 토너먼트 제거 -> 엔진 top-2 듀얼 + '둘 다 별로' 탈출구 · 2026-06-24", SUBT)]
story += [P("결론: 좁히기를 좋아요 수별로 분기(2/3-4/5-7)하고 준결승 브래킷을 두던 걸 걷어내고, "
            "단일 모델로 통일한다 — '엔진이 top-2를 제시 -> 하나 고르거나, 둘 다 별로면 다음 후보'. "
            "좋아요가 1개든 7개든 같은 흐름이다.", BODY),
          Spacer(1, 6), Flow(), Spacer(1, 2),
          P("[그림 1] 통일 결정 플로우. 듀얼은 1:1 강제 2선택(2AFC) 선호 실험 = 최고급 pairwise 신호. "
            "'둘 다 별로'는 양쪽 모두 역치 미달이라는 깨끗한 음성 + 다음 후보로.", CAP)]

story += [P("1. 왜 통일했나", H2),
          P("• 이론 권장안과 일치 — '엔진 score top-2 + 결승 1번, 많이 좋아요면 엔진이 정한다'가 원래 권장이었다.", BULLET),
          P("• 통일성 — 좋아요 수 분기/준결승 브래킷 제거. duel 상태에서 stage/champion 삭제, 화면 1단.", BULLET),
          P("• 피로/신호 — 재시작보다 마찰이 적고, '엔진 첫 제안이 별로'라는 거절 신호가 강제 좁히기보다 깨끗하다.", BULLET)]

story += [P("2. 왜 기능을 늘리지 않나 (간결 > 백화점)", H2),
          P("Lunchie의 존재 이유가 결정 피로 제거다. 뒤로가기/전부 다시/결승 셔플 같은 버튼을 늘리면 "
            "오히려 선택 마비를 부르고, 이미 탈출구에 흡수된다:", BODY),
          P("• '결승 셔플' = '둘 다 별로 -> 다른 곳' (동일)  • '전부 다시' = 좋아요 소진 시 reroll (폴백)", BULLET),
          P("• '한 단계 뒤로' = 1번 비교 흐름에선 불필요 (히스토리 스택만 복잡)", BULLET),
          P("-> 앞으로 1개(고르기) + 탈출 1개(둘 다 별로) + 막판 reroll 1개. 끝.", BULLET)]

story += [PageBreak(), P("3. 단계별 수집 데이터 -> 엔진 신호", H2)]
story += [tbl([
    ["단계 / 행동", "이벤트", "엔진 신호 (학습)"],
    ["예선 노출", "IMPRESSION x7 (propensity/position)", "off-policy 기반"],
    ["예선 스와이프", "SWIPE LIKE/NOPE (round1)", "취향 theta_u (pointwise, weight 1)"],
    ["듀얼 노출", "IMPRESSION x2 (FINAL)", "pairwise 후보"],
    ["듀얼 '하나 고르기'", "SWIPE CHOOSE (FINAL, opponent_id)", "취향 pairwise(A>B, weight 2) + WINNER"],
    ["듀얼 '둘 다 별로'", "SWIPE NOPE x2 (FINAL)", "취향 음성(둘 다 역치 미달)"],
    ["우승 확정", "WINNER", "취향(+2) + satiation + 음식연쇄"],
    ["저장 / 길찾기", "COURSE_SAVE / NAVIGATE", "취향(+3) / 방문 의도"],
    ["중도 이탈", "ABANDON (phase/swipes_done)", "피로/이탈 (어디서 몇 장)"],
], [120, 200, 160])]

story += [P("4. 신호 위계 — 아래로 갈수록 강하다", H2),
          P("pointwise(예선 스와이프) < pairwise(듀얼 CHOOSE / 둘 다 별로) < 명시(저장)·행동(우승·방문). "
            "듀얼은 1:1 강제 비교라 가장 깨끗한 선호 신호다.", BODY)]

story += [P("5. 엔진 반영 (코드)", H2),
          P("• updateTaste(x, y, weight) — 예선 1, 우승 2, 저장 3. (pointwise 베이지안)", BULLET),
          P("• updatePairwise(x_win, x_lose) — 듀얼 A>B 차이를 선호=1 방향으로 학습 (score 승자↑·패자↓)", BULLET),
          P("• '둘 다 별로' -> 두 후보 NOPE(FINAL) 음성 + 남은 좋아요로 다음 듀얼", BULLET),
          P("• WINNER -> satiation(재소비)·음식연쇄(Munchie)·취향, ABANDON -> 피로 진단", BULLET)]

out = "/Users/jonghopark/Documents/GitHub/lunch-munchie_proto/docs/engine/lunchie_decision_flow.pdf"
SimpleDocTemplate(out, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
                  title="런치 결정 플로우 v2", author="Lunchie").build(story)
print("WROTE", out)
