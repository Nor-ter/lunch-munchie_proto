import { motion } from 'framer-motion';
import { ChevronLeft, Star, MapPin, Clock } from 'lucide-react';
import { useApp, type Restaurant } from '@/contexts/AppContext';
import type { CoursePlace } from '@/types/course';

/**
 * 식당 상세 슬라이드 페이지 — 코스 에디터/코스 상세의 코스 순서에서
 * 식당을 밀어 열면 화면이 왼쪽으로 슬라이드되며 등장한다.
 * 상세정보와 메뉴 사진을 일반 문서 흐름으로 보여준다. 뒤로가면 원래 화면으로 복귀.
 */
export default function RestaurantDetailSheet({
  restaurantId,
  onClose,
  fallbackPlace,
}: {
  restaurantId: string;
  onClose: () => void;
  fallbackPlace?: CoursePlace;
}) {
  const { getRestaurantById } = useApp();
  const linkedRestaurant = getRestaurantById(restaurantId);
  const matchingRestaurant = linkedRestaurant && (
    !fallbackPlace || linkedRestaurant.name.trim().toLocaleLowerCase() === fallbackPlace.name.trim().toLocaleLowerCase()
  ) ? linkedRestaurant : undefined;
  const fallbackPhoto = fallbackPlace?.imageUrl ?? '';
  const restaurant: Restaurant | undefined = matchingRestaurant ?? (fallbackPlace ? {
    id: fallbackPlace.id,
    name: fallbackPlace.name,
    category: fallbackPlace.category,
    tags: [],
    rating: fallbackPlace.rating || 0,
    reviewCount: 0,
    distance: fallbackPlace.distance,
    address: fallbackPlace.address ?? '주소 정보 준비 중',
    image: fallbackPhoto,
    photos: fallbackPhoto ? [fallbackPhoto] : [],
    lat: fallbackPlace.latitude ?? 0,
    lng: fallbackPlace.longitude ?? 0,
    priceRange: Math.min(4, Math.max(1, fallbackPlace.priceLevel)) as Restaurant['priceRange'],
    openHours: '영업시간 정보 준비 중',
    dietary: [],
    description: '코스에 등록된 장소예요.',
  } : undefined);

  if (!restaurant) return null;
  const menuPhotos = Array.from(new Set([
    ...(restaurant.menuItems ?? []).map(item => item.image).filter((image): image is string => !!image),
    ...(restaurant.photos ?? []),
  ])).slice(0, 4);

  return (
    <motion.div
      className="fixed inset-0 z-[60] mx-auto w-full max-w-[430px] overflow-y-auto bg-[#FFF8F3]"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.32 }}
    >
      {/* Hero */}
      <div className="relative h-[220px] overflow-hidden bg-[#F5EEE8]">
        <img src={restaurant.image} alt={restaurant.name} className="h-full w-full object-cover" />
        <button
          onClick={onClose}
          aria-label="뒤로가기"
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center active:scale-95"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="px-4 pt-4">
        <h1 className="text-[22px] font-extrabold leading-tight text-[#3E2922]">{restaurant.name}</h1>
      </div>

      {/* Info card */}
      <div className="mx-4 mt-3 space-y-3 rounded-3xl border border-[#EFDDD3] bg-[#FFFDFC] p-4 shadow-[0_10px_28px_rgba(105,67,48,0.1)]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 bg-[#FFF5F5] rounded-full px-2.5 py-1 text-[12px] font-bold text-[#EB5053]">
            <Star size={12} fill="#EB5053" /> {restaurant.rating}
            <span className="font-semibold text-[#C79396]">({restaurant.reviewCount.toLocaleString()})</span>
          </span>
          <span className="text-[12px] font-semibold text-white rounded-full px-2.5 py-1" style={{ background: '#EB5053' }}>
            {restaurant.category}
          </span>
          <span className="text-[12px] font-semibold text-[#4A4A4A] bg-[#F5F5F5] rounded-full px-2.5 py-1">
            {'₩'.repeat(restaurant.priceRange)}
          </span>
          <span className="text-[12px] font-semibold text-[#4A4A4A] bg-[#F5F5F5] rounded-full px-2.5 py-1">
            📍 {restaurant.distance}
          </span>
        </div>

        <div className="space-y-1.5">
          <p className="flex items-start gap-1.5 text-[13px] text-[#4A4A4A]">
            <MapPin size={13} className="mt-0.5 shrink-0 text-[#9B9B9B]" /> {restaurant.address}
          </p>
          <p className="flex items-center gap-1.5 text-[13px] text-[#4A4A4A]">
            <Clock size={13} className="shrink-0 text-[#9B9B9B]" /> {restaurant.openHours}
          </p>
        </div>

        <p className="text-[13px] leading-relaxed text-[#4A4A4A]">{restaurant.description}</p>

        {restaurant.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {restaurant.tags.map(tag => (
              <span key={tag} className="tag tag-hash">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* 메뉴 사진 */}
      <div className="mx-4 mt-4 pb-10">
        <p className="mb-2 text-[13px] font-bold text-[#1A1A1A]">메뉴 사진</p>
        <div className="grid grid-cols-4 gap-2">
          {menuPhotos.map((url, i) => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-[#F5F5F5]">
              <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      </div>

    </motion.div>
  );
}
