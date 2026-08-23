import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { ArrowLeft, MapPin, Clock, Star } from 'lucide-react';
import { Map, Marker } from '@vis.gl/react-google-maps';
import { motion } from 'framer-motion';
import { useApp, type Restaurant } from '@/contexts/AppContext';
import { getRestaurantById as fetchRestaurantById } from '@/services/restaurantsApi';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const SAVED_LUNCHIE_PATH = '/saved?tab=restaurants';

export default function LunchieMapPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { getRestaurantById, registerRestaurants } = useApp();

  const restaurantId = new URLSearchParams(search).get('id');
  const cachedRestaurant = restaurantId ? getRestaurantById(restaurantId) : null;
  const [recoveredRestaurant, setRecoveredRestaurant] = useState<Restaurant | null>(null);
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState(Boolean(restaurantId && !cachedRestaurant));
  const [restaurantLoadFailed, setRestaurantLoadFailed] = useState(false);
  const restaurant = cachedRestaurant ?? recoveredRestaurant;

  useEffect(() => {
    if (!restaurantId || cachedRestaurant) {
      setIsLoadingRestaurant(false);
      return;
    }
    let active = true;
    setIsLoadingRestaurant(true);
    setRestaurantLoadFailed(false);
    void fetchRestaurantById(restaurantId)
      .then(found => {
        if (!active) return;
        if (!found) {
          setRestaurantLoadFailed(true);
          return;
        }
        registerRestaurants([found]);
        setRecoveredRestaurant(found);
      })
      .catch(() => { if (active) setRestaurantLoadFailed(true); })
      .finally(() => { if (active) setIsLoadingRestaurant(false); });
    return () => { active = false; };
  }, [cachedRestaurant, registerRestaurants, restaurantId]);

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

  return (
    <div className="flex min-h-dvh flex-col bg-[#FFF6F2]">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#F0E8E0] bg-[#FFF6F2]/95 px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <motion.button
          type="button"
          onClick={() => navigate(SAVED_LUNCHIE_PATH)}
          whileTap={{ scale: 0.9 }}
          className="flex size-9 items-center justify-center rounded-full bg-white shadow-sm"
          aria-label="Lunchie 런치픽으로 돌아가기"
        >
          <ArrowLeft size={17} aria-hidden="true" />
        </motion.button>
        <span className="text-[15px] font-extrabold text-[#2F292B]">식당 위치 안내</span>
        <div className="size-9" aria-hidden="true" />
      </header>

      {/* Map */}
      <div data-ui="lunchie-restaurant-map" className="relative min-h-[50vh] flex-1 overflow-hidden">
        {GOOGLE_MAPS_API_KEY ? (
          <Map
            defaultCenter={position}
            defaultZoom={16}
            gestureHandling="greedy"
            disableDefaultUI
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            <Marker position={position} title={restaurant.name} />
          </Map>
        ) : (
          <div role="alert" className="flex h-full min-h-[50vh] items-center justify-center px-8 text-center">
            <div>
              <MapPin className="mx-auto text-[#E87874]" size={34} />
              <p className="mt-3 text-[15px] font-black text-[#3A2922]">지도를 불러올 수 없어요</p>
              <p className="mt-1 text-[12px] font-semibold text-[#9A8579]">Google 지도 설정을 확인해 주세요.</p>
            </div>
          </div>
        )}
      </div>

      {/* Detail Card */}
      <div className="bg-white px-5 py-5 border-t border-[#E5E5E5]" style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white bg-[#EB5053]">
            {restaurant.category}
          </span>
          <div className="flex items-center gap-1">
            <Star size={12} fill="#FFD700" color="#FFD700" />
            <span className="text-[12px] font-bold text-[#1A1A1A]">{restaurant.rating}</span>
          </div>
        </div>
        <h2 className="font-black text-[20px] text-[#1A1A1A] mb-1">{restaurant.name}</h2>
        <p className="text-[12px] text-[#9B9B9B] mb-3">{restaurant.description}</p>
        
        <div className="space-y-2.5 text-[13px] text-[#4A4A4A] border-t border-[#F5F5F5] pt-3">
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
      </div>
    </div>
  );
}
