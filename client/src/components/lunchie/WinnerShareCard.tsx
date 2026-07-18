import { forwardRef, type SyntheticEvent } from 'react';
import { getFoodPhotos } from '@/lib/foodPhotos';
import {
  formatLunchieDateLabel,
  getLunchieLocationLabel,
  getLunchieParticipantLabel,
  getRepresentativeMenuLabel,
  type LunchieShareParticipant,
} from '@/lib/lunchieShare';
import type { Restaurant } from '@/contexts/AppContext';

interface WinnerShareCardProps {
  restaurant: Restaurant;
  participants?: LunchieShareParticipant[];
  voteLabel?: string;
  menuLabel?: string;
  locationLabel?: string;
  dateLabel?: string;
}

const BRAND_MARK = '/assets/lunchie-brand-mark.png';

function handleFoodImageError(event: SyntheticEvent<HTMLImageElement>, foodFallback: string) {
  const image = event.currentTarget;
  const step = Number(image.dataset.fallbackStep ?? 0);

  if (step === 0) {
    image.dataset.fallbackStep = '1';
    image.src = foodFallback;
    return;
  }

  image.onerror = null;
  image.src = BRAND_MARK;
  image.style.objectFit = 'contain';
  image.style.padding = '20%';
  image.style.background = '#F9E0CF';
}

