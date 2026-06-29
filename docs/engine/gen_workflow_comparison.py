# 유저 워크플로우 변경 보고서 — 한 끼 결정 → 하루 여정 (Before/After 상세 비교)
# ReportLab + HYGothic-Medium(한글 CID). 이모지 미사용(폰트 미지원).
# 각 단계를 [화면/행동 · 수집 이벤트 · 엔진 신호]로 펼치고, 신규/변경을 태그로 표시.
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
CRLF = HexColor("#FDEEE9"); CRLB = HexColor("#EB5053"); CRLT = HexColor("#B5282B")
REDF = HexColor("#FBE3E1")

ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Title"], fontName=F, fontSize=19, textColor=CORAL, spaceAfter=2, leading=23, alignment=TA_LEFT)
SUBT = ParagraphStyle("SUBT", fontName=F, fontSize=9.5, textColor=SUB, spaceAfter=12, leading=13)
H2 = ParagraphStyle("H2", fontName=F, fontSize=13.5, textColor=BLUE, spaceBefore=10, spaceAfter=5, leading=17)
BODY = ParagraphStyle("BODY", fontName=F, fontSize=9.5, textColor=INK, leading=15, spaceAfter=4, alignment=TA_LEFT)
BULLET = ParagraphStyle("BULLET", parent=BODY, leftIndent=10, spaceAfter=2)
CAP = ParagraphStyle("CAP", fontName=F, fontSize=8.5, textColor=SUB, leading=12, spaceBefore=3)
CELL = ParagraphStyle("CELL", fontName=F, fontSize=8.4, textColor=INK, leading=11.5)
HEAD = ParagraphStyle("HEAD", fontName=F, fontSize=8.6, textColor=white, leading=11)

KIND = {  # fill, border, title color, detail color
    "core": (BOXF, BOXB, INK, SUB),
    "new":  (CRLF, CRLB, CRLT, CRLT),
    "seed": (AMBF, AMBB, AMBT, AMBT),
    "end":  (GRAYF, BOXB, INK, SUB),
}
TAGCOL = {  # fill, border, text
    "new":  (CRLF, CRLB, CRLT),
    "seed": (AMBF, AMBB, AMBT),
    "lack": (REDF, RED, RED),
}


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


class DetailedFlow(Flowable):
    """단계별 상세 플로우. step = (kind, title, detail, tag, tagkind).
       kind: core|new|seed|end|gap|lane. gap=식사 단절, lane=세션 라벨."""
    BX, BW, CX = 18, 300, 168
    TAGX, TAGW = 330, 158

    def __init__(self, steps, w=500):
        super().__init__()
        self.steps = steps
        self.w = w
        # 높이 추정
        h = 8
        for s in steps:
            k = s[0]
            h += 18 if k == "lane" else 34 if k == "gap" else 46
        self.h = h

    def wrap(self, *a):
        return self.w, self.h

    def _box(self, c, top, title, detail, kind):
        fill, bd, tc, sc = KIND[kind]
        c.setFillColor(fill); c.setStrokeColor(bd); c.setLineWidth(0.9)
        c.roundRect(self.BX, top, self.BW, 34, 6, fill=1, stroke=1)
        c.setFillColor(tc); c.setFont(F, 8.8)
        c.drawCentredString(self.BX + self.BW / 2, top + (20 if detail else 12), title)
        if detail:
            c.setFillColor(sc); c.setFont(F, 7.0)
            c.drawCentredString(self.BX + self.BW / 2, top + 6, detail)

    def _tag(self, c, top, tag, tagkind):
        fill, bd, tc = TAGCOL[tagkind]
        c.setFillColor(fill); c.setStrokeColor(bd); c.setLineWidth(0.8)
        c.roundRect(self.TAGX, top + 9, self.TAGW, 17, 8, fill=1, stroke=1)
        c.setFillColor(tc); c.setFont(F, 7.4)
        c.drawCentredString(self.TAGX + self.TAGW / 2, top + 14, tag)

    def _arrow(self, c, y_from, y_to):
        c.setStrokeColor(SUB); c.setLineWidth(1.1)
        c.line(self.CX, y_from, self.CX, y_to)
        c.setFillColor(SUB)
        c.lines([(self.CX, y_to, self.CX - 3, y_to + 5), (self.CX, y_to, self.CX + 3, y_to + 5)])

    def draw(self):
        c = self.canv; H = self.h
        cur = H - 6
        prev_box_bottom = None
        for i, s in enumerate(self.steps):
            kind = s[0]
            if kind == "lane":
                c.setFillColor(s[1] if len(s) > 2 and s[2] else SUB)
                c.setFont(F, 8.5)
                c.drawString(self.BX, cur - 11, s[1] if isinstance(s[1], str) else s[1])
                cur -= 18
                prev_box_bottom = None
                continue
            if kind == "gap":
                c.setStrokeColor(LINE); c.setLineWidth(0.8); c.setDash(3, 3)
                c.line(self.BX, cur - 8, self.BX + 472, cur - 8); c.setDash()
                c.setFillColor(SUB); c.setFont(F, 7.8)
                c.drawCentredString(self.BX + 236, cur - 24, s[1])
                cur -= 34
                prev_box_bottom = None
                continue
            # box step
            if prev_box_bottom is not None:
                self._arrow(c, prev_box_bottom, prev_box_bottom - 12)
                cur = prev_box_bottom - 12
            top = cur - 34
            title, detail, tag, tagkind = s[1], s[2], s[3], s[4]
            self._box(c, top, title, detail, kind)
            if tag:
                self._tag(c, top, tag, tagkind)
            prev_box_bottom = top
            cur = top


