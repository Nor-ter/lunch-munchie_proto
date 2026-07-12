import { motion } from 'framer-motion';
import { ChevronLeft, Star, MapPin, Clock, Heart, MessageCircle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getFoodPhotos } from '@/lib/foodPhotos';

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return '오늘';
  if (days < 7) return `${days}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/**
 * 식당 상세 슬라이드 페이지 — 코스 에디터/코스 상세의 코스 순서에서
 * 식당을 밀어 열면 화면이 왼쪽으로 슬라이드되며 등장한다.
 * 상세정보 + 메뉴 사진 + 이 식당이 등장하는 모든 소셜 피드의 한줄평을 모아 보여줘서
 * "이 식당을 코스에 넣을까/뺄까"를 판단하게 돕는다. 뒤로가면 원래 화면으로 복귀.
 */
export default function RestaurantDetailSheet({
  restaurantId,
  onClose,
}: {
  restaurantId: string;
  onClose: () => void;
}) {
  const { getRestaurantById, getCourseById, feedPosts } = useApp();
  const restaurant = getRestaurantById(restaurantId);

  // 이 식당이 코스에 포함된 모든 소셜 피드
  const relatedPosts = feedPosts.filter(post => {
    const course = getCourseById(post.courseId);
    return course?.stops.some(s => s.placeId === restaurantId);
  });

  if (!restaurant) return null;
  const foodPhotos = getFoodPhotos(restaurant.category).slice(0, 4);

  return (
    <motion.div
      className="fixed inset-0 z-[60] mx-auto w-full max-w-[430px] bg-[#FCF4EE] overflow-y-auto"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.32 }}
    >
      {/* Hero */}
      <div className="relative h-[220px]">
        <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />
        <button
          onClick={onClose}
          aria-label="뒤로가기"
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center active:scale-95"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="absolute bottom-3 left-4 right-4">
          <h1 className="text-white font-black text-[22px] leading-tight">{restaurant.name}</h1>
        </div>
      </div>

      {/* Info card */}
      <div className="mx-4 -mt-4 relative rounded-3xl bg-white p-4 shadow-sm space-y-3">
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
      <div className="mx-4 mt-4">
        <p className="mb-2 text-[13px] font-bold text-[#1A1A1A]">메뉴 사진</p>
        <div className="grid grid-cols-4 gap-2">
          {foodPhotos.map((url, i) => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-[#F5F5F5]">
              <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      </div>

      {/* 소셜 피드 모아보기 */}
      <div className="mx-4 mt-5 pb-10">
        <p className="mb-2 text-[13px] font-bold text-[#1A1A1A]">
          먼치 피드 후기 <span className="text-[#EB5053]">{relatedPosts.length}</span>
        </p>

        {relatedPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5CFC5] bg-white/60 py-8 text-center">
            <p className="text-2xl mb-1">📭</p>
            <p className="text-[12px] font-semibold text-[#8A7A6C]">아직 이 식당이 담긴 피드가 없어요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {relatedPosts.map(post => {
              const course = getCourseById(post.courseId);
              const visibleComments = post.comments.filter(c => !c.hidden);
              return (
                <div key={post.id} className="rounded-2xl bg-white border border-[#F0E8E0] p-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[#FFF5F5] flex items-center justify-center text-[14px] shrink-0">
                      {post.authorEmoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-[#1A1A1A] leading-tight">{post.authorName}</p>
                      <p className="text-[10px] text-[#9B9B9B] truncate leading-tight">
                        {course?.title ?? ''} · {timeAgo(post.createdAt)}
                      </p>
                    </div>
                    <span className="flex items-center gap-2 text-[11px] text-[#B09A8C] shrink-0">
                      <span className="flex items-center gap-0.5"><Heart size={10} fill="currentColor" /> {post.likes}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle size={10} /> {visibleComments.length}</span>
                    </span>
                  </div>
                  <div className="mt-2 flex gap-2.5">
                    <img src={post.photos[0]} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" loading="lazy" />
                    <p className="flex-1 text-[12.5px] leading-relaxed text-[#3B2A22] line-clamp-3">{post.caption}</p>
                  </div>
                  {visibleComments.length > 0 && (
                    <div className="mt-2 rounded-xl bg-[#FAF6F1] px-2.5 py-2 space-y-1">
                      {visibleComments.slice(0, 2).map(c => (
                        <p key={c.id} className="text-[11px] text-[#5A4A3A] leading-snug truncate">
                          {c.authorEmoji} <b>{c.authorName}</b> {c.text}
                        </p>
                      ))}
                      {visibleComments.length > 2 && (
                        <p className="text-[10px] text-[#B09A8C]">+{visibleComments.length - 2}개 더</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
