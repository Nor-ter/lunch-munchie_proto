import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { ScrapPalette, SCRAP_PALETTES, photoFallback } from './scrapTheme';

const CARD_W = 270;
const CARD_H = 480;

interface Props {
  course: Course;
  palette?: ScrapPalette;
}

/** 캡처링 모먼츠 — 코르크 보드에 핀으로 꽂힌 빈티지 티켓, 오벌 슬롯에 스팟 사진 */
const TicketTemplate = forwardRef<HTMLDivElement, Props>(({ course, palette }, ref) => {
  const p = palette ?? SCRAP_PALETTES.vintage;
  const places = course.places.slice(0, 4);
  const dateLabel = course.date ?? new Date().toISOString().slice(0, 10).replace(/-/g, '/');

  return (
    <div
      ref={ref}
      style={{
        width: CARD_W,
        height: CARD_H,
        // 벽지: 딥톤 + 은은한 다마스크 느낌의 사선 패턴
        background:
          `repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 3px, transparent 3px 14px), ` +
          `linear-gradient(160deg, ${p.deep} 0%, ${p.accent} 130%)`,
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "Georgia, 'Times New Roman', 'Nanum Myeongjo', serif",
        boxSizing: 'border-box',
        padding: 14,
      }}
    >
      {/* 액자 프레임 + 코르크 보드 */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 6,
          border: '5px solid #8A5A3B',
          boxShadow: 'inset 0 0 0 1.5px #C9A227, 0 6px 16px rgba(0,0,0,0.35)',
          background:
            `repeating-linear-gradient(90deg, rgba(120,78,45,0.12) 0 2px, transparent 2px 7px), ` +
            `linear-gradient(150deg, #CBA070 0%, #B8895B 100%)`,
          position: 'relative',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* 티켓 */}
        <div
          style={{
            width: 168,
            background: p.paper,
            borderRadius: 8,
            border: `1.5px dashed ${p.accent}66`,
            boxShadow: '0 5px 12px rgba(0,0,0,0.3)',
            padding: '14px 12px 10px',
            position: 'relative',
            transform: 'rotate(-1.2deg)',
            boxSizing: 'border-box',
          }}
        >
          {/* 핀 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: -7,
              width: 13,
              height: 13,
              marginLeft: -6.5,
              borderRadius: '50%',
              background: `radial-gradient(circle at 35% 30%, #FFD9DE, ${p.accent})`,
              boxShadow: '0 2px 3px rgba(0,0,0,0.4)',
              zIndex: 3,
            }}
          />
          {/* 사이드 노치 (티켓 펀칭) */}
          <div style={{ position: 'absolute', left: -7, top: '58%', width: 14, height: 14, borderRadius: '50%', background: '#BE9161' }} />
          <div style={{ position: 'absolute', right: -7, top: '58%', width: 14, height: 14, borderRadius: '50%', background: '#BE9161' }} />

          {/* 헤더 */}
          <p style={{ margin: 0, textAlign: 'center', fontSize: 8, letterSpacing: 3, color: p.accent, textTransform: 'uppercase' }}>
            Capturing
          </p>
          <p
            style={{
              margin: '1px 0 0',
              textAlign: 'center',
              fontSize: 20,
              fontStyle: 'italic',
              fontWeight: 700,
              color: p.deep,
              letterSpacing: 0.5,
            }}
          >
            Moments
          </p>
          <div style={{ margin: '5px auto 8px', width: 60, borderTop: `1px solid ${p.accent}55` }} />

          {/* 오벌 포토 슬롯 4개 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            {[0, 1, 2, 3].map(i => {
              const place = places[i];
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 104,
                      height: 56,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: `1.5px solid ${p.accent}77`,
                      boxShadow: `inset 0 0 0 3px ${p.paper}, inset 0 0 0 4px ${p.accent}44`,
                      background: p.checkBase,
                    }}
                  >
                    {place?.imageUrl ? (
                      <img
                        src={place.imageUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div style={{ ...photoFallback(p), fontSize: 15 }}>{place ? '🍽️' : '·'}</div>
                    )}
                  </div>
                  {place && (
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: 7.5,
                        fontWeight: 700,
                        color: p.deep,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 110,
                      }}
                    >
                      {i + 1}. {place.name}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* 스텁 (절취선 아래) */}
          <div style={{ marginTop: 8, borderTop: `1.5px dashed ${p.accent}55`, paddingTop: 6, textAlign: 'center' }}>
            <p
              style={{
                margin: 0,
                fontSize: 9.5,
                fontWeight: 700,
                color: p.deep,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {course.title}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 7.5, letterSpacing: 1.5, color: p.accent }}>
              {dateLabel} · {course.distanceKm}KM · {course.places.length} SPOTS
            </p>
          </div>
        </div>

        {/* 보드 위 장식 */}
        <span style={{ position: 'absolute', left: 10, top: 8, fontSize: 13, transform: 'rotate(-10deg)' }}>🌾</span>
        <span style={{ position: 'absolute', right: 10, bottom: 10, fontSize: 13, transform: 'rotate(8deg)' }}>🎞️</span>
      </div>

      {/* 프레임 밖 로고 */}
      <p
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 3,
          margin: 0,
          textAlign: 'center',
          fontSize: 7,
          letterSpacing: 2.5,
          color: 'rgba(255,255,255,0.75)',
        }}
      >
        LUNCHIE MUNCHIE
      </p>
    </div>
  );
});

TicketTemplate.displayName = 'TicketTemplate';
export default TicketTemplate;
