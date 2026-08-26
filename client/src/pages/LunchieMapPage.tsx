import { useEffect, useRef, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { MapPin, Clock, Star } from 'lucide-react';
import { Map as GoogleMap, Marker } from '@vis.gl/react-google-maps';
import BackButton from '@/components/ui/BackButton';
import { useApp, type MenuItem, type Restaurant } from '@/contexts/AppContext';
import { getRestaurantById as fetchRestaurantById } from '@/services/restaurantsApi';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const SAVED_LUNCHIE_PATH = '/saved?tab=restaurants';

function groupByCategory(items: MenuItem[]): [string, MenuItem[]][] {
  const order: string[] = [];
  const groups = new Map<string, MenuItem[]>();
  for (const item of items) {
    const key = item.category || '메뉴';
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(item);
  }
  return order.map(key => [key, groups.get(key)!]);
}

export default function LunchieMapPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { getRestaurantById, registerRestaurants } = useApp();

  const restaurantId = new URLSearchParams(search).get('id');
  const cachedRestaurant = restaurantId ? getRestaurantById(restaurantId) : null;
  const [recoveredRestaurant, setRecoveredRestaurant] = useState<Restaurant | null>(null);
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState(Boolean(restaurantId && !cachedRestaurant));
  const [restaurantLoadFailed, setRestaurantLoadFailed] = useState(false);
  const restaurant = recoveredRestaurant ?? cachedRestaurant;
  const cachedRestaurantRef = useRef(cachedRestaurant);
  cachedRestaurantRef.current = cachedRestaurant;

  useEffect(() => {
    if (!restaurantId) {
      setIsLoadingRestaurant(false);
      setRecoveredRestaurant(null);
      return;
    }
    let active = true;
    if (!cachedRestaurantRef.current) setIsLoadingRestaurant(true);
    setRestaurantLoadFailed(false);
    void fetchRestaurantById(restaurantId)
      .then(found => {
        if (!active) return;
        if (!found) {
          if (!cachedRestaurantRef.current) setRestaurantLoadFailed(true);
          return;
        }
        registerRestaurants([found]);
        setRecoveredRestaurant(found);
      })
      .catch(() => {
        if (active && !cachedRestaurantRef.current) setRestaurantLoadFailed(true);
      })
      .finally(() => { if (active) setIsLoadingRestaurant(false); });
    return () => { active = false; };
  }, [registerRestaurants, restaurantId]);

  if (isLoadingRestaurant) {
    return (
      <div role="status" className="min-h-dvh flex items-center justify-center bg-[#FCF4EE] px-5 text-[14px] text-[#9B9B9B]">
        식당 위치를 불러오는 중…
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-5 text-center">
        <p role={restaurantLoadFailed ? 'alert' : undefined} className="text-[14px] text-[#9B9B9B] mb-4">식당 정보를 찾을 수 없습니다.</p>
        <button onClick={() => navigate(SAVED_LUNCHIE_PATH)} className="lm-btn-primary px-6 py-3 flex items-center justify-center">
          저장 목록으로
        </button>
      </div>
    );
  }

  const position = { lat: restaurant.lat, lng: restaurant.lng };
  const foodPhotos = Array.from(new Set([
    restaurant.image,
    ...(restaurant.photos ?? []),
    ...(restaurant.menuItems ?? []).map(item => item.image).filter((image): image is string => Boolean(image)),
  ].filter(Boolean)));
  const menuItems = restaurant.menuItems ?? [];

  return (
    <div className="mx-auto min-h-dvh max-w-[430px] bg-[#FFF8F3] pb-6">
      <header className="flex items-center justify-between px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <BackButton
          onClick={() => navigate(SAVED_LUNCHIE_PATH)}
          aria-label="Lunchie 런치픽으로 돌아가기"
          className="border border-[#EBD8CE] text-[#8B6A5D]"
        />
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E67E78]">Lunchie</p>
          <p className="text-[16px] font-black text-[#49362E]">Lunchie Pick</p>
        </div>
        <div className="h-9 w-9" aria-hidden="true" />
      </header>

      <main
        data-ui="lunchie-location-card"
        className="mx-4 overflow-hidden rounded-3xl border border-[#EBD9CF] bg-[#FFFDFC] shadow-[0_10px_28px_rgba(105,67,48,0.08)]"
      >
        <div className="p-4 pb-0">
          <div
            data-ui="lunchie-restaurant-map"
            className="relative h-[46vh] min-h-[340px] max-h-[460px] overflow-hidden rounded-[26px] border border-[#EBD9CF] bg-[#F3EDE8]"
          >
            {GOOGLE_MAPS_API_KEY ? (
              <GoogleMap
                defaultCenter={position}
                defaultZoom={16}
                gestureHandling="greedy"
                disableDefaultUI
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              >
                <Marker position={position} title={restaurant.name} />
              </GoogleMap>
            ) : (
              <div role="alert" className="flex h-full items-center justify-center px-8 text-center">
                <div>
                  <MapPin className="mx-auto text-[#E87874]" size={34} />
                  <p className="mt-3 text-[15px] font-black text-[#3A2922]">지도를 불러올 수 없어요</p>
                  <p className="mt-1 text-[12px] font-semibold text-[#9A8579]">Google 지도 설정을 확인해 주세요.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          data-ui="lunchie-restaurant-detail"
          className="px-5 py-5"
        >
          {foodPhotos.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto">
              {foodPhotos.slice(0, 8).map(url => (
                <div key={url} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F5F5F5]">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#EB5053] px-2 py-0.5 text-[11px] font-bold text-white">
            {restaurant.category}
          </span>
          <div className="flex items-center gap-1">
            <Star size={12} fill="#FFD700" color="#FFD700" />
            <span className="text-[12px] font-bold text-[#1A1A1A]">{restaurant.rating}</span>
            {restaurant.reviewCount > 0 && (
              <span className="text-[11px] font-semibold text-[#9B9B9B]">({restaurant.reviewCount.toLocaleString()})</span>
            )}
          </div>
          <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[11px] font-semibold text-[#4A4A4A]">
            {'₩'.repeat(restaurant.priceRange || 1)}
          </span>
        </div>
        <h2 className="mb-1 text-[20px] font-black text-[#1A1A1A]">{restaurant.name}</h2>
        {restaurant.description && (
          <p className="mb-3 text-[12px] leading-relaxed text-[#9B9B9B]">{restaurant.description}</p>
        )}

        <div className="space-y-2.5 border-t border-[#F5F5F5] pt-3 text-[13px] text-[#4A4A4A]">
          <div className="flex items-start gap-2">
            <MapPin size={14} className="mt-0.5 text-[#9B9B9B]" />
            <span>{restaurant.address}</span>
          </div>
          {restaurant.openHours && (
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[#9B9B9B]" />
              <span>{restaurant.openHours}</span>
            </div>
          )}
        </div>

        {(restaurant.tags ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(restaurant.tags ?? []).map(tag => (
              <span key={tag} className="tag tag-hash">#{tag}</span>
            ))}
          </div>
        )}

        {(restaurant.dietary ?? []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {(restaurant.dietary ?? []).map(option => (
              <span key={option} className="rounded-full bg-[#E8F5E9] px-1.5 py-0.5 text-[9px] font-bold text-[#3CBA44]">{option}</span>
            ))}
          </div>
        )}

        {menuItems.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-[12px] font-bold text-[#9B9B9B]">메뉴 ({menuItems.length})</p>
            <div className="overflow-hidden rounded-2xl border border-[#EFEFEF]">
              {groupByCategory(menuItems).map(([category, items]) => (
                <div key={category}>
                  <p className="bg-[#FAFAFA] px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wide text-[#B0B0B0]">{category}</p>
                  {items.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="flex items-center gap-3 border-b border-[#F0F0F0] px-3 py-2.5 last:border-b-0">
                      {item.image ? (
                        <img src={item.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover bg-[#F5F5F5]" />
                      ) : (
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-[#F5F5F5]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-[#2A2A2A]">{item.name}</p>
                        {item.description && (
                          <p className="mt-0.5 truncate text-[11px] text-[#9B9B9B]">{item.description}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[12.5px] font-bold tabular-nums text-[#4A4A4A]">
                        {item.price != null ? `$${item.price}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : foodPhotos.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-[12px] font-bold text-[#9B9B9B]">메뉴 사진</p>
            <div className="grid grid-cols-4 gap-2">
              {foodPhotos.slice(0, 4).map(url => (
                <div key={url} className="aspect-square overflow-hidden rounded-xl bg-[#F5F5F5]">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        ) : null}
        </div>
      </main>
    </div>
  );
}
