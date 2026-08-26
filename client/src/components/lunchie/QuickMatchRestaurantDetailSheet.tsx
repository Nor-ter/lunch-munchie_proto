import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, MapPin, Phone, Star, X } from 'lucide-react';
import { useApp, type Restaurant } from '@/contexts/AppContext';
import { restaurantSummary } from '@/lib/restaurantPresentation';
import { getRestaurantById } from '@/services/restaurantsApi';

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
  const detail = canonicalRestaurant ?? restaurant;
  const summary = restaurantSummary(detail);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            key="quick-match-restaurant-backdrop"
            type="button"
            aria-label="식당 상세정보 닫기"
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
            aria-label={`${detail.name} 상세정보`}
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
            className="fixed inset-x-0 bottom-0 z-[100] mx-auto flex max-h-[78dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] border border-[#E8D2C8] bg-[#FFF8F3] shadow-[0_-20px_55px_rgba(48,28,20,0.28)]"
            onPointerDown={event => event.stopPropagation()}
            onClick={event => event.stopPropagation()}
          >
            <div className="shrink-0 cursor-grab px-5 pb-3 pt-2 active:cursor-grabbing">
              <span className="mx-auto block h-1.5 w-11 rounded-full bg-[#D8C7BF]" />
              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#E67E78]">Lunchie Pick</p>
                  <h2 className="mt-0.5 truncate text-[21px] font-black text-[#342620]">{detail.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="상세정보 닫기"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3E7E1] text-[#80675C] active:scale-90"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#EEDFD7] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#EB5053] px-2.5 py-1 text-[11px] font-black text-white">{detail.category}</span>
                {detail.rating > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#4A3730] shadow-sm">
                    <Star size={12} fill="#EB5053" color="#EB5053" />
                    {detail.rating}
                    {detail.reviewCount > 0 && <span className="font-semibold text-[#A68E84]">({detail.reviewCount.toLocaleString()})</span>}
                  </span>
                )}
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#705C53] shadow-sm">
                  {'₩'.repeat(detail.priceRange || 1)}
                </span>
              </div>

              <section className="mt-4">
                <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-[#AE9185]">About</h3>
                <p className="mt-2 whitespace-pre-line text-[14px] font-semibold leading-6 text-[#493A34]">{summary}</p>
              </section>

              <div className="mt-5 space-y-3 border-t border-[#EEDFD7] pt-4">
                {detail.address && (
                  <p className="flex items-start gap-3 text-[13px] font-semibold leading-5 text-[#5D4B43]">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-[#E57572]" />
                    <span>{detail.address}</span>
                  </p>
                )}
                {detail.openHours && (
                  <p className="flex items-start gap-3 text-[13px] font-semibold leading-5 text-[#5D4B43]">
                    <Clock size={16} className="mt-0.5 shrink-0 text-[#E57572]" />
                    <span className="whitespace-pre-line">{detail.openHours}</span>
                  </p>
                )}
                {detail.phone && (
                  <a href={`tel:${detail.phone}`} className="flex items-center gap-3 text-[13px] font-semibold text-[#5D4B43]">
                    <Phone size={16} className="shrink-0 text-[#E57572]" />
                    <span>{detail.phone}</span>
                  </a>
                )}
              </div>

              {(detail.tags ?? []).length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {(detail.tags ?? []).map(tag => (
                    <span key={tag} className="rounded-full bg-[#F5EAE4] px-2.5 py-1 text-[10px] font-black text-[#8B6D61]">#{tag}</span>
                  ))}
                </div>
              )}
              {(detail.dietary ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(detail.dietary ?? []).map(option => (
                    <span key={option} className="rounded-full bg-[#E7F4EA] px-2.5 py-1 text-[10px] font-black text-[#4B8A5B]">{option}</span>
                  ))}
                </div>
              )}

              {isLoading && !canonicalRestaurant && (
                <p role="status" className="mt-5 text-center text-[10px] font-bold text-[#AD958B]">최신 식당 정보를 확인하는 중…</p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
