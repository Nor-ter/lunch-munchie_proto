# Lunchie x Munchie — AWS 마이그레이션 보고서 PDF
# ReportLab + HYGothic-Medium(한글 CID). 이모지 미사용(폰트 미지원), 화살표는 텍스트.
# 동반: aws_architecture_design.pdf (서버리스 우선 타깃 아키텍처)
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
ROW = HexColor("#FBF3F3")

ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Title"], fontName=F, fontSize=19, textColor=CORAL, spaceAfter=2, leading=23)
SUBT = ParagraphStyle("SUBT", fontName=F, fontSize=9.5, textColor=SUB, spaceAfter=10, leading=13)
H2 = ParagraphStyle("H2", fontName=F, fontSize=13.5, textColor=BLUE, spaceBefore=12, spaceAfter=5, leading=17)
H3 = ParagraphStyle("H3", fontName=F, fontSize=10.5, textColor=INK, spaceBefore=7, spaceAfter=2, leading=14)
BODY = ParagraphStyle("BODY", fontName=F, fontSize=9.5, textColor=INK, leading=14.5, spaceAfter=4, alignment=TA_LEFT)
BULLET = ParagraphStyle("BULLET", parent=BODY, leftIndent=10, spaceAfter=1.5)
CAP = ParagraphStyle("CAP", fontName=F, fontSize=8.5, textColor=SUB, leading=12, spaceBefore=3)
CELL = ParagraphStyle("CELL", fontName=F, fontSize=8.2, textColor=INK, leading=11)
CELLR = ParagraphStyle("CELLR", parent=CELL, alignment=2)
HEAD = ParagraphStyle("HEAD", fontName=F, fontSize=8.4, textColor=white, leading=11)


def P(s, st=BODY):
    return Paragraph(s, st)


def tbl(data, colw, align_last_right=False):
    rows = []
    for ri, row in enumerate(data):
        cells = []
        for ci, c in enumerate(row):
            if ri == 0:
                st = HEAD
            elif align_last_right and ci == len(row) - 1:
                st = CELLR
            else:
                st = CELL
            cells.append(Paragraph(str(c), st))
        rows.append(cells)
    t = Table(rows, colWidths=colw)
    style = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, ROW]),
    ]
    t.setStyle(TableStyle(style))
    return t


class Roadmap(Flowable):
    """이행 로드맵 — Phase 0..4 가로 타임라인 (위험도 표시)."""
    def __init__(self, w=520, h=120):
        super().__init__(); self.w, self.h = w, h

    def wrap(self, *a):
        return self.w, self.h

    def box(self, c, x, y, w, h, t1, t2, fill, bd, tc):
        c.setFillColor(fill); c.setStrokeColor(bd); c.setLineWidth(0.9)
        c.roundRect(x, y, w, h, 6, fill=1, stroke=1)
        c.setFillColor(tc); c.setFont(F, 9)
        c.drawCentredString(x + w / 2, y + h - 15, t1)
        c.setFont(F, 7.4)
        c.drawCentredString(x + w / 2, y + 7, t2)

    def draw(self):
        c = self.canv; H = self.h
        phases = [
            ("P0 기반", "IaC·예산알림", GRNF, GRNB, GRNT),
            ("P1 프론트", "S3·CDN·이미지", GRNF, GRNB, GRNT),
            ("P2 실시간", "WS·DynamoDB", AMBF, AMBB, AMBT),
            ("P3 API·DB", "Lambda·RDS", HexColor("#FBE3E3"), CORAL, HexColor("#B5292C")),
            ("P4 엔진", "이벤트·피처", AMBF, AMBB, AMBT),
        ]
        bw, gap = 88, 20
        y = H - 62
        for i, (t1, t2, f, b, tc) in enumerate(phases):
            x = i * (bw + gap)
            self.box(c, x, y, bw, 44, t1, t2, f, b, tc)
            if i < len(phases) - 1:
                ax = x + bw; ax2 = x + bw + gap
                c.setStrokeColor(SUB); c.setLineWidth(1.1)
                c.line(ax + 2, y + 22, ax2 - 2, y + 22)
                c.setFillColor(SUB)
                c.lines([(ax2 - 2, y + 22, ax2 - 7, y + 19), (ax2 - 2, y + 22, ax2 - 7, y + 25)])
        # 위험도 띠
        risks = ["위험 낮음", "낮음", "중", "높음(핵심)", "중"]
        c.setFont(F, 7)
        for i, r in enumerate(risks):
            x = i * (bw + gap)
            c.setFillColor(CORAL if "높음" in r else SUB)
            c.drawCentredString(x + bw / 2, y - 13, r)
        c.setFillColor(SUB); c.setFont(F, 7.4)
        c.drawString(0, y - 30, "권고 순서: 저위험·고가치(P0->P1->P2)를 먼저, 핵심 위험(P3 DB 이관)은 이중쓰기·리드섀도우로 컷오버.")


