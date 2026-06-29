# 유저 워크플로우 변경 보고서 — 한 끼 결정 → 하루 여정 (Before/After 비교)
# ReportLab + HYGothic-Medium(한글 CID). 이모지 미사용(폰트 미지원).
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
SUB = HexColor("#6E6E6E"); LINE = HexColor("#D8D2CB"); RED = HexColor("#C2362F")
BOXF = HexColor("#FFFFFF"); BOXB = HexColor("#D3D1C7"); GRAYF = HexColor("#F1EFE8")
AMBF = HexColor("#FAEEDA"); AMBB = HexColor("#EF9F27"); AMBT = HexColor("#8A5A0B")
CRLB = HexColor("#EB5053")

ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Title"], fontName=F, fontSize=19, textColor=CORAL, spaceAfter=2, leading=23, alignment=TA_LEFT)
SUBT = ParagraphStyle("SUBT", fontName=F, fontSize=9.5, textColor=SUB, spaceAfter=12, leading=13)
H2 = ParagraphStyle("H2", fontName=F, fontSize=13.5, textColor=BLUE, spaceBefore=12, spaceAfter=5, leading=17)
BODY = ParagraphStyle("BODY", fontName=F, fontSize=9.5, textColor=INK, leading=15, spaceAfter=4, alignment=TA_LEFT)
BULLET = ParagraphStyle("BULLET", parent=BODY, leftIndent=10, spaceAfter=2)
CAP = ParagraphStyle("CAP", fontName=F, fontSize=8.5, textColor=SUB, leading=12, spaceBefore=3)
CELL = ParagraphStyle("CELL", fontName=F, fontSize=8.4, textColor=INK, leading=11.5)
HEAD = ParagraphStyle("HEAD", fontName=F, fontSize=8.6, textColor=white, leading=11)


def P(s, st=BODY):
    return Paragraph(s, st)


def tbl(data, colw):
    rows = [[Paragraph(str(c), HEAD if ri == 0 else CELL) for c in row] for ri, row in enumerate(data)]
    t = Table(rows, colWidths=colw)
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("BACKGROUND", (0, 1), (0, -1), HexColor("#F7F5F0")),
    ]))
    return t


def _box(c, x, y, w, h, title, sub, fill, bd, tc, sc):
    c.setFillColor(fill); c.setStrokeColor(bd); c.setLineWidth(0.9)
    c.roundRect(x, y, w, h, 6, fill=1, stroke=1)
    c.setFillColor(tc); c.setFont(F, 8.8)
    c.drawCentredString(x + w / 2, y + h - 13 if sub else y + h / 2 - 3, title)
    if sub:
        c.setFillColor(sc); c.setFont(F, 7.4)
        c.drawCentredString(x + w / 2, y + 6, sub)


def _arrow(c, x1, y1, x2, y2, label=None, col=SUB, dash=False, ltc=AMBT):
    c.setStrokeColor(col); c.setLineWidth(1.1)
    if dash:
        c.setDash(2, 2)
    c.line(x1, y1, x2, y2); c.setDash()
    c.setFillColor(col)
    if y2 < y1:
        c.lines([(x2, y2, x2 - 3, y2 + 5), (x2, y2, x2 + 3, y2 + 5)])
    elif y2 > y1:
        c.lines([(x2, y2, x2 - 3, y2 - 5), (x2, y2, x2 + 3, y2 - 5)])
    if label:
        c.setFillColor(ltc); c.setFont(F, 7.4)
        c.drawString(min(x1, x2) + 8, (y1 + y2) / 2 - 2, label)


class BeforeFlow(Flowable):
    """기존 — 한 끼 단발 결정. 우승에서 끝, 다음 스톱 없음."""
    def __init__(self, w=520, h=292):
        super().__init__(); self.w, self.h = w, h

    def wrap(self, *a):
        return self.w, self.h

    def draw(self):
        c = self.canv; W, H = self.w, self.h; cx = W / 2
        c.setFillColor(SUB); c.setFont(F, 8.5)
        c.drawString(16, H - 12, "기존 — 한 끼 단발 결정")
        _box(c, cx - 120, H - 50, 240, 28, "홈", None, BOXF, BOXB, INK, SUB)
        _arrow(c, cx, H - 50, cx, H - 62)
        _box(c, cx - 120, H - 92, 240, 28, "Lunchie 설정 (인텐트 안 물음)", None, BOXF, BOXB, INK, SUB)
        _arrow(c, cx, H - 92, cx, H - 104)
        _box(c, cx - 120, H - 134, 240, 28, "예선 7장 → 결승 듀얼", None, BOXF, BOXB, INK, SUB)
        _arrow(c, cx, H - 134, cx, H - 146)
        _box(c, cx - 120, H - 176, 240, 28, "우승 — 한 끼 결정", None, CORAL, CRLB, white, white)
        _arrow(c, cx, H - 176, cx, H - 200, "여기서 끝", col=RED, dash=True, ltc=RED)
        _box(c, cx - 150, H - 230, 300, 28, "앱 닫음 — 여정 단절", None, GRAYF, BOXB, INK, SUB)
        c.setFillColor(RED); c.setFont(F, 7.6)
        c.drawCentredString(cx, H - 250, "커피·디저트·저녁은 앱 밖에서. chain 엔진은 학습만 하고 출구가 없음(대시보드에만).")


