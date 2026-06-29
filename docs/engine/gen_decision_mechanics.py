# 결정 메커니즘 상세 — '둘 다 별로' 탈출구 & 재진입(다음-스톱) 흐름
# ReportLab + HYGothic-Medium. 이모지 미사용.
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Flowable

pdfmetrics.registerFont(UnicodeCIDFont("HYGothic-Medium"))
F = "HYGothic-Medium"
CORAL = HexColor("#EB5053"); BLUE = HexColor("#3E719B"); INK = HexColor("#1A1A1A")
SUB = HexColor("#6E6E6E"); LINE = HexColor("#D8D2CB"); RED = HexColor("#C2362F")
BOXF = HexColor("#FFFFFF"); BOXB = HexColor("#D3D1C7"); GRAYF = HexColor("#F1EFE8")
AMBF = HexColor("#FAEEDA"); AMBB = HexColor("#EF9F27"); AMBT = HexColor("#8A5A0B")
CRLF = HexColor("#FDEEE9"); CRLB = HexColor("#EB5053"); CRLT = HexColor("#B5282B")
GRNF = HexColor("#EAF7EC"); GRNB = HexColor("#3CBA44"); GRNT = HexColor("#2E6B36")

ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Title"], fontName=F, fontSize=18, textColor=CORAL, spaceAfter=2, leading=22, alignment=TA_LEFT)
SUBT = ParagraphStyle("SUBT", fontName=F, fontSize=9.5, textColor=SUB, spaceAfter=10, leading=13)
H2 = ParagraphStyle("H2", fontName=F, fontSize=13, textColor=BLUE, spaceBefore=10, spaceAfter=4, leading=16)
BODY = ParagraphStyle("BODY", fontName=F, fontSize=9.5, textColor=INK, leading=15, spaceAfter=4, alignment=TA_LEFT)
BUL = ParagraphStyle("BUL", parent=BODY, leftIndent=10, spaceAfter=2)
CAP = ParagraphStyle("CAP", fontName=F, fontSize=8.5, textColor=SUB, leading=12, spaceBefore=3)


def P(s, st=BODY):
    return Paragraph(s, st)


def _box(c, x, y, w, h, title, sub, fill, bd, tc, sc):
    c.setFillColor(fill); c.setStrokeColor(bd); c.setLineWidth(0.9)
    c.roundRect(x, y, w, h, 6, fill=1, stroke=1)
    c.setFillColor(tc); c.setFont(F, 8.6)
    c.drawCentredString(x + w / 2, y + (h - 13 if sub else h / 2 - 3), title)
    if sub:
        c.setFillColor(sc); c.setFont(F, 7.1)
        c.drawCentredString(x + w / 2, y + 6, sub)


def _arrow(c, x1, y1, x2, y2, label=None, col=SUB, dash=False, ltc=AMBT, lx=8):
    c.setStrokeColor(col); c.setLineWidth(1.1)
    if dash:
        c.setDash(2, 2)
    c.line(x1, y1, x2, y2); c.setDash()
    c.setFillColor(col)
    dx, dy = x2 - x1, y2 - y1
    import math
    L = math.hypot(dx, dy) or 1
    ux, uy = dx / L, dy / L
    px, py = -uy, ux
    c.lines([(x2, y2, x2 - 6 * ux + 3 * px, y2 - 6 * uy + 3 * py),
             (x2, y2, x2 - 6 * ux - 3 * px, y2 - 6 * uy - 3 * py)])
    if label:
        c.setFillColor(ltc); c.setFont(F, 7.3)
        c.drawString(min(x1, x2) + lx, (y1 + y2) / 2 - 2, label)