/** Export-only 9:16 Lunchie result record. App controls intentionally live outside this node. */
const WinnerShareCard = forwardRef<HTMLDivElement, WinnerShareCardProps>(({
  restaurant,
  participants = [],
  voteLabel,
  menuLabel,
  locationLabel,
  dateLabel,
}, ref) => {
  const foodFallback = getFoodPhotos(restaurant.category)[0];
  const resolvedVoteLabel = voteLabel?.trim() || (
    participants.length === 1 ? '나의 최종 선택' : '친구들과 함께 고른 최종 선택'
  );
  const resolvedMenuLabel = menuLabel?.trim() || getRepresentativeMenuLabel(restaurant.menuItems);
  const resolvedLocationLabel = locationLabel?.trim() || getLunchieLocationLabel(restaurant.address);
  const resolvedDateLabel = dateLabel?.trim() || formatLunchieDateLabel();
  const participantLabel = getLunchieParticipantLabel(participants);
  const visibleParticipants = participants.slice(0, 4);
  const remainingParticipantCount = Math.max(0, participants.length - visibleParticipants.length);

  return (
    <div
      ref={ref}
      aria-label={`${restaurant.name} Lunchie 결과 공유 카드`}
      style={{
        position: 'relative',
        width: 'min(360px, calc(100vw - 32px))',
        aspectRatio: '9 / 16',
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        color: '#2D201B',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.38), transparent 46%), repeating-linear-gradient(0deg, rgba(138,90,67,0.025) 0, rgba(138,90,67,0.025) 1px, transparent 1px, transparent 5px), #FFF6E8',
        border: '1px solid #F1D9C7',
        borderRadius: 24,
        padding: 16,
        boxShadow: '0 14px 36px rgba(105, 65, 45, 0.16)',
        fontFamily: "'Pretendard Variable', 'Pretendard', system-ui, sans-serif",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <img src={BRAND_MARK} alt="" style={{ width: 24, height: 24, objectFit: 'contain', display: 'block' }} />
          <img
            src="/assets/lunchie-wordmark.png"
            alt="Lunchie Munchie"
            style={{ width: 94, height: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </div>
        <span style={{ color: '#A26B54', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em' }}>
          MEAL RECORD
        </span>
      </div>

      <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flex: 1, borderTop: '1px dashed #D9B9A3' }} />
        <p style={{ margin: 0, color: '#E85053', fontSize: 13, fontWeight: 900, letterSpacing: '-0.01em' }}>
          오늘의 Lunchie Pick
        </p>
        <span style={{ flex: 1, borderTop: '1px dashed #D9B9A3' }} />
      </div>

      <div
        style={{
          position: 'relative',
          marginTop: 10,
          width: '100%',
          aspectRatio: '16 / 9',
          flexShrink: 0,
          overflow: 'hidden',
          borderRadius: 16,
          background: '#F4DCCB',
        }}
      >
        <img
          src={restaurant.image || foodFallback}
          alt={restaurant.name}
          crossOrigin="anonymous"
          onError={event => handleFoodImageError(event, foodFallback)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(45,32,27,0.52), transparent 58%)' }} />
        <span
          style={{
            position: 'absolute',
            left: 12,
            bottom: 10,
            maxWidth: 'calc(100% - 24px)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            borderRadius: 999,
            padding: '4px 9px',
            color: '#FFFDF8',
            background: 'rgba(232,80,83,0.92)',
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          {restaurant.category}
        </span>
      </div>

      <h2
        title={restaurant.name}
        style={{
          margin: '11px 0 0',
          minHeight: 42,
          maxHeight: 48,
          overflow: 'hidden',
          color: '#261A16',
          fontSize: 22,
          fontWeight: 950,
          lineHeight: 1.08,
          letterSpacing: '-0.035em',
          overflowWrap: 'anywhere',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
        }}
      >
        {restaurant.name}
      </h2>

      <div
        style={{
          marginTop: 8,
          borderRadius: 12,
          padding: '8px 11px',
          color: '#B8383C',
          background: '#FDE5DE',
          fontSize: 12,
          fontWeight: 900,
          textAlign: 'center',
        }}
      >
        ♥ {resolvedVoteLabel}
      </div>

      <div style={{ marginTop: 10, minHeight: 62 }} aria-label={participantLabel}>
        <p style={{ margin: 0, color: '#8C6C5C', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em' }}>
          TOGETHER WITH
        </p>
        {visibleParticipants.length > 0 ? (
          <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
            {visibleParticipants.map((participant, index) => (
              <div
                key={participant.id ?? `${participant.name}-${index}`}
                style={{ minWidth: 0, flex: '1 1 0', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <span
                  style={{
                    position: 'relative',
                    width: 25,
                    height: 25,
                    flexShrink: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    color: '#5C3D30',
                    background: '#F5D6C1',
                    fontSize: 13,
                  }}
                >
                  {participant.emoji || '🙂'}
                  {participant.profileImage && (
                    <img
                      src={participant.profileImage}
                      alt=""
                      crossOrigin="anonymous"
                      onError={event => { event.currentTarget.style.display = 'none'; }}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  )}
                </span>
                <span
                  style={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: '#4B342B',
                    fontSize: 10,
                    fontWeight: 750,
                  }}
                >
                  {participant.name}
                </span>
              </div>
            ))}
            {remainingParticipantCount > 0 && (
              <span style={{ flexShrink: 0, color: '#E85053', fontSize: 10, fontWeight: 900 }}>
                +{remainingParticipantCount}
              </span>
            )}
          </div>
        ) : (
          <p style={{ margin: '7px 0 0', color: '#A58B7D', fontSize: 10, fontWeight: 650 }}>
            참여자 정보 없음
          </p>
        )}
      </div>

      <div style={{ marginTop: 7, borderTop: '1px dashed #D9B9A3', paddingTop: 8, display: 'grid', gap: 5 }}>
        {([
          ['대표 메뉴', resolvedMenuLabel],
          ['지역', resolvedLocationLabel],
          ['날짜', resolvedDateLabel],
        ] as const).map(([label, value]) => (
          <div key={label} style={{ display: 'grid', gridTemplateColumns: '54px minmax(0, 1fr)', alignItems: 'baseline', gap: 7 }}>
            <span style={{ color: '#A26B54', fontSize: 9, fontWeight: 850 }}>{label}</span>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: '#392820',
                fontSize: 10,
                fontWeight: 750,
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      <p style={{ margin: 'auto 0 0', paddingTop: 7, color: '#A98978', fontSize: 8.5, fontWeight: 700, textAlign: 'center' }}>
        친구들과 같이 고른 오늘의 한 끼 · Lunchie Munchie
      </p>

      <span aria-hidden="true" style={{ position: 'absolute', left: -8, top: '72%', width: 16, height: 16, borderRadius: '50%', background: '#FFFDF8' }} />
      <span aria-hidden="true" style={{ position: 'absolute', right: -8, top: '72%', width: 16, height: 16, borderRadius: '50%', background: '#FFFDF8' }} />
    </div>
  );
});

WinnerShareCard.displayName = 'WinnerShareCard';
export default WinnerShareCard;