class AfterFlow(Flowable):
    """변경 — 하루 여정. 우승=씨앗, 홈 재진입=실제 다음 결정, 6h 자연 종료."""
    def __init__(self, w=520, h=300):
        super().__init__(); self.w, self.h = w, h

    def wrap(self, *a):
        return self.w, self.h

    def draw(self):
        c = self.canv; W, H = self.w, self.h; cx = W / 2
        c.setFillColor(SUB); c.setFont(F, 8.5)
        c.drawString(16, H - 12, "변경 — 하루 여정 (앱을 닫았다 다시 켜는 흐름)")
        _box(c, cx - 120, H - 50, 240, 28, "세션 1 · 점심 결정 → 우승", None, CORAL, CRLB, white, white)
        _box(c, cx - 170, H - 86, 340, 24, "씨앗 — 다음 스톱 '인지'만 (결정 안 함 · '끝' 버튼 없음)", None, AMBF, AMBB, AMBT, AMBT)
        c.setStrokeColor(LINE); c.setLineWidth(0.8); c.setDash(3, 3)
        c.line(16, H - 108, W - 16, H - 108); c.setDash()
        c.setFillColor(SUB); c.setFont(F, 8)
        c.drawCentredString(cx, H - 122, "앱 닫음 → 가서 식사 (30~60분) → 이따 다시 켬")
        c.setFillColor(CORAL); c.setFont(F, 8.5)
        c.drawString(16, H - 140, "세션 2 · 재진입 — '아 커피?'가 실제로 떨어지는 곳")
        _box(c, cx - 120, H - 176, 240, 28, "홈 '오늘의 여정'", None, BOXF, BOXB, INK, SUB)
        _arrow(c, cx, H - 176, cx, H - 188)
        _box(c, cx - 150, H - 218, 300, 28, "다음은 커피? — 실제 결정", None, CORAL, CRLB, white, white)
        _arrow(c, cx, H - 218, cx, H - 230)
        _box(c, cx - 150, H - 260, 300, 28, "반복 → 6시간 후 사슬 자동 종료", None, GRAYF, BOXB, INK, SUB)


story = []
story += [P("런치 유저 워크플로우 변경 보고서", H1),
          P("한 끼 단발 결정 → 하루 여정 (Before/After 비교 · 왜·문제·해결·효과) · 2026-06-27", SUBT)]

story += [P("0. 요약", H2),
          P("Lunchie의 결정 플로우를 '한 끼 단발 결정'에서 '하루 여정'으로 바꿨다. 기존 흐름은 우승(한 끼 결정)에서 "
            "끝나, 식사 후 이어지는 실제 행동(커피·디저트·저녁·야식)과 '내가 뭐먹었더라'를 담지 못했다. "
            "이미 식사 시퀀스를 학습하던 chain 엔진은 대시보드에만 노출돼 사용자에게 출구가 없었다. "
            "변경 후에는 우승화면이 다음 스톱을 '씨앗'으로 인지시키고, 사용자가 식사 후 앱을 다시 켰을 때 "
            "홈 '오늘의 여정'에서 실제 다음 결정을 잇는다. 사슬은 6시간 윈도우로 자연 종료된다.", BODY)]

story += [P("1. 기존 워크플로우 (Before)", H2),
          Spacer(1, 2), BeforeFlow(), Spacer(1, 2),
          P("[그림 1] 기존: 홈 → 설정 → 예선 → 결승 → 우승에서 단절. 다음 스톱·회상·인텐트 개념이 없다.", CAP)]

story += [P("2. 무엇이 문제였나", H2),
          P("• <b>결정이 한 끼에서 끊긴다</b> — 실제 점심 행동은 '밥 → 커피 → 디저트 → 저녁'으로 이어지는데, 우승 이후가 앱 밖이다.", BULLET),
          P("• <b>엔진과 UX의 단절</b> — chain 엔진이 occasion(6시간) 안의 카테고리 전이 P(다음|직전)를 이미 학습하지만, 그 결과를 쓰는 화면이 대시보드뿐이었다.", BULLET),
          P("• <b>인텐트 부재</b> — 밥/카페/디저트/놀거리를 묻지 않아, 공원·복합문화공간 같은 비식사 후보가 점심 스와이프에 섞일 수 있었다.", BULLET),
          P("• <b>회상 수단 없음</b> — '내가 오늘(또는 그때) 뭐먹었더라'를 확인할 기록 화면이 없었다.", BULLET),
          P("• <b>초기 오설계</b> — 우승 직후 다음을 바로 결정시키려는 발상은 실제 행동(다 먹고 나서 다시 켬)과 맞지 않아 마찰을 키운다.", BULLET)]

