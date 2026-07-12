import { forwardRef } from 'react';
import { getFoodPhotos } from '@/lib/foodPhotos';
import type { Restaurant } from '@/contexts/AppContext';

interface WinnerShareCardProps {
  restaurant: Restaurant;
}

/** Shareable "오늘의 점심 당첨!" card — captured as an image via html2canvas. */
const WinnerShareCard = forwardRef<HTMLDivElement, WinnerShareCardProps>(({ restaurant }, ref) => {
  const foodPhotos = getFoodPhotos(restaurant.category).slice(0, 4);

  return (
    <div
      ref={ref}
      style={{
        width: 300,
        background: '#FFF1E0',
        borderRadius: 24,
        padding: 18,
        boxSizing: 'border-box',
        fontFamily: "'Baloo 2', 'Pretendard Variable', 'Pretendard', cursive",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <img
          src="/assets/lunchie-brand-mark.png"
          alt=""
          style={{ width: 30, height: 30, objectFit: 'contain', display: 'block', flexShrink: 0 }}
        />
        <img
          src="/assets/lunchie-wordmark.png"
          alt="Lunchie Munchie"
          style={{ width: 112, height: 'auto', objectFit: 'contain', display: 'block' }}
        />
      </div>
      <p style={{ fontSize: 12, color: '#1A1A1A', fontWeight: 700, margin: '8px 0 12px' }}>
        🏆 오늘의 점심 당첨!
      </p>

      <div style={{ borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
        <img
          src={restaurant.image}
          alt={restaurant.name}
          crossOrigin="anonymous"
          style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }}
        />
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: '12px 0 4px', lineHeight: 1.2 }}>
        {restaurant.name}
      </h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#4A4A4A', marginBottom: 10 }}>
        <span>⭐ {restaurant.rating}</span>
        <span>📍 {restaurant.distance}</span>
        <span>{'₩'.repeat(restaurant.priceRange)}</span>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'white', background: '#EB5053', borderRadius: 999, padding: '3px 10px' }}>
          {restaurant.category}
        </span>
        {restaurant.tags.slice(0, 2).map(t => (
          <span key={t} style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', background: 'rgba(0,0,0,0.06)', borderRadius: 999, padding: '3px 10px' }}>
            {t}
          </span>
        ))}
      </div>

      <p style={{ fontSize: 12, color: '#4A4A4A', lineHeight: 1.5, marginBottom: 12 }}>
        {restaurant.description}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {foodPhotos.map((url, i) => (
          <div key={i} style={{ aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', background: '#E5E5E5' }}>
            <img src={url} alt="" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: '#9B9B9B', textAlign: 'center', marginTop: 14 }}>
        밥은 먹어야 하니까 · Lunchie Munchie
      </p>
    </div>
  );
});

WinnerShareCard.displayName = 'WinnerShareCard';
export default WinnerShareCard;