class DuelEscape(Flowable):
    """'둘 다 별로' 탈출 메커니즘. 듀얼 → 하나 고르기(우승) / 둘 다 별로(거절 → 남은 좋아요로 분기)."""
    def __init__(self, w=500, h=300):
        super().__init__(); self.w, self.h = w, h

    def wrap(self, *a):
        return self.w, self.h

    def draw(self):
        c = self.canv
        _box(c, 150, 262, 200, 32, "결승 듀얼 (엔진 top-2)", "A vs B", BLUE, BLUE, white, white)
        # 왼쪽: 하나 고르기 → 우승 (종료)
        _arrow(c, 200, 262, 110, 232, "하나 고르기", col=GRNB, ltc=GRNT, lx=-70)
        _box(c, 20, 202, 175, 30, "우승 확정", "CHOOSE(A>B) → WINNER", GRNF, GRNB, GRNT, GRNT)
        # 오른쪽: 둘 다 별로 → 거절
        _arrow(c, 300, 262, 402, 232, "둘 다 별로", col=RED, ltc=RED, lx=6)
        _box(c, 315, 202, 175, 30, "A·B 거절", "SWIPE NOPE (FINAL) ×2", AMBF, AMBB, AMBT, AMBT)
        _arrow(c, 402, 202, 402, 192)
        _box(c, 300, 160, 190, 30, "남은 좋아요 후보 수?", None, BOXF, BOXB, INK, SUB)
        # 분기 3개 (택1)
        _box(c, 300, 116, 190, 28, "2개+  →  다음 쌍으로 새 듀얼", None, CRLF, CRLB, CRLT, CRLT)
        _box(c, 300, 80, 190, 28, "1개  →  그 하나 자동 우승", None, GRNF, GRNB, GRNT, GRNT)
        _box(c, 300, 44, 190, 28, "0개  →  새 추천(reroll)·재스와이프", None, GRAYF, BOXB, INK, SUB)
        # 분기 → 3 박스: 좌측 스파인 + 틱
        c.setStrokeColor(SUB); c.setLineWidth(0.9)
        c.line(300, 175, 292, 175); c.line(292, 175, 292, 58)
        for oy in (130, 94, 58):
            c.line(292, oy, 300, oy)
            c.setFillColor(SUB)
            c.lines([(300, oy, 296, oy + 2), (300, oy, 296, oy - 2)])
        c.setFillColor(SUB); c.setFont(F, 7)
        c.drawString(258, 168, "택 1")
        # 반복 루프: 다음 쌍 듀얼 → 듀얼 (점선, 좌측 게터)
        c.setStrokeColor(CRLB); c.setLineWidth(1.1); c.setDash(3, 2)
        c.line(300, 130, 270, 130); c.line(270, 130, 270, 305); c.line(270, 305, 250, 305)
        c.setDash()
        c.setFillColor(CRLB)
        c.lines([(250, 305, 256, 308), (250, 305, 256, 302)])  # arrowhead into duel top-left
        c.setFillColor(CRLT); c.setFont(F, 7.2)
        c.drawString(214, 200, "반복")


