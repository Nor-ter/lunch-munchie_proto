// 운영용 이벤트 대시보드. 원본 이벤트가 아닌 D1 집계만 표시한다.
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Daily = { day: string; [eventType: string]: string | number };
type Metrics = {
  days: number;
  total: number;
  byType: Record<string, number>;
  daily: Daily[];
  updatedAt: string;
};

const TYPE_STYLE: Record<string, { label: string; color: string }> = {
  IMPRESSION: { label: '추천 노출', color: '#4F83D9' },
  SWIPE: { label: '스와이프', color: '#6C9AE1' },
  WINNER: { label: '결정 완료', color: '#93B4EA' },
  NAVIGATE: { label: '상세·길찾기', color: '#B2C9EF' },
  COURSE_OPEN: { label: '코스 열람', color: '#7A70C8' },
  COURSE_SAVE: { label: '코스 저장', color: '#A49EE0' },
  FEED_LIKE: { label: '피드 좋아요', color: '#5DBD91' },
  REROLL: { label: '다시 고르기', color: '#E6A45B' },
  ABANDON: { label: '중도 이탈', color: '#E26D70' },
};
const fallbackStyle = (type: string) => ({ label: type, color: '#9CA3AF' });
const labelDay = (day: string) => {
  const [, month, date] = day.split('-');
  return `${Number(month)}월 ${Number(date)}일`;
};
const metricLabel = (type: string) => (TYPE_STYLE[type] ?? fallbackStyle(type)).label;

export default function MetricsPage() {
  const [period, setPeriod] = useState<7 | 30 | 365>(30);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    fetch(`/api/metrics?days=${period}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then((data: Metrics) => { if (active) setMetrics(data); })
      .catch(() => { if (active) setError('서버 집계를 불러오지 못했습니다.'); });
    return () => { active = false; };
  }, [period]);

  const eventTypes = useMemo(() => Object.keys(metrics?.byType ?? {}).sort((a, b) => (metrics?.byType[b] ?? 0) - (metrics?.byType[a] ?? 0)), [metrics]);
  const totalDecisions = metrics?.byType.WINNER ?? 0;

  return (
    <main className="min-h-dvh bg-[#171717] px-4 py-8 text-[#E6E4E1] sm:px-8">
      <section className="mx-auto max-w-[960px] rounded-[18px] border border-[#303030] bg-[#242424] p-5 shadow-2xl sm:p-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold tracking-tight">Overview</h1>
            <span className="rounded-md bg-[#3A3A3A] px-3 py-1 text-[17px] text-white">Events</span>
          </div>
          <div className="flex rounded-lg bg-[#2E2E2E] p-1 text-[15px] text-[#BEBBB7]">
            {([365, 30, 7] as const).map((value) => (
              <button key={value} onClick={() => setPeriod(value)} className={`rounded-md px-3 py-1.5 transition ${period === value ? 'bg-[#444444] text-white' : 'hover:text-white'}`}>
                {value === 365 ? 'All' : `${value}d`}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="rounded-lg bg-[#4E2528] px-4 py-3 text-sm text-[#FFB8B8]">{error}</p>}
        {!metrics && !error && <p className="py-24 text-center text-[#A6A29D]">D1 이벤트 집계를 불러오는 중…</p>}
        {metrics && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Summary label="수집 이벤트" value={String(metrics.total)} />
              <Summary label="결정 완료" value={String(totalDecisions)} />
              <Summary label="노출" value={String(metrics.byType.IMPRESSION ?? 0)} />
              <Summary label="활성 일수" value={String(metrics.daily.filter((day) => Object.keys(day).some((key) => key !== 'day' && Number(day[key]) > 0)).length)} />
            </div>

            <div className="h-[330px] w-full">
              <ResponsiveContainer>
                <BarChart data={metrics.daily} margin={{ top: 12, right: 4, left: -20, bottom: 0 }} barCategoryGap="22%">
                  <XAxis dataKey="day" tickFormatter={labelDay} tickLine={false} axisLine={false} tick={{ fill: '#BEBBB7', fontSize: 12 }} minTickGap={28} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#BEBBB7', fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: '#303030' }}
                    contentStyle={{ background: '#333333', border: '1px solid #555', borderRadius: 8, color: '#fff' }}
                    labelFormatter={labelDay}
                    formatter={(value: number, name: string) => [value, metricLabel(name)]}
                  />
                  {eventTypes.map((type) => <Bar key={type} dataKey={type} stackId="events" fill={(TYPE_STYLE[type] ?? fallbackStyle(type)).color} radius={[4, 4, 0, 0]} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {eventTypes.length > 0 ? (
              <div className="mt-5 space-y-2">
                {eventTypes.map((type) => {
                  const style = TYPE_STYLE[type] ?? fallbackStyle(type);
                  const count = metrics.byType[type];
                  return <div key={type} className="flex items-center gap-2 text-[15px] text-[#DDDAD5]">
                    <span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: style.color }} />
                    <span>{style.label}</span>
                    <span className="ml-auto tabular-nums text-[#A6A29D]">{count}건 · {metrics.total ? ((count / metrics.total) * 100).toFixed(1) : '0.0'}%</span>
                  </div>;
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-[#4A4A4A] p-8 text-center text-sm text-[#A6A29D]">아직 수집된 이벤트가 없습니다. 런치 모드에서 추천을 보고 결정을 완료하면 여기에 실제 데이터가 쌓입니다.</div>
            )}
            <p className="mt-6 text-right text-[11px] text-[#8E8A85]">D1 원본 이벤트 집계 · 마지막 조회 {new Date(metrics.updatedAt).toLocaleString('ko-KR')}</p>
          </>
        )}
      </section>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#2D2D2D] p-4"><div className="text-xs text-[#AAA6A1]">{label}</div><div className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</div></div>;
}
