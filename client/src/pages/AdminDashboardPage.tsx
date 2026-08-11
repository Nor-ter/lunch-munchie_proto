import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, BarChart3, DatabaseZap, LayoutDashboard, LockKeyhole, RefreshCw, ShieldCheck, SlidersHorizontal, UsersRound } from 'lucide-react';

type Trend = { day: string; activeActors: number; sessions: number; decisions: number };
type Persona = { category: string; selectors: number; decisions: number };
type Model = { version: string; impressions: number; swipes: number; likes: number; likeRate: number | null };
type Instrumentation = { persistedSlates: number; servedImpressions: number; attributableSwipes: number; propensityCoverage: number | null; scoreCoverage: number | null; modelVersionCoverage: number | null; contextCoverage: number | null };
type Learning = { level: 'blocked' | 'instrumenting' | 'measuring' | 'evaluation-ready'; label: string; detail: string; nextStep: string };
type CategoryPerformance = { category: string; impressions: number; likes: number; nopes: number; decisions: number; likeRate: number | null; responseLift: number | null };
type PolicyContribution = { factor: string; contribution: number };
type Catalogue = {
  restaurants: number;
  photoReferences: number;
  restaurantsWithPhotoReferences: number;
  photoAssets: number;
  restaurantsWithPhotoAssets: number;
  menuItems: number;
  restaurantsWithMenus: number;
  normalisedMenuItems: number;
  restaurantsWithNormalisedMenus: number;
  completeness: { address: number; coordinates: number; description: number; photoReference: number; menu: number };
  categories: { category: string; count: number }[];
  dietarySupport: { label: string; count: number }[];
  sources: { source: string; count: number }[];
  samples: { name: string; category: string; photoCount: number; menuCount: number }[];
};
type AdminMetrics = {
  days: number;
  updatedAt: string;
  users: { registered: number; newRegistered: number; activeSignedIn: number; activeGuests: number; activeActors: number };
  funnel: { impressions: number; swipes: number; likes: number; nopes: number; decisions: number; navigations: number; rerolls: number; abandons: number };
  quality: { swipeLikeRate: number | null; sessionDecisionRate: number | null; rerollRate: number | null; propensityCoverage: number | null; scoreCoverage: number | null };
  trend: Trend[];
  personas: Persona[];
  models: Model[];
  instrumentation: Instrumentation;
  learning: Learning;
  categoryPerformance: CategoryPerformance[];
  policyContributions: PolicyContribution[];
  contributionSampleSize: number;
  catalogue: Catalogue;
};

const COLORS = ['#FF6B6F', '#F49A8A', '#F7C873', '#85B8A9', '#86A8E7', '#AA95D9'];
const periodLabel = (days: number) => days === 365 ? '전체' : `${days}일`;
const dayLabel = (day: string) => {
  const [, month, date] = day.split('-');
  return `${Number(month)}/${Number(date)}`;
};
const percentage = (value: number | null) => value === null ? '데이터 없음' : `${(value * 100).toFixed(1)}%`;
const coverage = (value: number, total: number) => total ? `${((value / total) * 100).toFixed(0)}%` : '데이터 없음';
const readinessTone = (level: Learning['level']) => ({
  blocked: 'border-[#FF7679]/40 bg-[#52282A] text-[#FFB9BA]',
  instrumenting: 'border-[#F7C873]/35 bg-[#4C4227] text-[#FFE1A2]',
  measuring: 'border-[#86A8E7]/35 bg-[#273A52] text-[#C5D9FF]',
  'evaluation-ready': 'border-[#85B8A9]/35 bg-[#25423A] text-[#B8E5D5]',
}[level]);

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
    <p className="text-xs text-white/60">{label}</p>
    <p className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</p>
    <p className="mt-1 text-[11px] text-white/45">{detail}</p>
  </div>;
}

function Panel({ title, detail, children, className = '', id }: { title: string; detail?: string; children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`rounded-2xl border border-white/10 bg-[#272727] p-5 ${className}`}>
    <h2 className="text-base font-bold text-white">{title}</h2>
    {detail && <p className="mt-1 text-xs leading-relaxed text-white/55">{detail}</p>}
    <div className="mt-4">{children}</div>
  </section>;
}

