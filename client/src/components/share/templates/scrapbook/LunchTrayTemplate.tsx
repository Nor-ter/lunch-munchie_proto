import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { ScrapPalette, SCRAP_PALETTES, gingham, photoFallback } from './scrapTheme';

const CARD_W = 270;
const CARD_H = 480;

/** "What I ate today" 스티커 레터링 색 */
const TITLE_COLORS = ['#E85053', '#3E719B', '#DB9000', '#2E8F35', '#C77DC4', '#E85053'];
const OUTLINE =
  '2px 0 #FFF, -2px 0 #FFF, 0 2px #FFF, 0 -2px #FFF, 1.5px 1.5px #FFF, -1.5px -1.5px #FFF, 1.5px -1.5px #FFF, -1.5px 1.5px #FFF, 0 3px 4px rgba(0,0,0,0.18)';

function StickerWord({ word, italic = false, size = 24 }: { word: string; italic?: boolean; size?: number }) {
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      {word.split('').map((ch, i) => (
        <span
          key={i}
          style={{
            fontSize: size,
            fontWeight: 900,
            fontStyle: italic ? 'italic' : 'normal',
            color: TITLE_COLORS[i % TITLE_COLORS.length],
            textShadow: OUTLINE,
            letterSpacing: 1,
            display: 'inline-block',
            transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 3}deg)`,
          }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

/** 식판 칸 하나 */
function TrayCell({
  place,
  palette,
  index,
  style,
}: {
  place?: Course['places'][number];
  palette: ScrapPalette;
  index: number;
  style: React.CSSProperties;
}) {
  return (
    <div
      style={{
        borderRadius: 12,
        background: 'linear-gradient(150deg, #C6C8CC 0%, #E9EAEC 55%, #C9CBCF 100%)',
        boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.28), inset 0 -1px 2px rgba(255,255,255,0.7)',
        padding: 3,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div style={{ width: '100%', height: '100%', borderRadius: 9, overflow: 'hidden', position: 'relative' }}>
        {place ? (
          place.imageUrl ? (
            <img
              src={place.imageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              crossOrigin="anonymous"
            />
          ) : (
            <div style={{ ...photoFallback(palette), fontSize: 20 }}>🍽️</div>
          )
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(150deg, #D4D6DA, #E6E7E9)' }} />
        )}
        {place && (
          <>
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: 3,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: palette.accent,
                color: '#FFF',
                fontSize: 8,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {index + 1}
            </span>
            <span
              style={{
                position: 'absolute',
                left: 3,
                right: 3,
                bottom: 3,
                background: 'rgba(255,255,255,0.88)',
                borderRadius: 4,
                fontSize: 7,
                fontWeight: 700,
                color: palette.deep,
                padding: '1px 3px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'center',
              }}
            >
              {place.name}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

interface Props {
  course: Course;
  palette?: ScrapPalette;
}

/** 먼치트레이 — "What I ate today" 스테인리스 식판에 스팟 사진을 담는다 */
const LunchTrayTemplate = forwardRef<HTMLDivElement, Props>(({ course, palette }, ref) => {
  const p = palette ?? SCRAP_PALETTES.pink;
  const places = course.places.slice(0, 3);
  const dateLabel = course.date ?? new Date().toISOString().slice(0, 10).replace(/-/g, '.');

  return (
    <div
      ref={ref}
      style={{
        width: CARD_W,
        height: CARD_H,
        background: gingham(p, 16),
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Baloo 2', 'Pretendard Variable', 'Pretendard', cursive",
        boxSizing: 'border-box',
      }}
    >
      {/* 콜라주 스티커 */}
      <span style={{ position: 'absolute', left: 10, top: 12, fontSize: 18, transform: 'rotate(-12deg)' }}>🍒</span>
      <span style={{ position: 'absolute', right: 12, top: 30, fontSize: 16, transform: 'rotate(9deg)' }}>📷</span>
      <span style={{ position: 'absolute', left: 14, top: 106, fontSize: 14, transform: 'rotate(6deg)' }}>🌼</span>
      <span style={{ position: 'absolute', right: 10, bottom: 88, fontSize: 16, transform: 'rotate(-8deg)' }}>🧸</span>
      <span style={{ position: 'absolute', left: 8, bottom: 60, fontSize: 15, transform: 'rotate(10deg)' }}>💌</span>

      {/* 타이틀 레터링 */}
      <div style={{ textAlign: 'center', paddingTop: 22, position: 'relative', zIndex: 2 }}>
        <div>
          <StickerWord word="What" size={26} />
          <span style={{ display: 'inline-block', width: 8 }} />
          <StickerWord word="I" size={26} />
        </div>
        <div style={{ marginTop: 2 }}>
          <StickerWord word="ate" italic size={30} />
          <span style={{ display: 'inline-block', width: 10 }} />
          <StickerWord word="today" italic size={30} />
        </div>
        <p
          style={{
            margin: '8px 0 0',
            fontSize: 9,
            fontWeight: 800,
            color: p.deep,
            letterSpacing: 2,
            textShadow: '1px 1px 0 rgba(255,255,255,0.9)',
          }}
        >
          {dateLabel} · {course.title}
        </p>
      </div>

      {/* 스테인리스 식판 */}
      <div
        style={{
          position: 'absolute',
          left: 20,
          top: 140,
          width: 230,
          height: 236,
          borderRadius: 20,
          background: 'linear-gradient(145deg, #EDEEF0 0%, #C7C9CD 45%, #E4E5E8 100%)',
          border: '1px solid #B4B6BA',
          boxShadow: '0 10px 22px rgba(0,0,0,0.22), inset 0 1px 2px rgba(255,255,255,0.9)',
          padding: 10,
          boxSizing: 'border-box',
        }}
      >
        {/* 위 3칸 */}
        <div style={{ display: 'flex', gap: 8, height: 86 }}>
          <TrayCell place={places[0]} palette={p} index={0} style={{ flex: 1 }} />
          <TrayCell place={places[1]} palette={p} index={1} style={{ flex: 1 }} />
          <TrayCell place={places[2]} palette={p} index={2} style={{ flex: 1 }} />
        </div>
        {/* 아래 2칸 (한 칸 크게) */}
        <div style={{ display: 'flex', gap: 8, height: 118, marginTop: 8 }}>
          <TrayCell place={places[3]} palette={p} index={3} style={{ width: 84 }} />
          <TrayCell place={places[4]} palette={p} index={4} style={{ flex: 1 }} />
        </div>
        {/* YUM 스티커 */}
        <span
          style={{
            position: 'absolute',
            right: -10,
            top: -12,
            background: p.accent,
            color: '#FFF',
            fontSize: 10,
            fontWeight: 900,
            padding: '4px 8px',
            borderRadius: 999,
            transform: 'rotate(8deg)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          }}
        >
          YUM!
        </span>
      </div>

      {/* 하단 스탯 + 로고 */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 14, textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: 999,
            border: `1px solid ${p.check}`,
            padding: '4px 12px',
            fontSize: 9,
            fontWeight: 800,
            color: p.deep,
          }}
        >
          {course.distanceKm}km · {course.durationHours}h · {course.places.length} spots
        </div>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 8,
            fontWeight: 900,
            letterSpacing: 2,
            color: p.accent,
            textShadow: '0.5px 0.5px 0 rgba(255,255,255,0.9)',
          }}
        >
          LUNCHIE MUNCHIE
        </p>
      </div>
    </div>
  );
});

LunchTrayTemplate.displayName = 'LunchTrayTemplate';
export default LunchTrayTemplate;
