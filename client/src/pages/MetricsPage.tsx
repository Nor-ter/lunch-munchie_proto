// 런치 엔진 지표 대시보드 (내부용, dev)
// rec_events 집계를 recharts로 가시화 — 파이프라인 동작 확인 + 검증 기반.
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Metrics {
  total: number;
  byType: Record<string, number>;
  bySlate: Record<string, number>;
  swipes: { like: number; nope: number; acceptance: number | null };
  duels: number;
  impressions: number;
  avgPropensity: number | null;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#FBF1F1] rounded-xl p-4">
      <div className="text-[12px] text-[#6E6E6E]">{label}</div>
      <div className="text-[24px] font-bold text-[#1A1A1A] mt-1">{value}</div>
    </div>
  );
}

export default function MetricsPage() {
  const [m, setM] = useState<Metrics | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/metrics')
        .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
        .then(d => { if (alive) setM(d); })
        .catch(e => { if (alive) setErr(String(e)); });
    load();
    const iv = setInterval(load, 4000); // 라이브 새로고침
    return () => { alive = false; clearInterval(iv); };
  }, []);

  if (err) return <div className="p-6 text-[#EB5053]">지표 로드 실패: {err}</div>;
  if (!m) return <div className="p-6 text-[#6E6E6E]">불러오는 중…</div>;

  const typeData = Object.entries(m.byType).map(([name, value]) => ({ name, value }));
  const slateData = Object.entries(m.bySlate).map(([name, value]) => ({ name, value }));

  return (
    <div className="min-h-dvh bg-white p-5 max-w-[760px] mx-auto">
      <h1 className="text-[20px] font-bold text-[#1A1A1A] mb-1">엔진 지표 (dev)</h1>
      <p className="text-[12px] text-[#6E6E6E] mb-4">현재 서버 세션의 rec_events 집계 · 4초마다 새로고침</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="총 이벤트" value={String(m.total)} />
        <StatCard label="스와이프 수락률" value={m.swipes.acceptance != null ? Math.round(m.swipes.acceptance * 100) + '%' : '—'} />
        <StatCard label="노출(impression)" value={String(m.impressions)} />
        <StatCard label="듀얼(CHOOSE)" value={String(m.duels)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="좋아요" value={String(m.swipes.like)} />
        <StatCard label="싫어요" value={String(m.swipes.nope)} />
        <StatCard label="평균 propensity" value={m.avgPropensity != null ? m.avgPropensity.toFixed(3) : '—'} />
      </div>

      <h2 className="text-[14px] font-semibold text-[#1A1A1A] mb-2">이벤트 타입 분포</h2>
      <div style={{ width: '100%', height: 220 }} className="mb-6">
        <ResponsiveContainer>
          <BarChart data={typeData}>
            <XAxis dataKey="name" fontSize={11} />
            <YAxis allowDecimals={false} fontSize={11} />
            <Tooltip />
            <Bar dataKey="value" fill="#EB5053" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h2 className="text-[14px] font-semibold text-[#1A1A1A] mb-2">슬레이트 타입 (PRELIM vs FINAL)</h2>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <BarChart data={slateData}>
            <XAxis dataKey="name" fontSize={11} />
            <YAxis allowDecimals={false} fontSize={11} />
            <Tooltip />
            <Bar dataKey="value" fill="#F09D09" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