story = []
story += [P("Lunchie x Munchie — AWS 마이그레이션 보고서", H1),
          P("이행 단계 · 가이드라인 정리 · 예상 예산 산정 · 2026-06-27 · 동반: aws_architecture_design.pdf", SUBT)]

# ── 1. 개요 & 현행 진단
story += [P("1. 개요 & 현행 진단", H2),
          P("목적: 현행 프로토타입(Express + Drizzle + Supabase Postgres + Vite/React)을 AWS의 서버리스 우선 "
            "구성으로 단계 이행한다. 비용은 scale-to-zero로 최소화하되, 핵심 위험(상태 외부화·DB 이관)을 "
            "통제 가능한 순서로 옮긴다. 타깃 아키텍처 상세는 동반 설계서를 따른다.", BODY)]
story += [P("현행 스택 진단", H3),
         tbl([
             ["영역", "현행", "이행 시 핵심 고려"],
             ["프론트", "Vite/React 정적 빌드", "S3+CloudFront 이전 — 저위험, 먼저"],
             ["API", "Express(단일 프로세스)", "Lambda 이식 또는 컨테이너(App Runner) 택1"],
             ["실시간", "Express WebSocket(상주)", "API GW WebSocket+Lambda+DynamoDB로 무상태화"],
             ["DB", "Supabase Postgres", "RDS Postgres+PostGIS 이관(거리쿼리), 또는 초기 유지(하이브리드)"],
             ["추천 엔진", "인메모리(memEvents·취향·연쇄)", "상태 외부화 필수 — Lambda 무상태. 피처: DynamoDB/RDS"],
             ["세션/폴백", "인메모리(memSessions)", "DynamoDB(TTL)로 영속화 — 다중 인스턴스 안전"],
             ["시크릿", "DATABASE_URL(.env)", "Secrets Manager로 이전(깃 금지)"],
         ], [60, 175, 245])]
story += [P("주의: 현재 엔진·세션·이벤트가 단일 프로세스 메모리에 있다. Lambda는 무상태·다중 인스턴스이므로 "
            "이 상태를 DynamoDB/RDS/피처스토어로 외부화하지 않으면 데이터 유실·불일치가 발생한다. 이것이 "
            "마이그레이션의 가장 큰 설계 변경점이다.", CAP)]

story += [Spacer(1, 6), Roadmap(), Spacer(1, 2),
          P("[그림 1] 이행 로드맵. 저위험·고가치 단계(P0~P2)를 먼저, DB 이관(P3)은 이중쓰기/리드섀도우로 안전 컷오버.", CAP)]