before_steps = [
    ("core", "홈", "모드 선택", None, None),
    ("core", "Lunchie 설정", "필터만(거리·예산·동행)", "인텐트 없음", "lack"),
    ("core", "예선 7장 스와이프", "IMPRESSION×7 · SWIPE → 취향 θ(pointwise)", None, None),
    ("core", "결승 듀얼 A vs B", "SWIPE CHOOSE → 취향 pairwise(A>B)", None, None),
    ("core", "우승 확정", "WINNER → 취향·satiation·chain recordStop", None, None),
    ("end", "우승화면", "공유·저장·홈으로 — 다음 스톱 개념 없음", "출구 없음", "lack"),
    ("end", "앱 닫음 · 끝", "chain 학습 결과는 대시보드에만 노출", None, None),
]

after_steps = [
    ("lane", "세션 1 · 점심 (앱 켠 동안)"),
    ("core", "홈", "모드 선택", None, None),
    ("new", "Lunchie 설정", "+ intent 자동 추론(시간대→밥) → 카테고리 필터", "신규: intent", "new"),
    ("core", "예선 7장 스와이프", "IMPRESSION×7 · SWIPE → 취향 θ(pointwise)", None, None),
    ("core", "결승 듀얼 A vs B", "SWIPE CHOOSE → 취향 pairwise(+신뢰도 가중)", None, None),
    ("new", "우승 확정", "WINNER(+intent) → 취향·satiation·recordStop", "변경: intent 기록", "new"),
    ("seed", "우승화면 씨앗", "chainFit(직전)로 다음 인텐트 인지 · 결정 아님", "신규: 씨앗", "seed"),
    ("gap", "앱 닫음 → 가서 식사 (30~60분) → 이따 다시 켬"),
    ("lane", "세션 2 · 재진입 — '아 커피?'가 실제로 떨어지는 곳"),
    ("core", "앱 다시 켬 → 홈", "", None, None),
    ("new", "홈 '오늘의 여정'", "GET journey/today · 오늘 스톱=WINNER+SURVEY 뷰", "신규: 음식일기", "new"),
    ("new", "다음-스톱 제안", "prevStop+chainFit → intent → 후보 1곳", "신규: 제안", "new"),
    ("new", "탭 → 다음 결정", "그 intent로 결정 반복 (커피·디저트·저녁)", None, None),
    ("end", "6시간 경과", "prevStop=null → 사슬 자동 종료", None, None),
]


story = []
story += [P("런치 유저 워크플로우 변경 보고서", H1),
          P("한 끼 단발 결정 → 하루 여정 (Before/After 상세 비교 · 왜·문제·해결·효과) · 2026-06-27", SUBT)]

story += [P("0. 요약", H2),
          P("Lunchie의 결정 플로우를 '한 끼 단발 결정'에서 '하루 여정'으로 바꿨다. 예선·결승·우승까지의 핵심은 "
            "그대로 두고(같은 이벤트·같은 학습), 그 앞뒤에 ① 결정 전 intent(밥/카페/디저트) 캡처, "
            "② 우승 직후 '씨앗'(다음 스톱 인지), ③ 식사 후 재진입 시 홈 '오늘의 여정'에서의 실제 다음 결정을 "
            "더했다. 아래 두 다이어그램은 각 단계 안에서 무엇이 일어나는지(화면·행동 / 수집 이벤트 / 엔진 신호)와 "
            "어디가 신규·변경인지(태그)를 함께 보여준다.", BODY)]

story += [P("1. 기존 워크플로우 (Before) — 단계 상세", H2),
          P("각 박스 = 화면/행동, 아랫줄 = 수집 이벤트 → 엔진 신호. 빨강 태그 = 그래서 빠져 있던 것.", CAP),
          Spacer(1, 4), DetailedFlow(before_steps), Spacer(1, 2),
          P("[그림 1] 예선~우승까지 이벤트(IMPRESSION·SWIPE·WINNER)와 학습(취향·satiation·chain)은 다 일어나지만, "
            "intent를 안 받고, 우승 이후 출구가 없어 chain 학습이 사용자에게 닿지 않는다.", CAP)]

