# 하루 여정 모드 — Phase 1 유저 플로우 & 시스템 워크플로우 PDF
# ReportLab + HYGothic-Medium(한글 CID). 이모지는 폰트 미지원이라 텍스트만 사용.
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
CRLF = HexColor("#FDEEE9"); CRLB = HexColor("#EB5053"); CRLT = HexColor("#C12B2E")

ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Title"], fontName=F, fontSize=20, textColor=CORAL, spaceAfter=2, leading=24)
SUBT = ParagraphStyle("SUBT", fontName=F, fontSize=9.5, textColor=SUB, spaceAfter=12, leading=13)
H2 = ParagraphStyle("H2", fontName=F, fontSize=13.5, textColor=BLUE, spaceBefore=12, spaceAfter=5, leading=17)
BODY = ParagraphStyle("BODY", fontName=F, fontSize=9.5, textColor=INK, leading=15, spaceAfter=4, alignment=TA_LEFT)
BULLET = ParagraphStyle("BULLET", parent=BODY, leftIndent=10, spaceAfter=2)
CAP = ParagraphStyle("CAP", fontName=F, fontSize=8.5, textColor=SUB, leading=12, spaceBefore=3)
CELL = ParagraphStyle("CELL", fontName=F, fontSize=8.2, textColor=INK, leading=11)
HEAD = ParagraphStyle("HEAD", fontName=F, fontSize=8.4, textColor=white, leading=11)


def P(s, st=BODY):
    return Paragraph(s, st)


def tbl(data, colw):
    rows = [[Paragraph(str(c), HEAD if ri == 0 else CELL) for c in row] for ri, row in enumerate(data)]
    t = Table(rows, colWidths=colw)
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, 0), (-1, 0), BLUE)]))
    return t


def _box(c, x, y, w, h, title, sub, fill, bd, tc, sc):
    c.setFillColor(fill); c.setStrokeColor(bd); c.setLineWidth(0.9)
    c.roundRect(x, y, w, h, 6, fill=1, stroke=1)
    c.setFillColor(tc); c.setFont(F, 8.8)
    c.drawCentredString(x + w / 2, y + h - 13 if sub else y + h / 2 - 3, title)
    if sub:
        c.setFillColor(sc); c.setFont(F, 7.4)
        c.drawCentredString(x + w / 2, y + 6, sub)


def _arrow(c, x1, y1, x2, y2, label=None, col=SUB, dash=False):
    c.setStrokeColor(col); c.setLineWidth(1.1)
    if dash:
        c.setDash(2, 2)
    c.line(x1, y1, x2, y2)
    c.setDash()
    c.setFillColor(col)
    if y2 < y1:
        c.lines([(x2, y2, x2 - 3, y2 + 5), (x2, y2, x2 + 3, y2 + 5)])
    elif y2 > y1:
        c.lines([(x2, y2, x2 - 3, y2 - 5), (x2, y2, x2 + 3, y2 - 5)])
    elif x2 > x1:
        c.lines([(x2, y2, x2 - 5, y2 - 3), (x2, y2, x2 - 5, y2 + 3)])
    else:
        c.lines([(x2, y2, x2 + 5, y2 - 3), (x2, y2, x2 + 5, y2 + 3)])
    if label:
        c.setFillColor(AMBT); c.setFont(F, 7.2)
        c.drawString(min(x1, x2) + 7, (y1 + y2) / 2 - 2, label)


