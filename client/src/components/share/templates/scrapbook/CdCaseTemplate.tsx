import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { ScrapPalette, SCRAP_PALETTES, gingham, photoFallback } from './scrapTheme';

const CARD_W = 270;
const CARD_H = 480;

/** 스파인 글자 색 순환 (스티커 레터링 느낌) */
const LETTER_COLORS = ['#E85053', '#DB9000', '#3E719B', '#2E8F35', '#C77DC4'];

/** 폴라로이드 배치 (디스크 주변, 회전 각도) */
const POLAROID_POS = [
  { left: 18, top: 12, rotate: -9 },
  { left: 118, top: 26, rotate: 7 },
  { left: 30, top: 106, rotate: 5 },
  { left: 126, top: 118, rotate: -6 },
];

interface Props {
  course: Course;
  palette?: ScrapPalette;
}

/** 포토카드 CD 케이스 — 깅엄 패브릭 위 쥬얼 케이스에 스팟 폴라로이드를 담는다 */
const CdCaseTemplate = forwardRef<HTMLDivElement, Props>(({ course, palette }, ref) => {
  const p = palette ?? SCRAP_PALETTES.pink;
  const photos = course.places.slice(0, 4);
  const dateLabel = course.date ?? new Date().toISOString().slice(0, 10).replace(/-/g, '/');

  return (
    <div
      ref={ref}
      style={{
        width: CARD_W,
        height: CARD_H,
        background: gingham(p, 15),
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Baloo 2', 'Pretendard Variable', 'Pretendard', cursive",
        boxSizing: 'border-box',
      }}
    >
      {/* 스파인 세로 레터링 */}
      <div
        style={{
          position: 'absolute',
          left: 8,
          top: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          zIndex: 2,
        }}
      >
        {'LUNCHIE MUNCHIE'.split('').map((ch, i) => (
          <span
            key={i}
            style={{
              fontSize: 9,
              fontWeight: 900,
              lineHeight: '10px',
              textAlign: 'center',
              color: ch === ' ' ? 'transparent' : LETTER_COLORS[i % LETTER_COLORS.length],
              textShadow: '0.5px 0.5px 0 rgba(255,255,255,0.9)',
            }}
          >
            {ch === ' ' ? '·' : ch}
          </span>
        ))}
      </div>

      {/* 쥬얼 케이스 */}
      <div
        style={{
          position: 'absolute',
          left: 30,
          top: 34,
          width: 218,
          height: 218,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.42)',
          border: '1.5px solid rgba(255,255,255,0.95)',
          boxShadow: '0 8px 20px rgba(0,0,0,0.14), inset 0 0 0 5px rgba(255,255,255,0.28)',
        }}
      >
        {/* 디스크 */}
        <div
          style={{
            position: 'absolute',
            left: 14,
            top: 14,
            width: 190,
            height: 190,
            borderRadius: '50%',
            background: `radial-gradient(circle at 38% 32%, ${p.paper} 0%, ${p.checkBase} 45%, ${p.check} 100%)`,
            border: `1px solid ${p.check}`,
            boxShadow: 'inset 0 0 14px rgba(255,255,255,0.8)',
          }}
        >
          {/* 센터 홀 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 34,
              height: 34,
              marginLeft: -17,
              marginTop: -17,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.92)',
              border: `2px solid ${p.check}`,
              zIndex: 3,
            }}
          />
          {/* 폴라로이드 4장 */}
          {POLAROID_POS.map((pos, i) => {
            const place = photos[i];
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: pos.left - 14,
                  top: pos.top - 14,
                  width: 62,
                  background: '#FFFFFF',
                  padding: '4px 4px 12px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                  transform: `rotate(${pos.rotate}deg)`,
                  borderRadius: 2,
                  zIndex: 2,
                }}
              >
                {/* 테이프 */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: -5,
                    width: 26,
                    height: 9,
                    marginLeft: -13,
                    background: 'rgba(255,255,255,0.6)',
                    border: '0.5px solid rgba(0,0,0,0.06)',
                    transform: 'rotate(-3deg)',
                  }}
                />
                <div style={{ width: '100%', height: 46, overflow: 'hidden' }}>
                  {place?.imageUrl ? (
                    <img
                      src={place.imageUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div style={{ ...photoFallback(p), fontSize: 16 }}>{place ? '🍽️' : '📷'}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* 코너 스티커 */}
        <span style={{ position: 'absolute', right: -6, top: -8, fontSize: 16 }}>🌸</span>
        <span style={{ position: 'absolute', left: -6, bottom: -6, fontSize: 14 }}>🧸</span>
        <span style={{ position: 'absolute', right: 6, bottom: 10, fontSize: 13 }}>✨</span>
      </div>

      {/* 하단 정보 */}
      <div style={{ position: 'absolute', left: 24, right: 16, top: 272, textAlign: 'center' }}>
        <p
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 900,
            color: p.deep,
            lineHeight: 1.2,
            textShadow: '1px 1px 0 rgba(255,255,255,0.85)',
          }}
        >
          {course.title}
        </p>
        <div
          style={{
            marginTop: 6,
            display: 'inline-block',
            background: 'rgba(255,255,255,0.85)',
            border: `1px solid ${p.check}`,
            borderRadius: 999,
            padding: '2px 10px',
            fontSize: 8,
            fontWeight: 700,
            color: p.accent,
            letterSpacing: 1,
          }}
        >
          {dateLabel} · {course.distanceKm}km · {course.places.length} SPOTS
        </div>

        {/* 트랙리스트처럼 스팟 나열 */}
        <div style={{ marginTop: 10, textAlign: 'left' }}>
          {course.places.slice(0, 4).map((place, i) => (
            <div
              key={place.id}
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: p.accent,
                  color: '#FFF',
                  fontSize: 8,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: p.deep,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                  background: 'rgba(255,255,255,0.65)',
                  borderRadius: 4,
                  padding: '1px 6px',
                }}
              >
                {place.name}
              </span>
              {place.time && (
                <span style={{ fontSize: 8, color: p.accent, fontWeight: 700 }}>{place.time}</span>
              )}
            </div>
          ))}
          {course.places.length > 4 && (
            <p style={{ margin: 0, fontSize: 8, color: p.accent, textAlign: 'center' }}>
              +{course.places.length - 4} more
            </p>
          )}
        </div>
      </div>

      {/* 푸터 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 10,
          textAlign: 'center',
          fontSize: 8,
          fontWeight: 900,
          letterSpacing: 2,
          color: p.accent,
          textShadow: '0.5px 0.5px 0 rgba(255,255,255,0.9)',
        }}
      >
        ♡ LUNCHIE MUNCHIE ♡
      </div>
    </div>
  );
});

CdCaseTemplate.displayName = 'CdCaseTemplate';
export default CdCaseTemplate;