class Reentry(Flowable):
    """재진입 = 평소 스와이프 플로우. 홈 제안 탭 → 설정(intent) → 예선 스와이프 → 듀얼 → 우승 → 씨앗."""
    def __init__(self, w=500, h=312):
        super().__init__(); self.w, self.h = w, h

    def wrap(self, *a):
        return self.w, self.h

    def draw(self):
        c = self.canv; cx = 250
        _box(c, cx - 130, 278, 260, 30, "홈 '오늘의 여정' — [다음은 커피? →]", None, BOXF, BOXB, INK, SUB)
        _arrow(c, cx, 278, cx, 266, "탭", lx=6)
        _box(c, cx - 130, 232, 260, 30, "Lunchie 설정 (intent=카페)", "후보를 카페로 필터  *현재는 시간 기본값", CRLF, CRLB, CRLT, CRLT)
        _arrow(c, cx, 232, cx, 220)
        # 스와이프 플로우 묶음 (평소와 동일)
        c.setStrokeColor(CRLB); c.setLineWidth(1); c.setDash(4, 3)
        c.roundRect(40, 70, 420, 142, 10, fill=0, stroke=1); c.setDash()
        c.setFillColor(CRLT); c.setFont(F, 8)
        c.drawString(52, 198, "↓  평소와 '동일한' 스와이프 플로우")
        _box(c, cx - 130, 158, 260, 30, "예선 스와이프 (카페 7장)", "IMPRESSION×7 · SWIPE LIKE/NOPE", BOXF, BOXB, INK, SUB)
        _arrow(c, cx, 158, cx, 146)
        _box(c, cx - 130, 116, 260, 30, "결승 듀얼 (A vs B)", "하나 고르기 / 둘 다 별로 = 그림 1", BLUE, BLUE, white, white)
        _arrow(c, cx, 116, cx, 104)
        _box(c, cx - 130, 76, 260, 28, "우승 확정 (WINNER)", None, GRNF, GRNB, GRNT, GRNT)
        _arrow(c, cx, 76, cx, 64)
        _box(c, cx - 130, 32, 260, 30, "우승화면 씨앗 → 홈 '오늘의 여정'", "다음 인텐트 인지 (사슬 계속)", AMBF, AMBB, AMBT, AMBT)
        # 루프 점선: 씨앗 → 홈(맨 위)
        c.setStrokeColor(AMBB); c.setLineWidth(1); c.setDash(3, 2)
        c.line(cx + 130, 46, 478, 46); c.line(478, 46, 478, 293); c.line(478, 293, cx + 130, 293)
        c.setDash(); c.setFillColor(AMBB)
        c.lines([(cx + 130, 293, cx + 136, 296), (cx + 130, 293, cx + 136, 290)])


class GroupDecision(Flowable):
    """그룹 결정 (하이브리드): 예선 → least-misery top-2 → 결승 3지선다 → 확정/reroll. C는 제안."""
    def __init__(self, w=500, h=322):
        super().__init__(); self.w, self.h = w, h

    def wrap(self, *a):
        return self.w, self.h

    def draw(self):
        c = self.canv; cx = 250
        _box(c, 150, 286, 200, 28, "예선 (각자 LIKE / DISLIKE)", None, BOXF, BOXB, INK, SUB)
        _arrow(c, cx, 286, cx, 266, "전원 / 호스트 / 마감", lx=6)
        _box(c, 130, 234, 240, 30, "least-misery top-2 후보", "싫어요 적은 순 → 좋아요 많은 순", BOXF, BOXB, INK, SUB)
        # 후보<2 → 1위 확정 (좌측 분기)
        _arrow(c, 150, 234, 90, 204, "후보<2", col=GRNB, ltc=GRNT, lx=-46)
        _box(c, 14, 174, 130, 28, "1위 확정 (결승 생략)", None, GRNF, GRNB, GRNT, GRNT)
        # 중앙 → 결승
        _arrow(c, cx, 234, cx, 202)
        _box(c, 100, 170, 300, 32, "결승 · A / B / 둘 다 별로", "1인 1표  ·  [C 제안·검토중]", AMBF, AMBB, AMBT, AMBT)
        # 결승 → 결과(표 다수) / reroll(둘 다 별로 최다)
        _arrow(c, 180, 170, 110, 130, "표 다수", col=GRNB, ltc=GRNT, lx=-48)
        _arrow(c, 320, 170, 388, 130, "'둘 다 별로' 최다", col=CRLB, ltc=CRLT, lx=4)
        _box(c, 20, 98, 200, 32, "표 많은 곳 우승", "동률 = 예선 상위(least-misery)", GRNF, GRNB, GRNT, GRNT)
        _box(c, 280, 98, 200, 32, "reroll: 다음 2곳으로 새 결승", "[C 제안] 소진 시 1위 폴백", CRLF, CRLB, CRLT, CRLT)
        # reroll 루프 → 후보 (점선)
        c.setStrokeColor(CRLB); c.setLineWidth(1); c.setDash(3, 2)
        c.line(480, 114, 490, 114); c.line(490, 114, 490, 249); c.line(490, 249, 370, 249)
        c.setDash(); c.setFillColor(CRLB)
        c.lines([(370, 249, 376, 252), (370, 249, 376, 246)])
        c.setFillColor(CRLT); c.setFont(F, 7.2); c.drawString(444, 180, "반복")


