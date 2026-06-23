// 런치 엔진 지표 대시보드 (내부용, dev)
// rec_events 집계 + 최근 이벤트 원본을 recharts/표로 가시화.
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface RecentEvent {
  ts: string; user_id: string | null; event_type: string | null; slate_type: string | null; action: string | null;
  restaurant_id: string | null; position: number | null; propensity: number | null;
  round: number | null; variant: string | null; session_id: string | null;
}
interface DataHealth {
  essential: { key: string; label: string; coverage: number | null; n: number }[];
  slateJoin: { matched: number; total: number; rate: number | null };
  contextCoverage: { key: string; coverage: number | null; n: number }[];
  funnel: { stage: string; count: number }[];
  volume: { total: number; sessions: number; eventsPerSession: number | null; lastEventTs: string | null };
}
interface Metrics {
  total: number;
  dataHealth: DataHealth;
  byType: Record<string, number>;
  bySlate: Record<string, number>;
  byAction: Record<string, number>;
  byVariant: Record<string, number>;
  byRound: Record<string, number>;
  swipes: { like: number; nope: number; acceptance: number | null };
  duels: number; impressions: number; navigate: number; winner: number; reroll: number;
  avgPropensity: number | null; avgPosition: number | null; avgDwellMs: number | null;
  acceptanceByPosition: { position: number; acceptance: number; n: number }[];
  acceptanceByVariant: { variant: string; acceptance: number; n: number }[];
  userAcceptanceDist: { range: string; users: number }[];
  userSummary: { users: number; median: number | null; p10: number | null; p90: number | null };
  acceptanceByTime: { bucket: string; acceptance: number; n: number }[];
  recent: RecentEvent[];
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#FBF1F1] rounded-xl p-3">
      <div className="text-[11px] text-[#6E6E6E]">{label}</div>
      <div className="text-[20px] font-bold text-[#1A1A1A] mt-0.5">{value}</div>
    </div>
  );
}
function Chart({ title, data, color }: { title: string; data: { name: string; value: number }[]; color: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-2">{title}</h2>
      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="name" fontSize={10} />
            <YAxis allowDecimals={false} fontSize={10} width={28} />
            <Tooltip />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
const toData = (o: Record<string, number>) => Object.entries(o).map(([name, value]) => ({ name, value }));

// ── Tier 0: 데이터 신뢰성 표시용 헬퍼 ──────────────────────────────
const covColor = (c: number | null) =>
  c == null ? '#C9C2BA' : c >= 0.9 ? '#3CBA44' : c >= 0.5 ? '#F09D09' : '#EB5053';
const freshness = (iso: string | null) => {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return Math.round(ms / 1000) + '초 전';
  if (ms < 3600000) return Math.round(ms / 60000) + '분 전';
  return Math.round(ms / 3600000) + '시간 전';
};
const CTX_LABEL: Record<string, string> = {
  time_of_day: '시간대', day_of_week: '요일', weather: '날씨',
  minutes_since_meal: '식후 경과', companions: '동행', city: '도시', diet: 'diet',
};
function CovBar({ label, coverage, n }: { label: string; coverage: number | null; n: number }) {
  const pct = coverage != null ? Math.round(coverage * 100) : null;
  const color = covColor(coverage);
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <div className="w-[150px] text-[11px] text-[#4A4A4A] shrink-0 truncate">{label}</div>
      <div className="flex-1 h-[14px] bg-[#F1EFE8] rounded overflow-hidden">
        <div style={{ width: (pct ?? 0) + '%', background: color }} className="h-full rounded transition-all" />
      </div>
      <div className="w-[84px] text-right text-[11px] tabular-nums shrink-0" style={{ color }}>
        {pct != null ? pct + '%' : '—'} <span className="text-[#9A9A9A]">n={n}</span>
      </div>
    </div>
  );
}
function Funnel({ stages }: { stages: { stage: string; count: number }[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  return (
    <div className="space-y-1">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1].count : null;
        const conv = prev ? Math.round((s.count / prev) * 100) : null;
        return (
          <div key={s.stage} className="flex items-center gap-2">
            <div className="w-[52px] text-[11px] text-[#4A4A4A] shrink-0">{s.stage}</div>
            <div className="flex-1 h-[18px] bg-[#F1EFE8] rounded overflow-hidden">
              <div style={{ width: Math.max(2, (s.count / max) * 100) + '%' }} className="h-full bg-[#3E719B] rounded" />
            </div>
            <div className="w-[96px] text-right text-[11px] tabular-nums shrink-0 text-[#1A1A1A]">
              {s.count}{conv != null && <span className="text-[#9A9A9A]"> · {conv}%↓</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MetricsPage() {
  const [m, setM] = useState<Metrics | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => fetch('/api/metrics')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(d => { if (alive) setM(d); }).catch(e => { if (alive) setErr(String(e)); });
    load(); const iv = setInterval(load, 4000);
    return () => { alive = false; clearInterval(iv); };
  }, []);
  if (err) return <div className="p-6 text-[#EB5053]">지표 로드 실패: {err}</div>;
  if (!m) return <div className="p-6 text-[#6E6E6E]">불러오는 중…</div>;

  const pct = (x: number | null) => (x != null ? Math.round(x * 100) + '%' : '—');
  const num = (x: number | null, d = 2) => (x != null ? x.toFixed(d) : '—');

  return (
    <div className="min-h-dvh bg-white p-5 max-w-[820px] mx-auto pb-24">
      <h1 className="text-[20px] font-bold text-[#1A1A1A] mb-1">엔진 지표 (dev)</h1>
      <p className="text-[12px] text-[#6E6E6E] mb-4">현재 서버 세션의 rec_events 전체 집계 · 4초 라이브</p>

      {/* ── Tier 0: 데이터 신뢰성 — 모든 분석의 전제 ── */}
      <section className="mb-6 rounded-xl border border-[#E7E1DA] p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[14px] font-bold text-[#1A1A1A]">데이터 신뢰성 (Tier 0)</h2>
          <span className="text-[11px] text-[#6E6E6E]">분석 가능한 데이터인가 — 위층 지표의 전제</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          <Stat label="총 이벤트" value={String(m.dataHealth.volume.total)} />
          <Stat label="세션 수" value={String(m.dataHealth.volume.sessions)} />
          <Stat label="세션당 이벤트" value={num(m.dataHealth.volume.eventsPerSession, 1)} />
          <Stat label="마지막 이벤트" value={freshness(m.dataHealth.volume.lastEventTs)} />
        </div>

        <div className="text-[12px] font-semibold text-[#1A1A1A] mb-2">4대 필수 로그 커버리지</div>
        {m.dataHealth.essential.map((f) => (
          <CovBar key={f.key} label={f.label} coverage={f.coverage} n={f.n} />
        ))}

        <div className="mt-3 flex items-center justify-between text-[12px] border-t border-[#F1EFE8] pt-3">
          <span className="text-[#6E6E6E]">slate join 무결성 <span className="text-[#9A9A9A]">(스와이프→노출 매칭)</span></span>
          <span className="font-semibold tabular-nums" style={{ color: covColor(m.dataHealth.slateJoin.rate) }}>
            {m.dataHealth.slateJoin.rate != null ? Math.round(m.dataHealth.slateJoin.rate * 100) + '%' : '—'}
            <span className="text-[#9A9A9A] font-normal"> ({m.dataHealth.slateJoin.matched}/{m.dataHealth.slateJoin.total})</span>
          </span>
        </div>

        <div className="text-[12px] font-semibold text-[#1A1A1A] mt-4 mb-2">
          맥락 스냅샷 커버리지 <span className="font-normal text-[#9A9A9A]">— 0%면 그 맥락 분석 불가</span>
        </div>
        {m.dataHealth.contextCoverage.map((f) => (
          <CovBar key={f.key} label={CTX_LABEL[f.key] ?? f.key} coverage={f.coverage} n={f.n} />
        ))}

        <div className="text-[12px] font-semibold text-[#1A1A1A] mt-4 mb-2">계측 퍼널 <span className="font-normal text-[#9A9A9A]">(전환·누락)</span></div>
        <Funnel stages={m.dataHealth.funnel} />
      </section>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-3">
        <Stat label="총 이벤트" value={String(m.total)} />
        <Stat label="수락률" value={pct(m.swipes.acceptance)} />
        <Stat label="노출" value={String(m.impressions)} />
        <Stat label="듀얼" value={String(m.duels)} />
        <Stat label="좋아요" value={String(m.swipes.like)} />
        <Stat label="싫어요" value={String(m.swipes.nope)} />
        <Stat label="길찾기" value={String(m.navigate)} />
        <Stat label="우승" value={String(m.winner)} />
        <Stat label="다시하기" value={String(m.reroll)} />
        <Stat label="avg propensity" value={num(m.avgPropensity, 3)} />
        <Stat label="avg position" value={num(m.avgPosition, 1)} />
        <Stat label="avg dwell(ms)" value={num(m.avgDwellMs, 0)} />
      </div>

      <div className="mt-2 mb-1 p-3 rounded-lg bg-[#FFF5F2]">
        <div className="text-[13px] font-semibold text-[#D83A3D]">조건별 수락률 (%) — 어떤 조건에서 달라지나</div>
        <div className="text-[11px] text-[#6E6E6E] mt-0.5">flat 집계가 아니라 조건별로 분해해야 의미가 생긴다. (표본 적으면 노이즈)</div>
      </div>
      <Chart title="수락률 × 노출 위치 (포지션 편향 점검)" data={m.acceptanceByPosition.map(d => ({ name: 'pos ' + d.position, value: Math.round(d.acceptance * 100) }))} color="#3E719B" />
      <Chart title="수락률 × A/B 변형" data={m.acceptanceByVariant.map(d => ({ name: d.variant + ' (n=' + d.n + ')', value: Math.round(d.acceptance * 100) }))} color="#7F77DD" />
      <div className="mb-5">
        <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-1">유저 수락률 분포 (누가 잘 수락하나)</h2>
        <p className="text-[11px] text-[#6E6E6E] mb-2">
          {m.userSummary.users > 0
            ? `유효 유저 ${m.userSummary.users}명 · 중앙값 ${pct(m.userSummary.median)} · p10 ${pct(m.userSummary.p10)} · p90 ${pct(m.userSummary.p90)}`
            : '유효 유저 없음 (스와이프 3회 이상 유저 기준) — 유저별 나열 대신 분포로 압축(10만 유저도 막대 5개)'}
        </p>
        <div style={{ width: '100%', height: 160 }}>
          <ResponsiveContainer>
            <BarChart data={m.userAcceptanceDist}>
              <XAxis dataKey="range" fontSize={10} />
              <YAxis allowDecimals={false} fontSize={10} width={28} />
              <Tooltip />
              <Bar dataKey="users" fill="#1D9E75" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <Chart title="수락률 × 시간대" data={m.acceptanceByTime.map(d => ({ name: d.bucket + ' (n=' + d.n + ')', value: Math.round(d.acceptance * 100) }))} color="#D85A30" />

      <div className="text-[13px] font-semibold text-[#1A1A1A] mt-3 mb-1">원자료 분포</div>
      <Chart title="이벤트 타입" data={toData(m.byType)} color="#EB5053" />
      <Chart title="액션 (LIKE/NOPE/CHOOSE)" data={toData(m.byAction)} color="#3CBA44" />
      <Chart title="슬레이트 타입 (PRELIM/FINAL)" data={toData(m.bySlate)} color="#F09D09" />
      {Object.keys(m.byVariant).length > 0 && <Chart title="A/B 변형" data={toData(m.byVariant)} color="#3E719B" />}
      {Object.keys(m.byRound).length > 0 && <Chart title="라운드" data={toData(m.byRound)} color="#7F77DD" />}

      <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-2 mt-2">최근 이벤트 (원본, 최신순)</h2>
      <div className="overflow-x-auto border border-[#E7E1DA] rounded-lg">
        <table className="w-full text-[11px]" style={{ minWidth: 720 }}>
          <thead>
            <tr className="bg-[#FBF1F1] text-[#6E6E6E] text-left">
              {['시각', 'user', 'type', 'slate', 'action', 'restaurant', 'pos', 'propensity', 'round', 'variant'].map(h => (
                <th key={h} className="px-2 py-1.5 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.recent.map((e, i) => (
              <tr key={i} className="border-t border-[#F1EFE8] text-[#1A1A1A]">
                <td className="px-2 py-1 whitespace-nowrap">{e.ts ? e.ts.slice(11, 19) : ''}</td>
                <td className="px-2 py-1">{e.user_id ? e.user_id.slice(0, 8) : ''}</td>
                <td className="px-2 py-1">{e.event_type}</td>
                <td className="px-2 py-1">{e.slate_type ?? ''}</td>
                <td className="px-2 py-1">{e.action ?? ''}</td>
                <td className="px-2 py-1">{e.restaurant_id ?? ''}</td>
                <td className="px-2 py-1">{e.position ?? ''}</td>
                <td className="px-2 py-1">{e.propensity ?? ''}</td>
                <td className="px-2 py-1">{e.round ?? ''}</td>
                <td className="px-2 py-1">{e.variant ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