class UserFlow(Flowable):
    """세로 유저 플로우 — 세션1(점심) → 앱닫음/식사 → 세션2(재진입) → 6h 종료."""
    def __init__(self, w=520, h=360):
        super().__init__(); self.w, self.h = w, h

    def wrap(self, *a):
        return self.w, self.h

    def draw(self):
        c = self.canv; W, H = self.w, self.h; cx = W / 2
        # 세션 1
        c.setFillColor(SUB); c.setFont(F, 8.5)
        c.drawString(16, H - 12, "세션 1 · 점심 (앱 켠 동안)")
        _box(c, cx - 130, H - 76, 260, 30, "점심 결정", "설정 → 예선 → 결승", BOXF, BOXB, INK, SUB)
        _arrow(c, cx, H - 76, cx, H - 88)
        _box(c, cx - 130, H - 122, 260, 30, "우래옥 — 점심 결정 완료", None, CORAL, CRLB, white, white)
        _box(c, cx - 175, H - 158, 350, 26, "씨앗 — 우승화면은 '다음 스톱 인지'만 (결정 안 함 · '끝' 버튼 없음)", None, AMBF, AMBB, AMBT, AMBT)
        # 갭(앱 닫음)
        c.setStrokeColor(LINE); c.setLineWidth(0.8); c.setDash(3, 3)
        c.line(16, H - 182, W - 16, H - 182); c.setDash()
        c.setFillColor(SUB); c.setFont(F, 8)
        c.drawCentredString(cx, H - 196, "앱 닫음  →  가서 식사 (30~60분)  →  이따 다시 켬")
        # 세션 2
        c.setFillColor(CORAL); c.setFont(F, 8.5)
        c.drawString(16, H - 214, "세션 2 · 재진입 — '아 커피?'가 실제로 떨어지는 곳")
        _box(c, cx - 130, H - 256, 260, 30, "앱 다시 켬 → 홈", None, BOXF, BOXB, INK, SUB)
        _arrow(c, cx, H - 256, cx, H - 268)
        _box(c, cx - 150, H - 302, 300, 30, "오늘의 여정", "다음은 커피? — 실제 결정", CORAL, CRLB, white, white)
        _arrow(c, cx, H - 302, cx, H - 314)
        _box(c, cx - 150, H - 348, 300, 30, "반복 (디저트 · 저녁)", "마지막 스톱 후 6시간 → 사슬 자동 종료", GRAYF, BOXB, INK, SUB)


class SysFlow(Flowable):
    """3층 워크플로우 — 데이터 → 엔진 → 표면. 재사용(회색) vs 신규(코랄)."""
    def __init__(self, w=520, h=240):
        super().__init__(); self.w, self.h = w, h

    def wrap(self, *a):
        return self.w, self.h

    def draw(self):
        c = self.canv; W, H = self.w, self.h
        cols = [(46, 132), (190, 132), (334, 132)]  # (x, w)
        cxs = [x + w / 2 for x, w in cols]
        y_data, y_eng, y_surf = 30, 100, 170
        bh = 34
        # tier labels
        c.setFillColor(SUB); c.setFont(F, 8.5)
        c.drawString(8, y_surf + 12, "표면")
        c.drawString(8, y_eng + 12, "엔진")
        c.drawString(8, y_data + 12, "데이터")
        # 표면 (신규)
        for (x, w), t in zip(cols, ["우승화면 씨앗", "홈 오늘의 여정", "다음-스톱 제안"]):
            _box(c, x, y_surf, w, bh, t, None, CORAL, CRLB, white, white)
        # 엔진 (재사용)
        for (x, w), t in zip(cols, ["chain 학습", "prevStop · chainFit", "다음-스톱 슬레이트"]):
            _box(c, x, y_eng, w, bh, t, None, GRAYF, BOXB, INK, SUB)
        # 데이터
        _box(c, *cols[0], y_data, bh, "WINNER · SURVEY", None, GRAYF, BOXB, INK, SUB) if False else None
        _box(c, cols[0][0], y_data, cols[0][1], bh, "WINNER · SURVEY", None, GRAYF, BOXB, INK, SUB)
        _box(c, cols[1][0], y_data, cols[1][1], bh, "intent 필드", None, CORAL, CRLB, white, white)
        _box(c, cols[2][0], y_data, cols[2][1], bh, "recommend 필터", None, CORAL, CRLB, white, white)
        # 상향 화살표 (학습 → 추천 공급)
        _arrow(c, cxs[0], y_data + bh, cxs[0], y_eng, "학습")
        _arrow(c, cxs[0], y_eng + bh, cxs[0], y_surf, "추천 공급")
        # 하향 로그 화살표(우측, 점선)
        rx = cols[2][0] + cols[2][1] + 18
        _arrow(c, rx, y_surf, rx, y_data + bh, None, col=SUB, dash=True)
        c.setFillColor(SUB); c.setFont(F, 7.2)
        c.saveState(); c.translate(rx + 9, (y_surf + y_data) / 2); c.rotate(90)
        c.drawCentredString(0, 0, "결정 로그"); c.restoreState()
        # 범례
        c.setFillColor(CORAL); c.roundRect(46, 4, 12, 10, 2, fill=1, stroke=0)
        c.setFillColor(INK); c.setFont(F, 7.6); c.drawString(63, 5, "신규 (UI 2곳 · intent 필드)")
        c.setFillColor(GRAYF); c.setStrokeColor(BOXB); c.roundRect(250, 4, 12, 10, 2, fill=1, stroke=1)
        c.setFillColor(INK); c.drawString(267, 5, "재사용 (chain 엔진 — 이미 있음)")