story += [PageBreak(), P("3. 변경된 워크플로우 (After)", H2),
          Spacer(1, 2), AfterFlow(), Spacer(1, 2),
          P("[그림 2] 변경: 우승화면은 '씨앗'(인지)만, 실제 다음 결정은 재진입 시 홈 '오늘의 여정'에서. 6시간 윈도우로 자연 종료.", CAP)]

story += [P("4. 어떻게 해결했나", H2),
          tbl([
              ["기존 문제", "변경 / 해결"],
              ["결정이 한 끼에서 끊김", "홈 '오늘의 여정' 재진입 + 다음-스톱 제안으로 사슬을 잇는다"],
              ["chain 엔진이 UX에 없음 (대시보드만)", "우승화면 씨앗 + 홈 다음-스톱 제안으로 엔진을 표면화 (prevStop·chainFit 재사용)"],
              ["인텐트를 안 물음 → 비식사 후보 혼입", "intent(밥/카페/디저트) 필드 + 카테고리 필터를 recommend에 추가"],
              ["'뭐먹었더라' 회상 불가", "음식일기 = WINNER(+SURVEY 만족) 위의 뷰를 홈 타임라인으로"],
              ["우승 직후 강제 다음결정(초기 오설계)", "씨앗(인지)만 남기고, 실제 결정은 사용자가 다시 켤 때로 미룸 (pull, 알림 없음)"],
          ], [165, 320]),
          Spacer(1, 4),
          P("구현 메모: chain 엔진(recordStop/chainFit/prevStop)·SURVEY·recommend 슬레이트는 재사용했고, 신규는 "
            "intent 필드와 표면 UI 2곳뿐이다. 검증 중 'DB가 살아 있으면 이벤트가 인메모리 버퍼 대신 DB에 쌓여 "
            "오늘의 스톱 조회가 비는' 문제를 발견해, 조회를 DB 우선·메모리 폴백 이중 경로로 고쳤다.", BODY)]

story += [P("5. 어떤 효과가 있나", H2),
          tbl([
              ["관점", "효과"],
              ["사용자", "결정 피로↓ · 여정 연속성(밥→커피→디저트) · '뭐먹었더라' 회상 · 저마찰(강요 없는 pull)"],
              ["엔진 / 데이터", "다음-스톱 제안의 노출·선택·스킵이 chain 학습 신호로 축적 → Phase 1만으로 엔진 개선 · intent로 추천 정확도↑"],
              ["제품", "'한 끼 결정 앱' → '하루 식사 동반자' · 재진입(리텐션) 자연 유도 · Munchie 코스와의 연결고리 확보"],
          ], [80, 405]),
          Spacer(1, 4),
          P("핵심: 새 기능을 많이 더한 게 아니라, 이미 학습 중이던 엔진에 '출구'를 내고 실제 사용자 행동(다 먹고 다시 켬)에 "
            "흐름을 맞춘 변경이다. 비용은 작고(UI 2곳 + 필드 1개), 데이터·리텐션 효과는 누적된다.", BODY)]

story += [P("6. 구현 상태 & 다음 단계", H2),
          P("• <b>Phase 1 (완료·검증)</b> — intent 필드+필터 · 우승화면 씨앗 · 홈 '오늘의 여정' 타임라인+다음-스톱 제안. (타입체크·단위 테스트·빌드·브라우저 확인)", BULLET),
          P("• <b>Phase 2</b> — 전용 '여정' 탭: 음식일기(여러 날) · 오늘을 코스로 저장/공유(Munchie Course 재사용).", BULLET),
          P("• <b>Phase 3</b> — 놀거리 일급 인텐트 · 그룹 사슬(회식 1차→2차) 분리 학습 · (선택) 재방문 알림.", BULLET),
          Spacer(1, 4),
          P("관련 문서: 결정 플로우 v2(lunchie_decision_flow.pdf) · 하루 여정 Phase 1 플로우(lunchie_journey_flow.pdf) · "
            "설계 스펙(docs/superpowers/specs) · 구현 계획(docs/superpowers/plans).", CAP)]

out = os.path.join(os.path.dirname(__file__), "lunchie_workflow_comparison.pdf")
SimpleDocTemplate(out, pagesize=A4, topMargin=18 * mm, bottomMargin=16 * mm,
                  leftMargin=18 * mm, rightMargin=18 * mm,
                  title="런치 유저 워크플로우 변경 보고서").build(story)
print("wrote", out)
