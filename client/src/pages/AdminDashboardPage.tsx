import { englishText } from '@shared/englishCopy';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, BarChart3, DatabaseZap, Images, LayoutDashboard, LockKeyhole, RefreshCw, ShieldCheck, SlidersHorizontal, UsersRound } from 'lucide-react';
import AdminPhotoReviewPanel from '@/components/admin/AdminPhotoReviewPanel';

type Trend = { day: string; activeActors: number; sessions: number; decisions: number };
type Persona = { category: string; selectors: number; decisions: number };
type Model = { version: string; impressions: number; swipes: number; likes: number; likeRate: number | null };
type Instrumentation = { persistedSlates: number; servedImpressions: number; attributableSwipes: number; persistedSessionSwipes: number; attributableSessionSwipes: number; unattributedSessionSwipes: number; propensityCoverage: number | null; scoreCoverage: number | null; modelVersionCoverage: number | null; contextCoverage: number | null };
type Learning = { level: 'blocked' | 'instrumenting' | 'measuring' | 'evaluation-ready'; label: string; detail: string; nextStep: string; targets: { swipes: number; decisions: number } };
type CategoryPerformance = { category: string; impressions: number; likes: number; nopes: number; decisions: number; likeRate: number | null; responseLift: number | null };
type PolicyContribution = { factor: string; contribution: number };
type Catalogue = {
  restaurants: number;
  photoReferences: number;
  restaurantsWithPhotoReferences: number;
  photoAssets: number;
  restaurantsWithPhotoAssets: number;
  communityPhotoAttributions: number;
  restaurantPhotoAttributions: number;
  otherPhotoAttributions: number;
  menuItems: number;
  restaurantsWithMenus: number;
  normalisedMenuItems: number;
  restaurantsWithNormalisedMenus: number;
  pricedMenuItems: number;
  dietaryMenuItems: number;
  evidencedMenuItems: number;
  completeness: { address: number; coordinates: number; description: number; photoReference: number; menu: number };
  categories: { category: string; count: number }[];
  dietarySupport: { label: string; count: number }[];
  menuIntentEvidence: { intent: 'meal' | 'cafe' | 'dessert'; count: number }[];
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
const periodLabel = (days: number) => days === 365 ? "All" : `${days} days`;
const dayLabel = (day: string) => {
  const [, month, date] = day.split('-');
  return `${Number(month)}/${Number(date)}`;
};
const percentage = (value: number | null) => value === null ? "No data" : `${(value * 100).toFixed(1)}%`;
const coverage = (value: number, total: number) => total ? `${((value / total) * 100).toFixed(0)}%` : "No data";
const readinessTone = (level: Learning['level']) => ({
  blocked: 'border-[#FF7679]/40 bg-[#52282A] text-[#FFB9BA]',
  instrumenting: 'border-[#F7C873]/35 bg-[#4C4227] text-[#FFE1A2]',
  measuring: 'border-[#86A8E7]/35 bg-[#273A52] text-[#C5D9FF]',
  'evaluation-ready': 'border-[#85B8A9]/35 bg-[#25423A] text-[#B8E5D5]',
}[level]);

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
    <p className="text-xs text-white/60">{englishText(label)}</p>
    <p className="mt-1 text-2xl font-bold tabular-nums text-white">{englishText(value)}</p>
    <p className="mt-1 text-[11px] text-white/45">{englishText(detail)}</p>
  </div>;
}

function Panel({ title, detail, children, className = '', id }: { title: string; detail?: string; children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`rounded-2xl border border-white/10 bg-[#272727] p-5 ${className}`}>
    <h2 className="text-base font-bold text-white">{englishText(title)}</h2>
    {englishText(detail && <p className="mt-1 text-xs leading-relaxed text-white/55">{englishText(detail)}</p>)}
    <div className="mt-4">{englishText(children)}</div>
  </section>;
}

