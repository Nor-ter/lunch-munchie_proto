import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { ScrapPalette, SCRAP_PALETTES, gingham } from './scrapTheme';

const CARD_W = 270;
const CARD_H = 480;

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥'];
/** 바코드 바 폭 패턴 (고정 시퀀스) */
const BARS = [2, 1, 3, 1, 2, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 2, 3, 1, 2, 1, 1, 2];

function Squiggle({ color }: { color: string }) {
  return (
    <svg width="120" height="8" viewBox="0 0 120 8" style={{ display: 'block' }}>
      <path
        d="M2 4 Q 8 0, 14 4 T 26 4 T 38 4 T 50 4 T 62 4 T 74 4 T 86 4 T 98 4 T 110 4 T 118 4"
        fill="none"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface Props {
  course: Course;
  palette?: ScrapPalette;
}

/** 먼치 영수증 — 크레용 체크 배경 위 구겨진 영수증에 코스를 기록한다 */
const ReceiptTemplate = forwardRef<HTMLDivElement, Props>(({ course, palette }, ref) => {
  const p = palette ?? SCRAP_PALETTES.blue;
  const places = course.places.slice(0, 4);
  const dateLabel = course.date ?? new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  const ink = '#2B2B2B';

  return (
    <div
      ref={ref}
      style={{
        width: CARD_W,
        height: CARD_H,
        background: gingham(p, 18),
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Courier New', Courier, monospace",
        boxSizing: 'border-box',
      }}
    >
      {/* 배경 스티커 */}
      <span style={{ position: 'absolute', left: 8, top: 10, fontSize: 15, transform: 'rotate(-14deg)' }}>📎</span>
      <span style={{ position: 'absolute', right: 10, top: 16, fontSize: 15, transform: 'rotate(10deg)' }}>⭐</span>
      <span style={{ position: 'absolute', left: 10, bottom: 16, fontSize: 15, transform: 'rotate(8deg)' }}>🍀</span>
      <span style={{ position: 'absolute', right: 8, bottom: 24, fontSize: 16, transform: 'rotate(-8deg)' }}>🧸</span>

      {/* 영수증 */}
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 22,
          width: 190,
          background:
            'linear-gradient(115deg, rgba(0,0,0,0.035) 0%, transparent 30%), ' +
            'linear-gradient(245deg, rgba(0,0,0,0.045) 0%, transparent 26%), #FDFDFA',
          boxShadow: '0 8px 18px rgba(0,0,0,0.2)',
          transform: 'rotate(-1.4deg)',
          padding: '16px 14px 14px',
          boxSizing: 'border-box',
        }}
      >
        {/* 로고 */}
        <p
          style={{
            margin: 0,
            textAlign: 'center',
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 17,
            fontWeight: 700,
            fontStyle: 'italic',
            color: ink,
            lineHeight: 1.05,
            letterSpacing: 0.5,
          }}
        >
          Lunchie
          <br />
          Munchie
        </p>
        <p style={{ margin: '4px 0 0', textAlign: 'center', fontSize: 8, color: '#777', letterSpacing: 1 }}>
          ─── ✻ ─── {dateLabel} ─── ✻ ───
        </p>

        {/* 코스맵 이름 박스 */}
        <div
          style={{
            margin: '8px auto 0',
            border: `1px solid ${ink}`,
            padding: '3px 8px',
            textAlign: 'center',
            maxWidth: 150,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 700,
              color: ink,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {course.title}
          </p>
        </div>

        {/* RESTAURANTS */}
        <div style={{ marginTop: 10, borderTop: `1px solid ${ink}`, borderBottom: `1px solid ${ink}`, padding: '2px 0' }}>
          <p style={{ margin: 0, textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: 3, color: ink }}>
            RESTAURANTS
          </p>
        </div>
        <div style={{ marginTop: 7 }}>
          {places.map((place, i) => (
            <div key={place.id} style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: ink, flexShrink: 0 }}>{CIRCLED[i]}</span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: ink,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 96,
                }}
              >
                {place.name}
              </span>
              <span style={{ flex: 1, borderBottom: '1px dotted #999', transform: 'translateY(-2px)' }} />
              <span style={{ fontSize: 8, color: '#666', flexShrink: 0 }}>{String(i + 1).padStart(3, '0')}</span>
            </div>
          ))}
        </div>

        {/* FOODS */}
        <div style={{ marginTop: 6, borderTop: `1px solid ${ink}`, borderBottom: `1px solid ${ink}`, padding: '2px 0' }}>
          <p style={{ margin: 0, textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: 3, color: ink }}>
            FOODS
          </p>
        </div>
        <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}>
          <Squiggle color="#555" />
          <Squiggle color="#777" />
          <Squiggle color="#999" />
        </div>

        {/* 합계 라인 */}
        <div style={{ marginTop: 9, borderTop: '1px dashed #999', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: ink }}>TOTAL</span>
          <span style={{ fontSize: 8, fontWeight: 700, color: ink }}>
            {course.distanceKm}KM · {course.durationHours}H
          </span>
        </div>

        {/* 바코드 */}
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 1.5, height: 20 }}>
          {BARS.map((w, i) => (
            <span key={i} style={{ width: w, height: i % 4 === 0 ? 20 : 16, background: ink, display: 'inline-block' }} />
          ))}
        </div>

        <p style={{ margin: '7px 0 0', textAlign: 'center', fontSize: 8, fontWeight: 700, color: ink, letterSpacing: 1 }}>
          THANK YOU!
        </p>
        <p style={{ margin: '1px 0 0', textAlign: 'center', fontSize: 7, color: '#777', letterSpacing: 0.5 }}>
          SEE YOU AGAIN SOON!
        </p>
      </div>
    </div>
  );
});

ReceiptTemplate.displayName = 'ReceiptTemplate';
export default ReceiptTemplate;