story = []
story += [P("하루 여정 모드 — Phase 1 유저 플로우 & 시스템 워크플로우", H1),
          P("우승화면 = '씨앗'(인지) · 홈 = '재진입·실제 결정' · 6시간 윈도우로 자연 종료 · Push 없음(pull) · 2026-06-26", SUBT)]

story += [P("개요", H2),
          P("Lunchie를 '한 끼 결정'에서 '하루 여정'으로 확장한다. 실제 행동은 점심을 정하고 가서 먹은 뒤, "
            "앱을 다시 켰을 때 비로소 '아 커피?'가 떠오르는 식으로 흐른다. 그래서 우승화면은 다음 스톱을 강요하지 않고 "
            "'이런 것도 있다'는 씨앗만 심고, 실제 다음 결정은 재진입 시 홈의 '오늘의 여정'에서 일어난다. "
            "사슬은 마지막 스톱 후 6시간이 지나면(occasion 윈도우) 자동으로 닫힌다.", BODY)]

story += [Spacer(1, 4), UserFlow(), Spacer(1, 2),
          P("[그림 1] 유저 플로우. 세션이 앱 닫힘(식사)으로 끊기고, 재진입에서 실제 다음 결정이 일어난다. "
            "'끝' 버튼은 없다 — 6시간 윈도우가 사슬을 자연 종료시킨다.", CAP)]

story += [PageBreak(), P("시스템 워크플로우", H2),
          P("같은 흐름을 데이터 → 엔진 → 표면 3층으로 본다. 핵심은 신규 코드가 적다는 것 — "
            "엔진(chain 사슬: recordStop/chainFit/prevStop/다음-스톱 슬레이트)은 이미 구현되어 지금은 대시보드에만 노출된다. "
            "Phase 1은 그 엔진을 표면 UI 2곳으로 끌어올리고, intent 한 필드를 추가할 뿐이다.", BODY),
          Spacer(1, 4), SysFlow(), Spacer(1, 2),
          P("[그림 2] 시스템 워크플로우. 코랄=신규(UI 2곳 + intent 필드), 회색=재사용(chain 엔진). "
            "데이터가 엔진을 학습시키고, 엔진이 표면에 다음-스톱을 공급하며, 결정은 다시 이벤트로 로그된다.", CAP)]

story += [P("Phase 범위", H2),
          tbl([
              ["Phase", "범위", "상태"],
              ["1 (MVP)", "intent 필드 · 우승화면 씨앗 · 홈 '오늘의 여정' 타임라인+다음-스톱 제안", "이번 스펙"],
              ["2", "전용 '여정' 탭 — 음식일기(여러 날) · 오늘을 코스로 저장/공유", "다음"],
              ["3", "놀거리 일급 인텐트 · 그룹 사슬 분리 학습 · (선택) 재방문 알림", "후순위"],
          ], [70, 320, 90])]

story += [P("재사용 vs 신규", H2),
          P("• 재사용 — chain.ts(recordStop/chainFit/prevStop), SURVEY(만족), recommend 슬레이트, Course 타입(Phase 2).", BULLET),
          P("• 신규(최소) — intent 필드 + 인텐트→카테고리군 필터, 우승화면 씨앗 UI, 홈 타임라인/다음-스톱 제안 UI.", BULLET),
          P("• 데이터 보너스 — 다음-스톱 제안의 노출/선택/스킵이 모두 chain 학습 신호 → Phase 1만으로 엔진이 좋아진다.", BULLET)]

out = os.path.join(os.path.dirname(__file__), "lunchie_journey_flow.pdf")
SimpleDocTemplate(out, pagesize=A4, topMargin=18 * mm, bottomMargin=16 * mm,
                  leftMargin=18 * mm, rightMargin=18 * mm,
                  title="하루 여정 모드 — Phase 1 플로우").build(story)
print("wrote", out)
