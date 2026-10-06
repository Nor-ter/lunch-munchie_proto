import { englishText } from '@shared/englishCopy';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Map as GoogleMap, Marker } from '@vis.gl/react-google-maps';
import { Clock, ExternalLink, MapPin, MessageSquareText, Navigation, Phone, Star, UtensilsCrossed, X } from 'lucide-react';
import { useApp, type MenuItem, type Restaurant } from '@/contexts/AppContext';
import { mergeCanonicalRestaurantPresentation, restaurantDisplayRating, restaurantPriceLabel, restaurantSummary } from '@/lib/restaurantPresentation';
import { getRestaurantById } from '@/services/restaurantsApi';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function formatMenuPrice(price: number | null): string {
  if (price == null || !Number.isFinite(price) || price <= 0) return '';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(price);
}

function sampleMenuForCategory(category: string): MenuItem[] {
  const normalized = category.toLocaleLowerCase();
  if (normalized.includes('cafe') || normalized.includes('coffee')) {
    return [
      { name: 'Flat White', price: 5.5, category: 'Sample Menu' },
      { name: 'Seasonal Pastry', price: 8, category: 'Sample Menu' },
      { name: 'Brunch Plate', price: 19, category: 'Sample Menu' },
    ];
  }
  if (normalized.includes('korean')) {
    return [
      { name: 'Bibimbap', price: 18, category: 'Sample Menu' },
      { name: 'Bulgogi Bowl', price: 21, category: 'Sample Menu' },
      { name: 'Kimchi Pancake', price: 15, category: 'Sample Menu' },
    ];
  }
  if (normalized.includes('japanese')) {
    return [
      { name: 'Salmon Don', price: 22, category: 'Sample Menu' },
      { name: 'Karaage', price: 14, category: 'Sample Menu' },
      { name: 'Miso Soup', price: 5, category: 'Sample Menu' },
    ];
  }
  return [
    { name: 'House Special', price: 22, category: 'Sample Menu' },
    { name: 'Share Plate', price: 16, category: 'Sample Menu' },
    { name: 'Dessert of the Day', price: 10, category: 'Sample Menu' },
  ];
}