function AccessState({ code }: { code: number | null }) {
  const login = () => window.location.assign('/api/auth/google/start?next=/admin');
  return <main className="flex min-h-dvh items-center justify-center bg-[#171717] p-5 text-white">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#272727] p-7 text-center shadow-2xl">
      <LockKeyhole className="mx-auto h-9 w-9 text-[#FF7679]" />
      <h1 className="mt-4 text-xl font-bold">Operations Dashboard</h1>
      {code === 401 ? <>
        <p className="mt-2 text-sm leading-6 text-white/65">Sign in with Google to verify admin access.</p>
        <button onClick={login} className="mt-6 w-full rounded-xl bg-[#EB5053] px-4 py-3 text-sm font-bold">Sign in with Google</button>
      </> : <>
        <p className="mt-2 text-sm leading-6 text-white/65">This account does not have access to operational metrics.</p>
        <p className="mt-3 rounded-lg bg-white/5 p-3 text-left text-xs leading-5 text-white/45">Admins must add their Google emails to the Cloudflare Pages <code>ADMIN_EMAILS</code>  secret as a comma-separated list.</p>
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
    { label: "Impressions", value: metrics.funnel.impressions },
    { label: "Swipes", value: metrics.funnel.swipes },
    { label: "Decisions", value: metrics.funnel.decisions },
    { label: "Directions", value: metrics.funnel.navigations },
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
            <a href="#overview" className="flex items-center gap-3 rounded-xl bg-white/[0.09] px-3 py-2.5 text-sm font-semibold"><LayoutDashboard size={17} className="text-[#FF9092]" />Overview</a>
            <a href="#catalogue" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/[0.05] hover:text-white"><DatabaseZap size={17} />Catalogue</a>
            <a href="#photo-review" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/[0.05] hover:text-white"><Images size={17} />Photo Review</a>
            <a href="#funnel" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/[0.05] hover:text-white"><Activity size={17} />Usage & Conversion</a>
            <a href="#learning" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/[0.05] hover:text-white"><SlidersHorizontal size={17} />Recommendation Policy</a>
            <a href="#data-contract" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/[0.05] hover:text-white"><DatabaseZap size={17} />Data Contract</a>
          </div>
          <div className="mt-auto rounded-2xl border border-[#FF7679]/20 bg-[#52282A]/50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#FFB9BA]"><ShieldCheck size={15} />Admin Only</div>
            <p className="mt-2 text-[11px] leading-5 text-white/50">Personal identifiers and precise locations are excluded from aggregate APIs and screens.</p>
          </div>
        </aside>
        <div className="min-w-0 px-4 py-6 sm:px-6 lg:px-9 lg:py-8 xl:px-12">
          <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div>
          <div className="flex items-center gap-2 text-[#FF9092]"><ShieldCheck size={20} /><span className="text-xs font-bold tracking-[0.18em]">LUNCHIE MUNCHIE · ADMIN</span></div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight xl:text-4xl">Operations & Learning</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">Aggregated product, recommendation and preference signals, without personal identifiers.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-white/10 p-1">
            {([7, 30, 365] as const).map((value) => <button key={value} onClick={() => setPeriod(value)} className={`rounded-lg px-3 py-1.5 text-sm ${period === value ? 'bg-white text-[#222] font-bold' : 'text-white/65'}`}>{englishText(periodLabel(value))}</button>)}
          </div>
          <button onClick={() => void load()} disabled={loading} aria-label="Refresh" className="rounded-xl bg-white/10 p-2.5 text-white/80 disabled:opacity-40"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button>
        </div>
          </header>

          {loading && !metrics ? <p className="py-28 text-center text-sm text-white/60">Loading metrics…</p> : metrics ? <>
        <section id="overview" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:gap-4">
          <MetricCard label="Registered Users" value={String(metrics.users.registered)} detail={`New in this period ${metrics.users.newRegistered} people`} />
          <MetricCard label="Active Signed-in Users" value={String(metrics.users.activeSignedIn)} detail={`${periodLabel(period)}  activity`} />
          <MetricCard label="Guest Users" value={String(metrics.users.activeGuests)} detail="Deduplicated by device cookie" />
          <MetricCard label="Completed Decisions" value={String(metrics.funnel.decisions)} detail={`Session Completion Rate ${percentage(metrics.quality.sessionDecisionRate)}`} />
          <MetricCard label="Recommendation Acceptance" value={percentage(metrics.quality.swipeLikeRate)} detail="Likes / preference votes" />
          <MetricCard label="Learning Status" value={metrics.learning.label} detail={`Learning Attribution ${metrics.instrumentation.attributableSwipes}/${metrics.learning.targets.swipes} events · decisions  ${metrics.funnel.decisions}/${metrics.learning.targets.decisions} events`} />
        </section>

        <section id="catalogue" className="mt-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-bold tracking-[0.14em] text-[#FF9092]">CATALOGUE HEALTH</p><h2 className="mt-1 text-xl font-bold">Current Data</h2></div><p className="text-xs text-white/45">Restaurant catalogue and linked photo and menu totals.</p></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
            <MetricCard label="Restaurants" value={`${metrics.catalogue.restaurants} restaurants`} detail={`Categories ${metrics.catalogue.categories.length} items`} />
            <MetricCard label="Linked Photos" value={`${metrics.catalogue.photoReferences} photos`} detail={`${metrics.catalogue.restaurantsWithPhotoReferences} restaurants ·  ${coverage(metrics.catalogue.restaurantsWithPhotoReferences, metrics.catalogue.restaurants)}`} />
            <MetricCard
              label="Photo Metadata Index"
              value={metrics.catalogue.photoAssets ? `${metrics.catalogue.photoAssets} photos` : "Not Indexed"}
              detail={metrics.catalogue.photoAssets
                ? `${metrics.catalogue.restaurantsWithPhotoAssets} restaurants indexed`
                : `Linked Photos ${metrics.catalogue.photoReferences} photos available`}
            />
            <MetricCard label="User Photo Categories" value={`${metrics.catalogue.communityPhotoAttributions} photos`} detail={`Linked to Restaurants ${metrics.catalogue.restaurantPhotoAttributions} photos · other  ${metrics.catalogue.otherPhotoAttributions} photos`} />
            <MetricCard label="Structured Menus" value={`${metrics.catalogue.normalisedMenuItems} items`} detail={`${metrics.catalogue.restaurantsWithNormalisedMenus} restaurants · prices  ${metrics.catalogue.pricedMenuItems} items · dietary evidence  ${metrics.catalogue.dietaryMenuItems} items`} />
            <MetricCard label="Location Coverage" value={coverage(metrics.catalogue.completeness.coordinates, metrics.catalogue.restaurants)} detail={`${metrics.catalogue.completeness.coordinates}/${metrics.catalogue.restaurants} restaurants with locations`} />
          </div>
        </section>

        <AdminPhotoReviewPanel />

        <section className="mt-5 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-12">
          <Panel id="catalogue-coverage" className="md:col-span-2 xl:col-span-5" title="Catalogue Completeness" detail="Coverage of the key fields required for restaurant recommendations.">
            <div className="space-y-3">{[
              ["Address", metrics.catalogue.completeness.address],
              ["Coordinates", metrics.catalogue.completeness.coordinates],
              ["Description", metrics.catalogue.completeness.description],
              ["Linked Photos", metrics.catalogue.completeness.photoReference],
              ["Structured Menus", metrics.catalogue.completeness.menu],
            ].map(([label, value]) => <div key={String(label)}><div className="flex justify-between gap-3 text-xs"><span className="text-white/70">{englishText(label)}</span><span className="font-semibold text-white">{englishText(coverage(Number(value), metrics.catalogue.restaurants))} · {Number(value)} restaurants</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#85B8A9]" style={{ width: `${metrics.catalogue.restaurants ? (Number(value) / metrics.catalogue.restaurants) * 100 : 0}%` }} /></div></div>)}</div>
            <div className="mt-5 flex flex-wrap gap-2">{metrics.catalogue.sources.map((source) => <span key={source.source} className="rounded-full bg-white/[0.07] px-2.5 py-1 text-xs text-white/65">{englishText(source.source)} {source.count} restaurants</span>)}</div>
          </Panel>
          <Panel className="md:col-span-2 xl:col-span-7" title="Restaurant Categories" detail="Cuisine and venue categories in the current catalogue.">
            {metrics.catalogue.categories.length ? <div className="h-72"><ResponsiveContainer><BarChart data={metrics.catalogue.categories} margin={{ left: -16 }}><CartesianGrid stroke="#ffffff14" vertical={false} /><XAxis dataKey="category" tick={{ fill: '#ffffff88', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} /><YAxis allowDecimals={false} tick={{ fill: '#ffffff88', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#171717', border: '1px solid #ffffff22', borderRadius: 10 }} formatter={(value: number) => [value, "Restaurant Count"]} /><Bar dataKey="count" name="Restaurant Count" fill="#86A8E7" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div> : <Empty label="No category data available." />}
          </Panel>
          <Panel className="md:col-span-2 xl:col-span-5" title="Dietary Options" detail="Dietary tags listed in restaurant records for filtering and recommendations. These do not guarantee allergy safety.">
            {metrics.catalogue.dietarySupport.length ? <div className="flex flex-wrap gap-2">{metrics.catalogue.dietarySupport.map((diet, index) => <div key={diet.label} className="flex min-w-[calc(50%-0.25rem)] flex-1 items-center justify-between rounded-xl bg-white/[0.05] px-3 py-3 text-xs"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />{englishText(diet.label)}</span><strong>{diet.count} restaurants</strong></div>)}</div> : <Empty label="No dietary tags yet." />}
          </Panel>
          <Panel className="md:col-span-2 xl:col-span-7" title="Menu Evidence" detail="Menu item counts conservatively classified from structured menu sections. They supplement recommendation scores without changing restaurant categories.">
            <div className="grid grid-cols-3 gap-3">{metrics.catalogue.menuIntentEvidence.map((item, index) => <div key={item.intent} className="rounded-xl bg-white/[0.05] p-4"><p className="text-xs text-white/55">{englishText(item.intent === 'meal' ? "Meals" : item.intent === 'cafe' ? "Cafe" : "Dessert")}  Menu Items</p><p className="mt-1 text-2xl font-bold tabular-nums">{item.count} items</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${metrics.catalogue.normalisedMenuItems ? Math.min(100, (item.count / metrics.catalogue.normalisedMenuItems) * 100) : 0}%`, backgroundColor: COLORS[index] }} /></div></div>)}</div>
            <p className="mt-4 text-xs leading-5 text-white/45">Drinks-only, alcohol-only and ambiguous sections such as SPECIAL are excluded.</p>
          </Panel>
          <Panel className="md:col-span-2 xl:col-span-7" title="Catalogue Samples" detail="Sample records by review count and rating, rather than personalized rankings.">
            {metrics.catalogue.samples.length ? <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="border-b border-white/10 text-white/45"><tr><th className="pb-2 font-medium">Restaurant</th><th className="pb-2 font-medium">Category</th><th className="pb-2 text-right font-medium">Photos</th><th className="pb-2 text-right font-medium">Menu</th></tr></thead><tbody>{metrics.catalogue.samples.map((restaurant) => <tr key={`${restaurant.name}-${restaurant.category}`} className="border-b border-white/[0.06]"><td className="py-2.5 font-medium text-white/90">{englishText(restaurant.name)}</td><td className="py-2.5 text-white/60">{englishText(restaurant.category)}</td><td className="py-2.5 text-right tabular-nums text-white/70">{restaurant.photoCount}</td><td className="py-2.5 text-right tabular-nums text-white/70">{restaurant.menuCount}</td></tr>)}</tbody></table></div> : <Empty label="No restaurant catalogue available." />}
          </Panel>
          <Panel className="xl:col-span-7" title="Usage Trends" detail="Daily unique users, sessions and final decisions">
            <div className="h-72"><ResponsiveContainer><LineChart data={metrics.trend}><CartesianGrid stroke="#ffffff14" vertical={false} /><XAxis dataKey="day" tickFormatter={dayLabel} tick={{ fill: '#ffffff88', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} /><YAxis allowDecimals={false} tick={{ fill: '#ffffff88', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#171717', border: '1px solid #ffffff22', borderRadius: 10 }} labelFormatter={dayLabel} /><Line type="monotone" dataKey="activeActors" name="Active Users" stroke="#FF7376" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="sessions" name="Sessions" stroke="#F7C873" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="decisions" name="Decisions" stroke="#85B8A9" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
          </Panel>
          <Panel id="learning" className="xl:col-span-5" title="Learning Readiness" detail="Prerequisites for starting the documented offline evaluation, rather than evidence of automatic optimization.">
            <div className={`rounded-xl border p-4 ${readinessTone(metrics.learning.level)}`}>
              <p className="text-sm font-bold">{englishText(metrics.learning.label)}</p>
              <p className="mt-2 text-xs leading-5 opacity-90">{englishText(metrics.learning.detail)}</p>
              <p className="mt-3 border-t border-current/20 pt-3 text-xs font-medium">Next: {englishText(metrics.learning.nextStep)}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4"><Stat label="Immutable Slates" value={`${metrics.instrumentation.persistedSlates} items`} /><Stat label="Server Impressions" value={`${metrics.instrumentation.servedImpressions} events`} /><Stat label="Preliminary Votes" value={`${metrics.instrumentation.persistedSessionSwipes} events`} /><Stat label="Learning Attribution" value={`${metrics.instrumentation.attributableSwipes}/${metrics.learning.targets.swipes} events`} /></div>
            {metrics.instrumentation.unattributedSessionSwipes > 0 && <p className="mt-3 rounded-lg bg-[#FF7679]/10 px-3 py-2 text-xs leading-5 text-[#FFB9BA]">Of the previous session votes,  {metrics.instrumentation.unattributedSessionSwipes} were excluded from learning samples because they lacked slate attribution. New votes are attributed automatically.</p>}
          </Panel>
          <Panel id="funnel" className="xl:col-span-4" title="Lunchie Funnel" detail="Conversion from recommendations to directions">
            <div className="h-72"><ResponsiveContainer><BarChart data={funnel} layout="vertical" margin={{ left: 12 }}><XAxis type="number" allowDecimals={false} tick={{ fill: '#ffffff88', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis dataKey="label" type="category" width={54} tick={{ fill: '#ffffffcc', fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#171717', border: '1px solid #ffffff22', borderRadius: 10 }} /><Bar dataKey="value" name="Count" fill="#FF7376" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs"><Stat label="New Recommendations" value={percentage(metrics.quality.rerollRate)} /><Stat label="Propensity Coverage" value={percentage(metrics.quality.propensityCoverage)} /><Stat label="Score Coverage" value={percentage(metrics.quality.scoreCoverage)} /></div>
          </Panel>
          <Panel id="data-contract" className="xl:col-span-4" title="Instrumentation Contract" detail="Based on server-recorded impression evidence.">
            <div className="space-y-3">
              {[
                ["Inclusion Probability (Propensity)", metrics.instrumentation.propensityCoverage],
                ["Policy Score", metrics.instrumentation.scoreCoverage],
                ["Policy Version", metrics.instrumentation.modelVersionCoverage],
                ["Request Context Snapshot", metrics.instrumentation.contextCoverage],
              ].map(([label, value]) => <div key={String(label)}>
                <div className="flex justify-between gap-3 text-xs"><span className="text-white/70">{englishText(label)}</span><span className="font-semibold text-white">{englishText(percentage(value as number | null))}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#FF7376]" style={{ width: `${Math.max(0, Math.min(100, Number(value ?? 0) * 100))}%` }} /></div>
              </div>)}
            </div>
          </Panel>
          <Panel className="xl:col-span-4" title="Recommendation Learning Signals" detail="Impressions, swipes and acceptance by policy version. Small samples should not guide decisions.">
            {metrics.models.length ? <div className="space-y-3">{metrics.models.map((model) => <div key={model.version} className="rounded-xl bg-white/[0.05] p-3"><div className="flex justify-between gap-3"><span className="font-mono text-xs text-[#FFB3B5]">{englishText(model.version)}</span><span className="text-sm font-bold">Accepted {englishText(percentage(model.likeRate))}</span></div><div className="mt-2 grid grid-cols-3 text-xs text-white/60"><span>Impressions {model.impressions}</span><span>Swipes {model.swipes}</span><span>Likes {model.likes}</span></div></div>)}</div> : <Empty label="No versioned recommendation data yet." />}
          </Panel>
          <Panel className="md:col-span-2 xl:col-span-8" title="Current Policy Score Breakdown" detail={`Server-issued slates:  ${metrics.contributionSampleSize} items with average score contributions. These explain policy scoring, not the causes of user decisions.`}>
            {metrics.policyContributions.length ? <div className="h-72"><ResponsiveContainer><BarChart data={metrics.policyContributions} layout="vertical" margin={{ left: 16 }}><CartesianGrid stroke="#ffffff14" vertical={false} /><XAxis type="number" tick={{ fill: '#ffffff88', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis dataKey="factor" type="category" width={68} tick={{ fill: '#ffffffcc', fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#171717', border: '1px solid #ffffff22', borderRadius: 10 }} formatter={(value: number) => [value.toFixed(3), "Average Score Contribution"]} /><Bar dataKey="contribution" name="Contribution" fill="#F7C873" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div> : <Empty label="Score breakdowns will appear as new recommendation slates are recorded." />}
          </Panel>
          <Panel className="md:col-span-2 xl:col-span-7" title="Response by Category" detail="Observed LIKE/NOPE responses after exposure. Categories are not randomized, so these inform policy hypotheses rather than causal conclusions.">
            {metrics.categoryPerformance.length ? <><div className="h-56"><ResponsiveContainer><BarChart data={metrics.categoryPerformance} margin={{ left: -16 }}><CartesianGrid stroke="#ffffff14" vertical={false} /><XAxis dataKey="category" tick={{ fill: '#ffffff88', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} /><YAxis allowDecimals={false} tick={{ fill: '#ffffff88', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#171717', border: '1px solid #ffffff22', borderRadius: 10 }} formatter={(value: number, name: string) => [value, name === 'impressions' ? "Impressions" : name === 'decisions' ? "Decisions" : name]} /><Bar dataKey="impressions" name="impressions" fill="#86A8E7" radius={[5, 5, 0, 0]} /><Bar dataKey="decisions" name="decisions" fill="#FF7376" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{metrics.categoryPerformance.map((row) => <div key={row.category} className="rounded-lg bg-white/[0.05] px-3 py-2 text-xs"><div className="flex justify-between"><span>{englishText(row.category)}</span><span className="font-semibold">Response {englishText(percentage(row.likeRate))}</span></div><p className="mt-1 text-white/55">vs. Overall {englishText(row.responseLift === null ? "No data" : `${row.responseLift >= 0 ? '+' : ''}${(row.responseLift * 100).toFixed(1)}%p`)}  · impressions  {row.impressions}</p></div>)}</div></> : <Empty label="No category-level recommendation evidence yet." />}
          </Panel>
          <Panel className="md:col-span-2 xl:col-span-5" title="Observed Preferences" detail="Anonymous totals of final-choice categories for this period. Individual personas are not shown.">
            {metrics.personas.length ? <div className="flex h-auto flex-col sm:h-72 sm:flex-row"><div className="h-56 sm:h-full sm:w-[58%]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={metrics.personas} dataKey="decisions" nameKey="category" innerRadius={48} outerRadius={92} paddingAngle={3}>{metrics.personas.map((row, index) => <Cell key={row.category} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: '#171717', border: '1px solid #ffffff22', borderRadius: 10 }} /></PieChart></ResponsiveContainer></div><div className="grid flex-1 content-center gap-2 pb-2 text-xs text-white/75 sm:pb-0">{metrics.personas.map((row, index) => <div key={row.category} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span>{englishText(row.category)}</span><span className="ml-auto">{row.decisions} times ·  {row.selectors} people</span></div>)}</div></div> : <Empty label="No final decisions yet." />}
          </Panel>
        </section>
        <footer className="mt-6 flex items-center gap-2 text-xs text-white/40"><DatabaseZap size={14} /><span>Personal identifiers, precise locations and individual preference vectors are excluded. Last updated:  {englishText(new Date(metrics.updatedAt).toLocaleString('en-AU'))}</span></footer>
      </> : <div className="rounded-2xl bg-[#4E2528] p-5 text-sm text-[#FFB8B8]">Couldn't load operational metrics. Please try again shortly.</div>}
        </div>
      </div>
  </main>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white/[0.05] p-2"><p className="text-white/50">{englishText(label)}</p><p className="mt-1 font-semibold text-white">{englishText(value)}</p></div>;
}

function Empty({ label }: { label: string }) {
  return <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-white/15 px-5 text-center text-sm text-white/45"><BarChart3 className="mr-2 h-5 w-5" />{englishText(label)}</div>;
}