# ── 2. 마이그레이션 전략
story += [PageBreak(), P("2. 마이그레이션 전략 (3안 비교)", H2),
         tbl([
             ["전략", "리워크", "월 비용(저트래픽)", "확장성", "적합 시점"],
             ["하이브리드 — 프론트·이미지·실시간만 AWS, DB는 Supabase 유지", "낮음", "$3~10", "중", "시작(권고)"],
             ["Lift-and-shift — Express 컨테이너 → App Runner/ECS + RDS", "낮음(도커화)", "$20~60(상시)", "중", "빠른 이전"],
             ["서버리스 우선 — Lambda+API GW+DynamoDB+RDS", "높음(이식)", "$5~35(scale-to-zero)", "높음", "목표(권고)"],
         ], [188, 70, 95, 50, 70])]
story += [P("권고: 하이브리드로 시작(비용 거의 0·리스크 낮음) → 트래픽/요구가 늘면 서버리스 우선을 목표로 단계 전환. "
            "팀 역량/일정이 빠른 이전을 요구하면 Lift-and-shift(App Runner)를 중간 다리로 둘 수 있다.", BODY)]

# ── 3. 이행 단계
story += [P("3. 이행 단계 (단계별 작업·검증·롤백)", H2)]
story += [P("Phase 0 — 기반 (1주, 위험 낮음)", H3),
          P("• 계정/조직, IAM Identity Center(SSO), 비용 배분 태깅 정책, 리전 1개(ap-northeast-2).", BULLET),
          P("• IaC: AWS CDK(TypeScript — 기존 스택과 동일 언어, 권고) 또는 Terraform. 생성·삭제 일원화로 orphan 방지.", BULLET),
          P("• CI/CD: GitHub Actions + OIDC로 AWS 배포(장기 액세스키 금지).", BULLET),
          P("• 관측·예산: CloudWatch 대시보드 + AWS Budgets 알림($30 초과 메일) — 1일차 필수.", BULLET),
          P("• 환경 분리: dev/prod 스택(또는 계정) 분리. 검증: IaC 1회 배포·삭제 성공.", BULLET)]
story += [P("Phase 1 — 프론트 + 이미지 (저위험, 먼저)", H3),
          P("• vite build -> S3 정적 호스팅 + CloudFront(OAC). 이미지: S3 presigned 업로드, CloudFront 서빙.", BULLET),
          P("• ACM 인증서 + Route53(선택). 검증: Lighthouse·캐시 적중률. 롤백: 기존 호스팅 유지하며 DNS 컷오버.", BULLET)]
story += [P("Phase 2 — 실시간 그룹투표 (무상태화)", H3),
          P("• API Gateway WebSocket + Lambda(connect/disconnect/vote). DynamoDB: connections·세션상태·스와이프(TTL 자동만료).", BULLET),
          P("• 기존 Express WS·memSessions 로직 -> Lambda+DynamoDB로 이식. 검증: 동시 N명 동기화·재연결.", BULLET)]
story += [P("Phase 3 — API + DB (핵심, 위험 높음)", H3),
          P("• API: Express 라우트 -> Lambda(API GW REST). 이식 부담이 크면 App Runner 컨테이너를 과도기 대안으로.", BULLET),
          P("• DB: Supabase Postgres -> RDS Postgres + PostGIS(거리쿼리). 스키마는 Drizzle 마이그레이션 재사용.", BULLET),
          P("• 데이터 이관: pg_dump/restore(일회) 또는 AWS DMS(지속복제). DATABASE_URL -> Secrets Manager.", BULLET),
          P("• 컷오버: 이중쓰기/리드섀도우로 패리티 확인 후 전환. 롤백: 구 DB 일정 기간 병행 유지.", BULLET)]
story += [P("Phase 4 — 엔진 / 비동기", H3),
          P("• WINNER/SWIPE/SURVEY 이벤트 -> EventBridge/SQS -> 피처 적재 Lambda(DynamoDB/RDS 피처스토어).", BULLET),
          P("• 인메모리 취향·연쇄 모델 외부화. 오프라인 학습: Step Functions/ECS 배치 -> (나중) SageMaker 추론.", BULLET)]