function AccessState({ code }: { code: number | null }) {
  const login = () => window.location.assign('/api/auth/google/start?next=/admin');
  return <main className="flex min-h-dvh items-center justify-center bg-[#171717] p-5 text-white">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#272727] p-7 text-center shadow-2xl">
      <LockKeyhole className="mx-auto h-9 w-9 text-[#FF7679]" />
      <h1 className="mt-4 text-xl font-bold">운영 대시보드</h1>
      {code === 401 ? <>
        <p className="mt-2 text-sm leading-6 text-white/65">Google 로그인 후 관리자 권한을 확인합니다.</p>
        <button onClick={login} className="mt-6 w-full rounded-xl bg-[#EB5053] px-4 py-3 text-sm font-bold">Google로 로그인</button>
      </> : <>
        <p className="mt-2 text-sm leading-6 text-white/65">이 계정에는 운영 지표 접근 권한이 없습니다.</p>
        <p className="mt-3 rounded-lg bg-white/5 p-3 text-left text-xs leading-5 text-white/45">관리자는 Cloudflare Pages의 <code>ADMIN_EMAILS</code> 비밀 변수에 Google 이메일을 쉼표로 구분해 등록해야 합니다.</p>
      </>}
    </section>
  </main>;
}

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<7 | 30 | 365>(30);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const response = await fetch(`/api/admin/metrics?days=${period}`);
      if (!response.ok) {
        setErrorCode(response.status);
        return;
      }
      setMetrics(await response.json() as AdminMetrics);
    } catch {
      setErrorCode(500);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [period]);

  const funnel = useMemo(() => metrics ? [
    { label: '노출', value: metrics.funnel.impressions },
    { label: '스와이프', value: metrics.funnel.swipes },
    { label: '결정', value: metrics.funnel.decisions },
    { label: '길찾기', value: metrics.funnel.navigations },
  ] : [], [metrics]);

  if (errorCode === 401 || errorCode === 403) return <AccessState code={errorCode} />;
  return <main className="min-h-dvh bg-[#171717] text-white">
      <div className="mx-auto grid min-h-dvh max-w-[1680px] grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-white/10 bg-[#1D1D1D] px-5 py-7 lg:flex">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EB5053] font-black">LM</div>
            <div><p className="text-sm font-bold">Lunchie Munchie</p><p className="mt-0.5 text-[10px] font-bold tracking-[0.16em] text-[#FF9092]">OPERATIONS</p></div>
          </div>
          <div className="mt-9 space-y-1">
            <a href="#overview" className="flex items-center gap-3 rounded-xl bg-white/[0.09] px-3 py-2.5 text-sm font-semibold"><LayoutDashboard size={17} className="text-[#FF9092]" />개요</a>
            <a href="#catalogue" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/[0.05] hover:text-white"><DatabaseZap size={17} />카탈로그 현황</a>
            <a href="#funnel" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/[0.05] hover:text-white"><Activity size={17} />이용·전환</a>
            <a href="#learning" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/[0.05] hover:text-white"><SlidersHorizontal size={17} />추천 정책</a>
            <a href="#data-contract" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/[0.05] hover:text-white"><DatabaseZap size={17} />데이터 계약</a>
          </div>
          <div className="mt-auto rounded-2xl border border-[#FF7679]/20 bg-[#52282A]/50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#FFB9BA]"><ShieldCheck size={15} />관리자 전용</div>
            <p className="mt-2 text-[11px] leading-5 text-white/50">개인 식별 정보와 정확한 위치는 집계 API·화면 어디에도 제공하지 않습니다.</p>
          </div>
        </aside>
        <div className="min-w-0 px-4 py-6 sm:px-6 lg:px-9 lg:py-8 xl:px-12">
          <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div>
          <div className="flex items-center gap-2 text-[#FF9092]"><ShieldCheck size={20} /><span className="text-xs font-bold tracking-[0.18em]">LUNCHIE MUNCHIE · ADMIN</span></div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight xl:text-4xl">운영 및 학습 현황</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">개인 식별 정보 없이, 집계된 제품·추천·취향 신호만 표시합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-white/10 p-1">
            {([7, 30, 365] as const).map((value) => <button key={value} onClick={() => setPeriod(value)} className={`rounded-lg px-3 py-1.5 text-sm ${period === value ? 'bg-white text-[#222] font-bold' : 'text-white/65'}`}>{periodLabel(value)}</button>)}
          </div>
          <button onClick={() => void load()} disabled={loading} aria-label="새로고침" className="rounded-xl bg-white/10 p-2.5 text-white/80 disabled:opacity-40"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button>
        </div>
          </header>

          {loading && !metrics ? <p className="py-28 text-center text-sm text-white/60">집계 지표를 불러오는 중…</p> : metrics ? <>
        <section id="overview" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:gap-4">
          <MetricCard label="가입 이용자" value={String(metrics.users.registered)} detail={`기간 내 신규 ${metrics.users.newRegistered}명`} />
          <MetricCard label="활성 로그인 이용자" value={String(metrics.users.activeSignedIn)} detail={`${periodLabel(period)} 동안 행동 기록`} />
          <MetricCard label="익명 체험 이용자" value={String(metrics.users.activeGuests)} detail="기기 쿠키 기준, 중복 제거" />
          <MetricCard label="결정 완료" value={String(metrics.funnel.decisions)} detail={`세션 결정률 ${percentage(metrics.quality.sessionDecisionRate)}`} />
          <MetricCard label="추천 수락률" value={percentage(metrics.quality.swipeLikeRate)} detail="좋아요 ÷ 선호/비선호 스와이프" />
          <MetricCard label="학습 상태" value={metrics.learning.label} detail={`근거 스와이프 ${metrics.instrumentation.attributableSwipes}건`} />
        </section>

        <section id="catalogue" className="mt-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-bold tracking-[0.14em] text-[#FF9092]">CATALOGUE HEALTH</p><h2 className="mt-1 text-xl font-bold">현재 데이터 현황</h2></div><p className="text-xs text-white/45">식당 카탈로그와 연결된 사진·메뉴 데이터의 집계입니다.</p></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
            <MetricCard label="등록 식당" value={`${metrics.catalogue.restaurants}곳`} detail={`카테고리 ${metrics.catalogue.categories.length}개`} />
            <MetricCard label="사진 연결" value={`${metrics.catalogue.photoReferences}장`} detail={`${metrics.catalogue.restaurantsWithPhotoReferences}곳 · ${coverage(metrics.catalogue.restaurantsWithPhotoReferences, metrics.catalogue.restaurants)}`} />
            <MetricCard
              label="사진 메타데이터 색인"
              value={metrics.catalogue.photoAssets ? `${metrics.catalogue.photoAssets}장` : '미색인'}
              detail={metrics.catalogue.photoAssets
                ? `${metrics.catalogue.restaurantsWithPhotoAssets}곳에서 색인`
                : `연결 사진 ${metrics.catalogue.photoReferences}장은 사용 가능`}
            />
            <MetricCard label="메뉴 항목" value={`${metrics.catalogue.menuItems}개`} detail={`${metrics.catalogue.restaurantsWithMenus}곳 · 정규화 ${metrics.catalogue.normalisedMenuItems}개`} />
            <MetricCard label="좌표 완성도" value={coverage(metrics.catalogue.completeness.coordinates, metrics.catalogue.restaurants)} detail={`${metrics.catalogue.completeness.coordinates}/${metrics.catalogue.restaurants}곳 위치 보유`} />
          </div>
        </section>

        <section className="mt-5 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-12">
          <Panel id="catalogue-coverage" className="md:col-span-2 xl:col-span-5" title="카탈로그 완성도" detail="추천 가능한 식당 레코드에 필요한 핵심 필드의 충족률입니다.">
            <div className="space-y-3">{[
              ['주소', metrics.catalogue.completeness.address],
              ['좌표', metrics.catalogue.completeness.coordinates],
              ['설명', metrics.catalogue.completeness.description],
              ['사진 연결', metrics.catalogue.completeness.photoReference],
              ['구조화 메뉴', metrics.catalogue.completeness.menu],
            ].map(([label, value]) => <div key={String(label)}><div className="flex justify-between gap-3 text-xs"><span className="text-white/70">{label}</span><span className="font-semibold text-white">{coverage(Number(value), metrics.catalogue.restaurants)} · {Number(value)}곳</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#85B8A9]" style={{ width: `${metrics.catalogue.restaurants ? (Number(value) / metrics.catalogue.restaurants) * 100 : 0}%` }} /></div></div>)}</div>
            <div className="mt-5 flex flex-wrap gap-2">{metrics.catalogue.sources.map((source) => <span key={source.source} className="rounded-full bg-white/[0.07] px-2.5 py-1 text-xs text-white/65">{source.source} {source.count}곳</span>)}</div>
          </Panel>
          <Panel className="md:col-span-2 xl:col-span-7" title="식당 카테고리 구성" detail="현재 카탈로그의 업종·음식 분류 분포입니다.">
            {metrics.catalogue.categories.length ? <div className="h-72"><ResponsiveContainer><BarChart data={metrics.catalogue.categories} margin={{ left: -16 }}><CartesianGrid stroke="#ffffff14" vertical={false} /><XAxis dataKey="category" tick={{ fill: '#ffffff88', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} /><YAxis allowDecimals={false} tick={{ fill: '#ffffff88', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#171717', border: '1px solid #ffffff22', borderRadius: 10 }} formatter={(value: number) => [value, '식당 수']} /><Bar dataKey="count" name="식당 수" fill="#86A8E7" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div> : <Empty label="등록된 카테고리 데이터가 없습니다." />}
          </Panel>
          <Panel className="md:col-span-2 xl:col-span-5" title="지원 식단·제약" detail="식당 레코드에 명시된 식단 옵션입니다. 알레르기 안전성 보증이 아니라, 필터·추천에 사용할 수 있는 카탈로그 태그 현황입니다.">
            {metrics.catalogue.dietarySupport.length ? <div className="flex flex-wrap gap-2">{metrics.catalogue.dietarySupport.map((diet, index) => <div key={diet.label} className="flex min-w-[calc(50%-0.25rem)] flex-1 items-center justify-between rounded-xl bg-white/[0.05] px-3 py-3 text-xs"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />{diet.label}</span><strong>{diet.count}곳</strong></div>)}</div> : <Empty label="아직 식단 옵션 태그가 없습니다." />}
          </Panel>
          <Panel className="md:col-span-2 xl:col-span-7" title="카탈로그 예시" detail="리뷰 수와 평점을 기준으로 확인하는 대표 레코드입니다. 개인화 추천 순위가 아닙니다.">
            {metrics.catalogue.samples.length ? <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="border-b border-white/10 text-white/45"><tr><th className="pb-2 font-medium">식당</th><th className="pb-2 font-medium">분류</th><th className="pb-2 text-right font-medium">사진</th><th className="pb-2 text-right font-medium">메뉴</th></tr></thead><tbody>{metrics.catalogue.samples.map((restaurant) => <tr key={`${restaurant.name}-${restaurant.category}`} className="border-b border-white/[0.06]"><td className="py-2.5 font-medium text-white/90">{restaurant.name}</td><td className="py-2.5 text-white/60">{restaurant.category}</td><td className="py-2.5 text-right tabular-nums text-white/70">{restaurant.photoCount}</td><td className="py-2.5 text-right tabular-nums text-white/70">{restaurant.menuCount}</td></tr>)}</tbody></table></div> : <Empty label="표시할 식당 카탈로그가 없습니다." />}
          </Panel>
          <Panel className="xl:col-span-7" title="이용 추이" detail="일별 고유 행위자·세션·최종 결정">
            <div className="h-72"><ResponsiveContainer><LineChart data={metrics.trend}><CartesianGrid stroke="#ffffff14" vertical={false} /><XAxis dataKey="day" tickFormatter={dayLabel} tick={{ fill: '#ffffff88', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} /><YAxis allowDecimals={false} tick={{ fill: '#ffffff88', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#171717', border: '1px solid #ffffff22', borderRadius: 10 }} labelFormatter={dayLabel} /><Line type="monotone" dataKey="activeActors" name="활성 이용자" stroke="#FF7376" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="sessions" name="세션" stroke="#F7C873" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="decisions" name="결정" stroke="#85B8A9" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
          </Panel>
          <Panel id="learning" className="xl:col-span-5" title="알고리즘 학습 준비도" detail="자동 최적화의 성과가 아니라, 문서에 정의된 오프라인 평가를 시작해도 되는지의 전제 조건입니다.">
            <div className={`rounded-xl border p-4 ${readinessTone(metrics.learning.level)}`}>
              <p className="text-sm font-bold">{metrics.learning.label}</p>
              <p className="mt-2 text-xs leading-5 opacity-90">{metrics.learning.detail}</p>
              <p className="mt-3 border-t border-current/20 pt-3 text-xs font-medium">다음: {metrics.learning.nextStep}</p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><Stat label="불변 슬레이트" value={`${metrics.instrumentation.persistedSlates}개`} /><Stat label="서버 노출" value={`${metrics.instrumentation.servedImpressions}건`} /><Stat label="행동 연결" value={`${metrics.instrumentation.attributableSwipes}건`} /></div>
          </Panel>
          <Panel id="funnel" className="xl:col-span-4" title="Lunchie 퍼널" detail="추천 노출부터 길찾기까지의 행동 전환">
            <div className="h-72"><ResponsiveContainer><BarChart data={funnel} layout="vertical" margin={{ left: 12 }}><XAxis type="number" allowDecimals={false} tick={{ fill: '#ffffff88', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis dataKey="label" type="category" width={54} tick={{ fill: '#ffffffcc', fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#171717', border: '1px solid #ffffff22', borderRadius: 10 }} /><Bar dataKey="value" name="건수" fill="#FF7376" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs"><Stat label="재추천" value={percentage(metrics.quality.rerollRate)} /><Stat label="Propensity 기록" value={percentage(metrics.quality.propensityCoverage)} /><Stat label="Score 기록" value={percentage(metrics.quality.scoreCoverage)} /></div>
          </Panel>
          <Panel id="data-contract" className="xl:col-span-4" title="계측 계약" detail="추천을 받은 뒤의 클라이언트 값이 아니라, 서버가 저장한 노출 증거를 기준으로 합니다.">
            <div className="space-y-3">
              {[
                ['포함 확률 (propensity)', metrics.instrumentation.propensityCoverage],
                ['정책 점수', metrics.instrumentation.scoreCoverage],
                ['정책 버전', metrics.instrumentation.modelVersionCoverage],
                ['요청 맥락 스냅샷', metrics.instrumentation.contextCoverage],
              ].map(([label, value]) => <div key={String(label)}>
                <div className="flex justify-between gap-3 text-xs"><span className="text-white/70">{label}</span><span className="font-semibold text-white">{percentage(value as number | null)}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#FF7376]" style={{ width: `${Math.max(0, Math.min(100, Number(value ?? 0) * 100))}%` }} /></div>
              </div>)}
            </div>
          </Panel>
          <Panel className="xl:col-span-4" title="추천 정책 학습 신호" detail="정책 버전별 노출·스와이프·수락률입니다. 표본이 작을 때는 의사결정에 사용하지 마세요.">
            {metrics.models.length ? <div className="space-y-3">{metrics.models.map((model) => <div key={model.version} className="rounded-xl bg-white/[0.05] p-3"><div className="flex justify-between gap-3"><span className="font-mono text-xs text-[#FFB3B5]">{model.version}</span><span className="text-sm font-bold">수락 {percentage(model.likeRate)}</span></div><div className="mt-2 grid grid-cols-3 text-xs text-white/60"><span>노출 {model.impressions}</span><span>스와이프 {model.swipes}</span><span>좋아요 {model.likes}</span></div></div>)}</div> : <Empty label="아직 모델 버전이 기록된 추천 데이터가 없습니다." />}
          </Panel>
          <Panel className="md:col-span-2 xl:col-span-8" title="현재 정책의 점수 구성" detail={`서버가 실제로 낸 슬레이트 ${metrics.contributionSampleSize}개 항목의 평균 점수 기여입니다. ‘왜 추천됐는지’의 정책 설명이며, 사용자의 결정 원인이나 인과 효과는 아닙니다.`}>
            {metrics.policyContributions.length ? <div className="h-72"><ResponsiveContainer><BarChart data={metrics.policyContributions} layout="vertical" margin={{ left: 16 }}><CartesianGrid stroke="#ffffff14" vertical={false} /><XAxis type="number" tick={{ fill: '#ffffff88', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis dataKey="factor" type="category" width={68} tick={{ fill: '#ffffffcc', fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#171717', border: '1px solid #ffffff22', borderRadius: 10 }} formatter={(value: number) => [value.toFixed(3), '평균 점수 기여']} /><Bar dataKey="contribution" name="기여도" fill="#F7C873" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div> : <Empty label="새 추천 슬레이트가 쌓이면 점수 구성부터 표시합니다." />}
          </Panel>
          <Panel className="md:col-span-2 xl:col-span-7" title="카테고리별 결정 반응" detail="노출 후 LIKE/NOPE 반응의 관측 차이입니다. 카테고리는 무작위 배정되지 않으므로 ‘결정에 미친 인과 영향’이 아니라 다음 정책 가설을 위한 신호입니다.">
            {metrics.categoryPerformance.length ? <><div className="h-56"><ResponsiveContainer><BarChart data={metrics.categoryPerformance} margin={{ left: -16 }}><CartesianGrid stroke="#ffffff14" vertical={false} /><XAxis dataKey="category" tick={{ fill: '#ffffff88', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} /><YAxis allowDecimals={false} tick={{ fill: '#ffffff88', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#171717', border: '1px solid #ffffff22', borderRadius: 10 }} formatter={(value: number, name: string) => [value, name === 'impressions' ? '노출' : name === 'decisions' ? '결정' : name]} /><Bar dataKey="impressions" name="impressions" fill="#86A8E7" radius={[5, 5, 0, 0]} /><Bar dataKey="decisions" name="decisions" fill="#FF7376" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{metrics.categoryPerformance.map((row) => <div key={row.category} className="rounded-lg bg-white/[0.05] px-3 py-2 text-xs"><div className="flex justify-between"><span>{row.category}</span><span className="font-semibold">반응 {percentage(row.likeRate)}</span></div><p className="mt-1 text-white/55">전체 대비 {row.responseLift === null ? '데이터 없음' : `${row.responseLift >= 0 ? '+' : ''}${(row.responseLift * 100).toFixed(1)}%p`} · 노출 {row.impressions}</p></div>)}</div></> : <Empty label="카테고리별 추천 증거가 아직 없습니다." />}
          </Panel>
          <Panel className="md:col-span-2 xl:col-span-5" title="관찰된 취향 분포" detail="기간 내 최종 선택 카테고리를 익명·집계해 표시합니다. 개인 페르소나는 노출하지 않습니다.">
            {metrics.personas.length ? <div className="flex h-auto flex-col sm:h-72 sm:flex-row"><div className="h-56 sm:h-full sm:w-[58%]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={metrics.personas} dataKey="decisions" nameKey="category" innerRadius={48} outerRadius={92} paddingAngle={3}>{metrics.personas.map((row, index) => <Cell key={row.category} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: '#171717', border: '1px solid #ffffff22', borderRadius: 10 }} /></PieChart></ResponsiveContainer></div><div className="grid flex-1 content-center gap-2 pb-2 text-xs text-white/75 sm:pb-0">{metrics.personas.map((row, index) => <div key={row.category} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span>{row.category}</span><span className="ml-auto">{row.decisions}회 · {row.selectors}명</span></div>)}</div></div> : <Empty label="아직 최종 결정 데이터가 없습니다." />}
          </Panel>
        </section>
        <footer className="mt-6 flex items-center gap-2 text-xs text-white/40"><DatabaseZap size={14} /><span>개인 식별자·정확 위치·개별 취향 벡터는 이 화면과 API에 포함되지 않습니다. 마지막 집계 {new Date(metrics.updatedAt).toLocaleString('ko-KR')}</span></footer>
      </> : <div className="rounded-2xl bg-[#4E2528] p-5 text-sm text-[#FFB8B8]">운영 지표를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>}
        </div>
      </div>
  </main>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white/[0.05] p-2"><p className="text-white/50">{label}</p><p className="mt-1 font-semibold text-white">{value}</p></div>;
}

function Empty({ label }: { label: string }) {
  return <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-white/15 px-5 text-center text-sm text-white/45"><BarChart3 className="mr-2 h-5 w-5" />{label}</div>;
}