export default function QuickMatchRestaurantDetailSheet({
  open,
  restaurant,
  onClose,
}: {
  open: boolean;
  restaurant: Restaurant;
  onClose: () => void;
}) {
  const { registerRestaurants } = useApp();
  const [canonicalRestaurant, setCanonicalRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setIsLoading(true);
    void getRestaurantById(restaurant.id)
      .then(found => {
        if (!active || !found) return;
        registerRestaurants([found]);
        setCanonicalRestaurant(found);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [open, registerRestaurants, restaurant.id]);

  useEffect(() => {
    setCanonicalRestaurant(null);
  }, [restaurant.id]);

  if (typeof document === 'undefined') return null;
  const detail = canonicalRestaurant
    ? mergeCanonicalRestaurantPresentation(restaurant, canonicalRestaurant)
    : restaurant;
  const summary = restaurantSummary(detail);
  const displayRating = restaurantDisplayRating(detail);
  const priceLabel = restaurantPriceLabel(detail);
  const hero = detail.image || detail.photos?.[0] || '';
  const hasCoordinates = Number.isFinite(detail.lat) && Number.isFinite(detail.lng)
    && detail.lat !== 0 && detail.lng !== 0;
  const mapPosition = hasCoordinates ? { lat: detail.lat, lng: detail.lng } : null;
  const mapUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${detail.lat},${detail.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${detail.name} ${detail.address}`)}`;
  const reviewSignals = [
    { label: 'Food', value: Math.min(98, Math.round(displayRating.rating * 20 + 1)) },
    { label: 'Service', value: Math.min(96, Math.round(displayRating.rating * 19 + 4)) },
    { label: 'Value', value: Math.min(94, Math.round(displayRating.rating * 18 + 6)) },
  ];
  const storedMenuItems = detail.menuItems ?? [];
  const menuIsDemo = storedMenuItems.length === 0;
  const menuItems = menuIsDemo ? sampleMenuForCategory(detail.category) : storedMenuItems;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            key="quick-match-restaurant-backdrop"
            type="button"
            aria-label="Close Restaurant Details"
            className="fixed inset-0 z-[90] bg-[#211511]/55 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onPointerDown={event => event.stopPropagation()}
            onClick={event => {
              event.stopPropagation();
              onClose();
            }}
          />
          <motion.aside
            key="quick-match-restaurant-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={englishText(`${detail.name}  Details`)}
            data-ui="quick-match-restaurant-detail-sheet"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.22}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 650) onClose();
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[100] mx-auto flex max-h-[88dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] border border-[#E8E6E7] bg-[#FCFCFC] shadow-[0_-20px_55px_rgba(48,28,20,0.28)]"
            onPointerDown={event => event.stopPropagation()}
            onClick={event => event.stopPropagation()}
          >
            <div className="shrink-0 cursor-grab px-5 pb-3 pt-2 active:cursor-grabbing">
              <span className="mx-auto block h-1.5 w-11 rounded-full bg-[#E8E6E7]" />
              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#AA1A0D]">Lunchie Pick</p>
                  <h2 className="mt-0.5 truncate text-[21px] font-black text-[#171717]">{englishText(detail.name)}</h2>
                  <p className="mt-1 text-[10px] font-semibold text-[#858185]">Restaurant details</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close Details"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5F4F5] text-[#565256] active:scale-90"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#E8E6E7] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {hero && (
                <div className="relative h-44 overflow-hidden bg-[#F5F4F5]">
                  <img src={hero} alt={englishText(detail.name)} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4 flex items-center gap-2 text-white">
                    <Star size={16} fill="currentColor" />
                    <span className="text-[18px] font-black">{displayRating.rating.toFixed(1)}</span>
                    <span className="text-[11px] font-bold text-white/80">{displayRating.reviewCount.toLocaleString()} reviews</span>
                  </div>
                </div>
              )}

              <div className="px-5 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#AA1A0D] px-2.5 py-1 text-[11px] font-black text-white">{englishText(detail.category)}</span>
                <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#565256] shadow-sm">
                  <Star size={12} fill="#AA1A0D" color="#AA1A0D" />
                  {displayRating.rating.toFixed(1)}
                  <span className="font-semibold text-[#858185]">({englishText(displayRating.reviewCount.toLocaleString())})</span>
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#565256] shadow-sm">
                  {englishText('₩'.repeat(detail.priceRange || 1))}
                </span>
                {detail.distance?.trim() && (
                  <span className="flex items-center gap-1 rounded-full bg-[#FBECE9] px-2.5 py-1 text-[11px] font-black text-[#AA1A0D]">
                    <Navigation size={12} /> {englishText(detail.distance)}
                  </span>
                )}
                {priceLabel && <span className="rounded-full bg-[#F5F4F5] px-2.5 py-1 text-[11px] font-black text-[#565256]">{priceLabel}</span>}
              </div>

              <section className="mt-4">
                <h3 className="text-[11px] font-black tracking-[0.12em] text-[#858185]">Details</h3>
                <p className="mt-2 whitespace-pre-line text-[14px] font-semibold leading-6 text-[#565256]">{englishText(summary)}</p>
              </section>

              <section className="mt-5" aria-label="Review summary">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-1.5 text-[13px] font-black text-[#171717]"><MessageSquareText size={15} className="text-[#AA1A0D]" /> Review snapshot</h3>
                  {displayRating.isDemo && <span className="text-[9px] font-black uppercase tracking-wide text-[#9B9B9B]">Demo data</span>}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {reviewSignals.map(signal => (
                    <div key={signal.label} className="rounded-2xl bg-[#F5F4F5] px-2 py-3 text-center">
                      <p className="text-[16px] font-black text-[#AA1A0D]">{signal.value}%</p>
                      <p className="mt-0.5 text-[9px] font-bold text-[#858185]">{signal.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] font-semibold text-[#858185]">Based on {displayRating.reviewCount.toLocaleString()} rating signals.</p>
              </section>

              <section className="mt-5" aria-label="Restaurant map">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[13px] font-black text-[#171717]">Location</h3>
                  <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-black text-[#AA1A0D]">Open Map <ExternalLink size={12} /></a>
                </div>
                <div className="mt-2 h-36 overflow-hidden rounded-2xl border border-[#E8E6E7] bg-[#F5F4F5]" onPointerDown={event => event.stopPropagation()}>
                  {GOOGLE_MAPS_API_KEY && mapPosition ? (
                    <GoogleMap defaultCenter={mapPosition} defaultZoom={15} gestureHandling="cooperative" disableDefaultUI style={{ width: '100%', height: '100%' }}>
                      <Marker position={mapPosition} title={englishText(detail.name)} />
                    </GoogleMap>
                  ) : (
                    <a href={mapUrl} target="_blank" rel="noreferrer" className="flex h-full flex-col items-center justify-center px-5 text-center text-[#AA1A0D]">
                      <MapPin size={26} />
                      <span className="mt-2 text-[11px] font-black">View this restaurant on the map</span>
                    </a>
                  )}
                </div>
              </section>

              <section className="mt-5" aria-label="Restaurant menu">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-1.5 text-[13px] font-black text-[#171717]"><UtensilsCrossed size={15} className="text-[#AA1A0D]" /> {menuIsDemo ? 'Sample menu' : 'Menu'}</h3>
                  {menuIsDemo && <span className="text-[9px] font-black uppercase tracking-wide text-[#9B9B9B]">Demo data</span>}
                </div>
                <div className="mt-2 overflow-hidden rounded-2xl border border-[#E8E6E7] bg-white">
                    {menuItems.slice(0, 8).map((item, index) => (
                      <div key={`${item.name}-${index}`} className="flex items-center gap-3 border-b border-[#F0EEEE] px-3 py-3 last:border-b-0">
                        {item.image ? <img src={item.image} alt="" className="size-11 shrink-0 rounded-xl object-cover" /> : <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FBECE9] text-lg" aria-hidden="true">🍽️</span>}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-black text-[#171717]">{englishText(item.name)}</p>
                          {item.description && <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold text-[#858185]">{englishText(item.description)}</p>}
                        </div>
                        {formatMenuPrice(item.price) && <span className="shrink-0 text-[11px] font-black text-[#AA1A0D]">{formatMenuPrice(item.price)}</span>}
                      </div>
                    ))}
                </div>
              </section>

              <div className="mt-5 space-y-3 border-t border-[#E8E6E7] pt-4">
                {englishText(detail.address && (
                  <p className="flex items-start gap-3 text-[13px] font-semibold leading-5 text-[#565256]">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-[#AA1A0D]" />
                    <span>{englishText(detail.address)}</span>
                  </p>
                ))}
                {englishText(detail.openHours && (
                  <p className="flex items-start gap-3 text-[13px] font-semibold leading-5 text-[#565256]">
                    <Clock size={16} className="mt-0.5 shrink-0 text-[#AA1A0D]" />
                    <span className="whitespace-pre-line">{englishText(detail.openHours)}</span>
                  </p>
                ))}
                {englishText(detail.phone && (
                  <a href={`tel:${detail.phone}`} className="flex items-center gap-3 text-[13px] font-semibold text-[#565256]">
                    <Phone size={16} className="shrink-0 text-[#AA1A0D]" />
                    <span>{englishText(detail.phone)}</span>
                  </a>
                ))}
              </div>

              {(detail.tags ?? []).length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {(detail.tags ?? []).map(tag => (
                    <span key={tag} className="rounded-full bg-[#F5F4F5] px-2.5 py-1 text-[10px] font-black text-[#858185]">#{englishText(tag)}</span>
                  ))}
                </div>
              )}
              {(detail.dietary ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(detail.dietary ?? []).map(option => (
                    <span key={option} className="rounded-full bg-[#FBECE9] px-2.5 py-1 text-[10px] font-black text-[#AA1A0D]">{englishText(option)}</span>
                  ))}
                </div>
              )}

              {isLoading && !canonicalRestaurant && (
                <p role="status" className="mt-5 text-center text-[10px] font-bold text-[#858185]">Loading the latest restaurant details…</p>
              )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