# ── 4. 가이드라인 정리
story += [PageBreak(), P("4. 운영 가이드라인 (정리)", H2)]
story += [P("보안", H3),
          P("• IAM 최소권한·역할 기반, 루트 미사용·MFA. 자격증명은 Secrets Manager(깃 금지), 로테이션.", BULLET),
          P("• RDS private subnet + 보안그룹 최소화. Cognito로 인증·세션. S3는 presigned·퍼블릭 차단.", BULLET)]
story += [P("비용 (예산 함정 위주)", H3),
          P("• AWS Budgets+결제알림 1일차 설정. cost allocation 태깅. scale-to-zero 우선(상주 리소스 최소화).", BULLET),
          P("• NAT Gateway 함정(~$32/월+전송): Lambda를 VPC 밖에 두거나 VPC 엔드포인트 사용.", BULLET),
          P("• Aurora Serverless v2 최소용량(~$44/월)보다 저트래픽엔 RDS t4g.micro가 저렴. 프리티어 12개월 만료 캘린더 표시.", BULLET),
          P("• 유휴 RDS 자동중지·데모 환경 tear-down. egress는 CloudFront로 완화. 학생은 AWS Educate/Student Pack 크레딧.", BULLET)]
story += [P("운영 / 관측", H3),
          P("• CloudWatch 로그·지표·알람(에러율·지연·DLQ). IaC(CDK/Terraform)로 전 리소스 코드화.", BULLET),
          P("• dev 단일 AZ(저비용), prod DB만 Multi-AZ(가용성·비용 2배). 블루/그린 또는 카나리 배포.", BULLET)]
story += [P("데이터", H3),
          P("• RDS 자동 백업·PITR, prod 스냅샷 보존. DynamoDB PITR. 이관 시 무결성 검증(행수·체크섬).", BULLET),
          P("• PostGIS 인덱스(GiST)로 반경쿼리 성능. 이벤트는 append-only, 피처는 멱등 적재.", BULLET)]
story += [P("배포 / CI-CD", H3),
          P("• GitHub Actions -> OIDC -> CDK deploy. 환경별 스택. 마이그레이션은 배포 파이프라인에 단계화.", BULLET)]

# ── 5. 예산 산정
story += [P("5. 예상 예산 산정 (ap-northeast-2, 월 USD)", H2),
          P("가정: 서울 리전, scale-to-zero, 이미지·전송 보통 수준. 범위는 트래픽·프리티어 적용 여부에 따른 하한~상한.", CAP)]
story += [P("(1) MVP / 데모 — 수백 유저", H3),
         tbl([
             ["항목", "구성", "월 비용"],
             ["프론트/CDN", "S3 + CloudFront", "$2~6"],
             ["API/컴퓨트", "API Gateway + Lambda (월 100만 요청 무료)", "$0~5"],
             ["DB", "RDS Postgres t4g.micro (1년차 프리티어 $0)", "$0~15"],
             ["NoSQL", "DynamoDB 온디맨드 (세션·연결·피처)", "$0~2"],
             ["인증", "Cognito (5만 MAU 무료)", "$0"],
             ["운영", "Secrets Manager·CloudWatch", "$1~4"],
             ["소계", "하이브리드(DB=Supabase 유지) 시 $3~10", "약 $5~35"],
         ], [80, 290, 110], align_last_right=True)]
story += [P("(2) 성장기 — 1k~10k MAU", H3),
         tbl([
             ["항목", "구성", "월 비용"],
             ["DB", "RDS db.t4g.small (prod Multi-AZ)", "$30~90"],
             ["API/컴퓨트", "Lambda + API Gateway", "$10~30"],
             ["캐시", "ElastiCache Redis (cache.t4g.micro) — 캐시·리더보드", "$12~25"],
             ["NoSQL", "DynamoDB", "$5~20"],
             ["CDN/전송", "CloudFront / S3 / egress", "$10~30"],
             ["운영·인증", "CloudWatch·Secrets·Cognito 등", "$5~20"],
             ["소계", "", "약 $90~220"],
         ], [80, 290, 110], align_last_right=True)]