story = []
story += [P("결정 메커니즘 상세 — '둘 다 별로' · 재진입 · 그룹 결정", H1),
          P("내부 동작 다이어그램 · 2026-06-27", SUBT)]

story += [P("1. '둘 다 별로' 탈출구 — 어떻게 작동하나", H2),
          P("결승 듀얼에서 둘 다 마음에 안 들면, 같은 결승을 다시 하거나 예선으로 돌아가지 않는다. "
            "두 후보를 NOPE(FINAL)로 거절하고, <b>이미 좋아요한 나머지 후보 중 다음 두 개로 새 듀얼</b>을 띄운다.", BODY),
          Spacer(1, 2), DuelEscape(), Spacer(1, 2),
          P("[그림 1] 핵심: 항상 '앞으로'만 간다. 남은 좋아요가 2개+면 다음 쌍 듀얼(반복), 1개면 자동 우승, "
            "0개일 때만 새 추천(reroll)으로 재스와이프. 코드: client/src/pages/LunchieSwipePage.tsx handleRejectBoth.", CAP)]

story += [P("2. 재진입 '다음-스톱 제안' — 스와이프 맞다", H2),
          P("홈의 '다음은 커피?'는 결정을 대신 하지 않는다. <b>평소 Lunchie 스와이프 플로우로 들어가는 입구</b>일 뿐이다. "
            "탭하면 설정(인텐트)으로 가고, 그 다음은 예선 스와이프 → 결승 듀얼 → 우승으로 '평소와 똑같이' 흐른다. "
            "다른 건 '어디서 시작하느냐'(홈에서, 인텐트로 필터된 채)뿐이다.", BODY),
          Spacer(1, 2), Reentry(), Spacer(1, 2),
          P("[그림 2] 점선 박스 안(예선·듀얼·우승)이 기존과 100% 동일한 스와이프 플로우다. 그래서 '다음 결정'이라는 "
            "한 박스가 생소했던 것 — 그 안에 예선 스와이프가 들어 있었다. (*현재 후보 필터는 탭한 인텐트가 아니라 "
            "시간대 기본값을 쓴다 — 탭 인텐트 관통은 Phase 1.5 후속 배선.)", CAP)]

story += [P("3. 그룹 결정 (하이브리드) — least-misery로 좁히고 → 투표", H2),
          P("솔로는 개인 듀얼이지만, 그룹은 합의로 정한다. 목적함수는 <b>하이브리드</b>: least-misery로 "
            "'아무도 크게 싫어하지 않는' 안전한 top-2로 좁힌 뒤, 그 둘 중엔 다수결. 뷰어별 로컬 결승이 아니라 "
            "서버가 조율해 모두 같은 우승을 본다 (PRELIM → FINAL → DONE).", BODY),
          Spacer(1, 2), GroupDecision(), Spacer(1, 2),
          P("[그림 3] 핵심 누락이자 원래 문제의 답인 '둘 다 별로'는 <b>결승 3지선다(A / B / 둘 다 별로) + 다수결 reroll</b>로 "
            "푼다 — per-person이 아니라 그룹 다수결이라 수렴이 유지된다. 노랑·코랄의 [C 제안]은 아직 확정 전이며, "
            "확정되면 코드를 이 모델에 맞춘다. 상세: docs/superpowers/specs/2026-06-27-group-decision-model.md", CAP)]

out = os.path.join(os.path.dirname(__file__), "lunchie_decision_mechanics.pdf")
SimpleDocTemplate(out, pagesize=A4, topMargin=18 * mm, bottomMargin=16 * mm,
                  leftMargin=18 * mm, rightMargin=18 * mm,
                  title="결정 메커니즘 상세").build(story)
print("wrote", out)