story += [P("2. 무엇이 문제였나", H2),
          P("• <b>결정이 한 끼에서 끊긴다</b> — 실제 점심 행동은 '밥 → 커피 → 디저트 → 저녁'으로 이어지는데, 우승 이후가 앱 밖이다.", BULLET),
          P("• <b>엔진과 UX의 단절</b> — chain 엔진이 occasion(6시간) 안의 전이 P(다음|직전)를 이미 학습하지만, 결과를 쓰는 화면이 대시보드뿐이었다.", BULLET),
          P("• <b>인텐트 부재</b> — 밥/카페/디저트를 묻지 않아 비식사 후보(공원·복합문화공간)가 점심 스와이프에 섞일 수 있었다.", BULLET),
          P("• <b>회상 수단 없음 · 초기 오설계</b> — '뭐먹었더라' 기록이 없고, 우승 직후 다음을 강제 결정시키려던 발상은 실제 행동(다 먹고 다시 켬)과 어긋난다.", BULLET)]

story += [PageBreak(), P("3. 변경된 워크플로우 (After) — 단계 상세", H2),
          P("회색=기존과 동일, 코랄=신규/변경, 황색=씨앗. 오른쪽 태그가 '무엇이 달라졌는지'를 가리킨다.", CAP),
          Spacer(1, 4), DetailedFlow(after_steps), Spacer(1, 2),
          P("[그림 2] 핵심 코어(예선·결승·우승)는 동일. 추가된 것은 설정의 intent, 우승의 intent 기록, 우승화면 씨앗, "
            "그리고 세션 2 전체(재진입 → 오늘의 여정 → 다음-스톱 제안 → 반복 → 6h 종료)다.", CAP)]

story += [P("4. 어떻게 해결했나 (단계 ↔ 변경)", H2),
          tbl([
              ["단계", "기존", "변경 / 해결"],
              ["설정", "필터만, 인텐트 없음", "intent(밥/카페/디저트) 자동 추론 + 카테고리 필터"],
              ["우승", "WINNER 학습만", "WINNER에 intent 기록 → 스톱이 자기 인텐트를 앎"],
              ["우승화면", "공유·저장·끝", "씨앗 — chainFit로 다음 인텐트 인지(결정 아님)"],
              ["식사 후", "앱 밖 · 단절", "재진입 시 홈 '오늘의 여정'에서 실제 다음 결정(pull)"],
              ["기록", "없음", "음식일기 = WINNER(+SURVEY 만족) 위의 타임라인 뷰"],
              ["다음 추천", "없음", "prevStop+chainFit → intent → 후보 (엔진 표면화)"],
          ], [70, 150, 265]),
          Spacer(1, 3),
          P("재사용: chain(recordStop/chainFit/prevStop)·SURVEY·recommend 슬레이트. 신규: intent 필드 + 표면 UI 2곳. "
            "검증 중 'DB가 살아 있으면 이벤트가 인메모리 대신 DB에 쌓여 오늘 스톱 조회가 비는' 문제를 발견해 DB 우선·메모리 폴백으로 고쳤다.", BODY)]

story += [P("5. 어떤 효과가 있나", H2),
          tbl([
              ["관점", "효과"],
              ["사용자", "결정 피로↓ · 여정 연속성(밥→커피→디저트) · '뭐먹었더라' 회상 · 저마찰(강요 없는 pull)"],
              ["엔진 / 데이터", "다음-스톱 제안의 노출·선택·스킵이 chain 학습 신호로 축적 → Phase 1만으로 엔진 개선 · intent로 추천 정확도↑"],
              ["제품", "'한 끼 결정 앱' → '하루 식사 동반자' · 재진입(리텐션) 유도 · Munchie 코스와의 연결고리"],
          ], [80, 405]),
          Spacer(1, 4),
          P("핵심: 새 기능을 많이 더한 게 아니라, 이미 학습 중이던 엔진에 '출구'를 내고 실제 행동(다 먹고 다시 켬)에 흐름을 맞춘 변경이다. "
            "비용은 작고(UI 2곳 + 필드 1개), 데이터·리텐션 효과는 누적된다.", BODY),
          P("관련 문서: 결정 플로우 v2(lunchie_decision_flow.pdf) · 하루 여정 Phase 1 플로우(lunchie_journey_flow.pdf) · "
            "설계 스펙·구현 계획(docs/superpowers).", CAP)]

out = os.path.join(os.path.dirname(__file__), "lunchie_workflow_comparison.pdf")
SimpleDocTemplate(out, pagesize=A4, topMargin=18 * mm, bottomMargin=16 * mm,
                  leftMargin=18 * mm, rightMargin=18 * mm,
                  title="런치 유저 워크플로우 변경 보고서").build(story)
print("wrote", out)