story += [P("(3) 확장 / ML 본격화 — 필요 시 증분", H3),
         tbl([
             ["항목", "구성", "월 비용(증분)"],
             ["추론 서빙", "SageMaker endpoint(상시) 또는 ECS Fargate", "$50~250"],
             ["학습/배치", "Step Functions·ECS·SageMaker 학습잡", "$30~150"],
             ["DB 업그레이드", "RDS 상위/Aurora", "$50~150"],
             ["증분 소계", "필요할 때만 — 평시 0", "+$150~500"],
         ], [80, 290, 110], align_last_right=True)]
story += [P("절감 레버", H3),
          P("• 하이브리드 시작(DB Supabase 유지) -> 월 $3~10. 프리티어 12개월·학생 크레딧 적극 활용.", BULLET),
          P("• scale-to-zero(Lambda) 우선·상주 리소스 최소화. 안정 워크로드는 Savings Plans/예약으로 RDS 30~50% 절감.", BULLET),
          P("• egress는 CloudFront 캐시로 완화. dev 단일 AZ·자동중지.", BULLET)]
story += [P("TCO 요약", H3),
         tbl([
             ["단계", "가정", "월 예상"],
             ["하이브리드 시작", "프론트·실시간 AWS, DB Supabase", "$3~10"],
             ["MVP 풀 AWS", "수백 유저, 프리티어", "$5~35"],
             ["성장기", "1k~10k MAU", "$90~220"],
             ["+ ML 본격화", "추론·학습 상시", "+$150~500"],
         ], [120, 250, 110], align_last_right=True)]

# ── 6. 리스크 & 컷오버 체크리스트
story += [P("6. 리스크 & 컷오버 체크리스트", H2),
         tbl([
             ["리스크", "완화"],
             ["상태(엔진·세션) 인메모리 의존", "DynamoDB/RDS 외부화 — Lambda 무상태 전제(최우선)"],
             ["DB 이관 중 데이터 유실/불일치", "DMS 지속복제 + 이중쓰기·리드섀도우 + 무결성 검증 후 컷오버"],
             ["비용 폭주(NAT·Aurora·프리티어 만료)", "Budgets 알림·VPC 엔드포인트·t4g.micro·만료 캘린더"],
             ["실시간 동기화 회귀", "WebSocket 부하·재연결 테스트, DynamoDB TTL"],
             ["롤백 곤란", "구 스택 병행 유지·DNS/트래픽 가중 컷오버·IaC로 재현"],
         ], [180, 300])]
story += [P("Go-live 체크리스트", H3),
          P("• Budgets 알림 ON · 시크릿 Secrets Manager 이전 · prod Multi-AZ · 백업/PITR · 알람(에러·지연·DLQ) · "
            "부하/패리티 테스트 통과 · 롤백 절차 문서화 · 태깅 완료.", BULLET)]

# ── 7. 권고 요약
story += [P("7. 권고 요약", H2),
          P("1) 하이브리드로 시작해 비용을 0에 가깝게 두고, 저위험 단계(프론트·이미지·실시간)부터 AWS로 옮긴다. "
            "2) 가장 큰 설계 변경은 인메모리 상태의 외부화이며, 이를 P2~P4에 걸쳐 처리한다. "
            "3) DB 이관(P3)은 이중쓰기·리드섀도우로 안전 컷오버한다. "
            "4) 1일차에 Budgets 알림·태깅·Secrets Manager를 세팅해 예산 함정을 차단한다. "
            "5) 트래픽이 성장하면 서버리스 우선을 목표로, ML은 필요 시점에만 증분 투자한다.", BODY)]

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "aws_migration_report.pdf")
SimpleDocTemplate(out, pagesize=A4, topMargin=16 * mm, bottomMargin=15 * mm,
                  leftMargin=17 * mm, rightMargin=17 * mm,
                  title="Lunchie x Munchie — AWS 마이그레이션 보고서").build(story)
print("wrote", out)
