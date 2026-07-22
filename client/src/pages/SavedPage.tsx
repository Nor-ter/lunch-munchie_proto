/**
 * Lunchie Munchie — 저장 목록 (전면 개편)
 * 두 소스를 한 페이지에서: ① Munchie Mode — 다른 사람이 만든 코스맵을 저장한 목록
 *                         ② Lunchie Mode — Quick Match(그룹 대결) 결과에서 저장한 맛집 목록
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { MapPin, Bookmark, BookmarkX, Star, Zap, Map as MapIcon } from 'lucide-react';
import { useApp, TagType } from '@/contexts/AppContext';
import { getCourseTagStyle } from '@/constants/courseTheme';
import { FOOD_FILTER_TAGS, hasFoodTag } from '@/constants/foodTags';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';

type Tab = 'coursemaps' | 'restaurants';

function RestaurantSavedCard({
  restaurantId,
  onTap,
  onUnsave,
}: {
  restaurantId: string;
  onTap: () => void;
  onUnsave: () => void;
}) {
  const { getRestaurantById } = useApp();
  const r = getRestaurantById(restaurantId);
  if (!r) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="flex gap-3 p-3 rounded-2xl border border-[#F0E8E0] bg-white cursor-pointer active:scale-[0.98] transition-all"
      onClick={onTap}
    >
      <img src={r.image} alt={r.name} className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#FFF5F5] px-2 py-0.5 text-[11px] font-bold text-[#EB5053]">
                <Star size={10} fill="#EB5053" /> {r.rating}
              </span>
              <span className="text-[11px] font-semibold text-white rounded-full px-2 py-0.5" style={{ background: '#EB5053' }}>
                {r.category}
              </span>
            </div>
            <p className="font-bold text-[14px] text-[#1A1A1A] line-clamp-1 leading-tight">{r.name}</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onUnsave(); }}
            className="flex-shrink-0"
            aria-label="저장 해제"
          >
            <Bookmark size={16} fill="#EB5053" stroke="#EB5053" />
          </button>
        </div>
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[#9B9B9B] line-clamp-1">
          <MapPin size={10} /> {r.address}
        </p>
        <div className="mt-1.5 flex gap-1.5 flex-wrap">
          {r.tags.slice(0, 2).map(tag => (
            <span key={tag} className="tag tag-hash">{tag}</span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function SavedPage() {
  const [, navigate] = useLocation();
  const {
    feedPosts, savedCourseIds, unsaveCourse,
    savedRestaurantIds, unsaveRestaurant,
  } = useApp();
  const [tab, setTab] = useState<Tab>('coursemaps');
  const [activeFilter, setActiveFilter] = useState<TagType | 'all'>('all');

  const savedPosts = Array.from(
    feedPosts
      .filter(post => savedCourseIds.includes(post.courseId))
      .reduce((byCourse, post) => {
        if (!byCourse.has(post.courseId)) byCourse.set(post.courseId, post);
        return byCourse;
      }, new Map<string, (typeof feedPosts)[number]>())
      .values(),
  );
  const filteredPosts = activeFilter === 'all'
    ? savedPosts
    : savedPosts.filter(post => hasFoodTag(post.tags, activeFilter as TagType));

  return (
    <div className="min-h-dvh bg-[#FCF4EE] pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="font-bold text-[22px] text-[#1A1A1A] mb-1">저장 목록 🔖</h1>
        <p className="text-[12px] text-[#9B9B9B] mb-4">
          {tab === 'coursemaps' ? '마음에 든 한줄평과 코스맵을 함께 모아봤어요' : 'Quick Match에서 저장한 맛집이에요'}
        </p>

        {/* 모드 세그먼트 */}
        <div className="flex rounded-full bg-[#F5F0EA] p-1">
          {([
            ['coursemaps', 'Munchie 먼치픽', MapIcon, savedPosts.length],
            ['restaurants', 'Lunchie 런치픽', Zap, savedRestaurantIds.length],
          ] as const).map(([key, label, Icon, count]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="relative flex-1 h-10 rounded-full text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5"
              style={{ color: tab === key ? '#FFFFFF' : '#8A7A6C' }}
            >
              {tab === key && (
                <motion.span
                  layoutId="saved-seg"
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#EB5053' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon size={13} /> {label}
                <span
                  className="rounded-full px-1.5 text-[10px] font-black"
                  style={{ background: tab === key ? '#FF8A80' : '#E8DED8' }}
                >
                  {count}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Munchie 템플릿 필터 */}
        {tab === 'coursemaps' && (
          <div className="flex gap-2 overflow-x-auto pb-1 pt-3 scrollbar-hide -mx-5 px-5">
            {FOOD_FILTER_TAGS.map(f => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold transition-all active:scale-95"
                style={f.value === 'all'
                  ? activeFilter === f.value
                    ? { background: '#1A1A1A', color: '#FFFFFF' }
                    : { background: '#F5F5F5', color: '#4A4A4A' }
                  : getCourseTagStyle(f.value, activeFilter === f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Munchie 먼치픽 탭 ─────────────────────────────────────────────── */}
      {tab === 'coursemaps' && (
        <div className="px-3">
          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-2 items-start gap-3 pb-4">
              {filteredPosts.map(post => (
                <div key={post.id} className="relative min-w-0">
                  <UnifiedMunchieCard post={post} compact homeSummary detailOrigin="saved" />
                  <button
                    type="button"
                    onClick={() => unsaveCourse(post.courseId)}
                    className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-[#F0C9BE] bg-[#FFFDFC]/95 text-[#D94449] shadow-sm"
                    aria-label="먼치픽 저장 해제"
                  >
                    <BookmarkX size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <div className="text-5xl mb-3">🔖</div>
              <p className="font-bold text-[16px] text-[#1A1A1A] mb-1">
                {activeFilter === 'all' ? '아직 저장한 먼치픽이 없어요!' : '해당 카테고리 먼치픽이 없어요'}
              </p>
              <p className="text-[13px] text-[#9B9B9B] mb-6">
                {activeFilter === 'all' ? 'Munchie Feed에서 마음에 드는 한줄평과 코스맵을 저장해보세요' : '다른 필터를 선택해보세요'}
              </p>
              {activeFilter === 'all' && (
                <button onClick={() => navigate('/feed')} className="lm-btn-primary px-6 inline-flex items-center justify-center">
                  Munchie Feed 둘러보기
                </button>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* ── Lunchie 런치픽 탭 ─────────────────────────────────────────────── */}
      {tab === 'restaurants' && (
        <div className="px-5 space-y-3">
          <AnimatePresence mode="popLayout">
            {savedRestaurantIds.map(id => (
              <RestaurantSavedCard
                key={id}
                restaurantId={id}
                onTap={() => navigate(`/lunchie/map?id=${id}`)}
                onUnsave={() => unsaveRestaurant(id)}
              />
            ))}
          </AnimatePresence>

          {savedRestaurantIds.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <div className="text-5xl mb-3">⚡</div>
              <p className="font-bold text-[16px] text-[#1A1A1A] mb-1">아직 저장한 런치픽이 없어요!</p>
              <p className="text-[13px] text-[#9B9B9B] mb-6">
                Quick Match로 그룹 점심을 정하고 결과 화면에서 저장해보세요
              </p>
              <button onClick={() => navigate('/lunchie/settings')} className="lm-btn-primary px-6 inline-flex items-center justify-center">
                Quick Match 시작하기
              </button>
            </motion.div>
          )}
        </div>
      )}

    </div>
  );
}
