/**
 * pages/PlaceExplorePage.tsx — Google Places 실 식당 탐색 (web-maps-places-workflow.md Phase 3).
 * 대응 원본: mobile/components/AddRestaurantSheet.tsx(autocomplete→details→upsert 흐름) —
 * 모바일은 코스 편집 중 여는 시트, 웹은 전용 화면 + 실시간 지도로 재구성.
 *
 * 흐름: 검색(자동완성, 세션토큰+debounce로 비용 억제) → 후보 탭 → place-details(선택 시
 * **1회만** 호출) → Cloudflare API가 D1 restaurants에 upsert한 행을 그대로 받아
 * registerRestaurants()로 로컬에 즉시 반영(같은 세션에서 바로 코스 생성 가능하게) →
 * 지도(CourseMap)에 순번 마커 + (2곳 이상이면) useDirections로 실제 도보 경로 폴리라인 +
 * 리스트 → 통합 Munchie 피드 에디터에서 코스맵과 피드를 동시에 만든다.
 */
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft, Search, MapPin, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useApp, type Restaurant } from '@/contexts/AppContext';
import { usePlacesSearch } from '@/hooks/usePlacesSearch';
import { useDirections } from '@/hooks/useDirections';
import { getPlaceDetails } from '@/services/placesApi';
import { mapGoogleRestaurant } from '@/lib/googlePlaces';
import { CourseMap, type MapPoint } from '@/components/map/CourseMap';

export default function PlaceExplorePage() {
  const [, navigate] = useLocation();
  const { addCourse, registerRestaurants, profile } = useApp();
  const [selected, setSelected] = useState<Restaurant[]>([]);
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  // 코스 첫 식당 좌표가 있으면 그 근방으로 바이어스(모바일 AddRestaurantSheet §4 add 흐름 4와 동일).
  const bias = selected[0] ? { lat: selected[0].lat, lng: selected[0].lng } : undefined;
  const { input, setInput, sessionToken, suggestions, isLoading, isError, error, endSession } =
    usePlacesSearch(bias);

  const handleSelectSuggestion = async (placeId: string) => {
    if (detailsLoadingId) return; // 중복 탭 방지 — place-details는 선택당 1회만
    setDetailsLoadingId(placeId);
    try {
      const row = await getPlaceDetails(placeId, sessionToken);
      const restaurant = mapGoogleRestaurant(row);
      registerRestaurants([restaurant]);
      setSelected((prev) => (prev.some((r) => r.id === restaurant.id) ? prev : [...prev, restaurant]));
      endSession(); // 세션 종료 — 다음 검색은 새 세션 토큰으로(과금 규약)
      setInput('');
      toast.success(`${restaurant.name} 추가했어요`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '식당 정보를 가져오지 못했어요');
    } finally {
      setDetailsLoadingId(null);
    }
  };

  const removeSelected = (id: string) => setSelected((prev) => prev.filter((r) => r.id !== id));

  const points: MapPoint[] = useMemo(
    () => selected.map((r) => ({ id: r.id, name: r.name, latitude: r.lat, longitude: r.lng, subtitle: r.category })),
    [selected],
  );

  // 담은 식당이 2곳 이상이면 실제 도보 경로(directions Edge Function)를 가져와 CourseMap에
  // 폴리라인으로 그린다. 1곳 이하일 땐 useDirections가 자체적으로 비활성화된다(MIN_STOPS=2).
  const directionsPoints = useMemo(
    () => selected.map((r) => ({ latitude: r.lat, longitude: r.lng })),
    [selected],
  );
  const { coordinates: routeCoordinates } = useDirections(directionsPoints, 'walking');

  const handleCreateCourse = () => {
    if (!title.trim()) {
      toast.error('코스 제목을 입력해주세요');
      return;
    }
    if (selected.length === 0) {
      toast.error('식당을 1곳 이상 추가해주세요');
      return;
    }

    const tagPool = Array.from(new Set(selected.flatMap((r) => r.tags)));
    const newId = `course_${Date.now()}`;
    addCourse({
      id: newId,
      title: title.trim(),
      description: '',
      heroImage: selected[0]?.image ?? '',
      tags: (tagPool.length > 0 ? tagPool : ['맛집']).slice(0, 2) as Restaurant['tags'],
      hashtags: [],
      region: selected[0]?.address.split(' ').slice(0, 2).join(' ') ?? '',
      metadata: {
        distance: Math.round(selected.length * 0.5 * 10) / 10,
        duration: selected.length * 60,
        placeCount: selected.length,
      },
      stops: selected.map((r, i) => ({ placeId: r.id, order: i + 1, startTime: '', endTime: '', isBookmarked: false })),
      createdAt: new Date().toISOString().slice(0, 10),
      isPublic: true,
      creatorId: profile.id,
      savedCount: 0,
    });
    toast.success('코스를 만들었어요! 🎉');
    navigate(`/course/${newId}/share?from=create`, { replace: true });
  };

  return (
    <div className="min-h-dvh bg-[#FFF8F2] pb-8">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#F0E8E0] bg-white px-4 py-3">
        <button onClick={() => navigate('/feed')} className="shrink-0 active:scale-90" aria-label="뒤로">
          <ChevronLeft size={22} color="#1A1A1A" />
        </button>
        <p className="text-[16px] font-bold text-[#1A1A1A]">실제 식당 탐색</p>
      </div>

      <div className="px-4 pt-4">
        <div className="overflow-hidden rounded-2xl border border-[#F0E8E0]" style={{ height: 220 }}>
          <CourseMap points={points} width="100%" height={220} routeCoordinates={routeCoordinates} />
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex h-11 items-center gap-2 rounded-xl border border-[#F0E8E0] bg-white px-3">
          <Search size={16} className="shrink-0 text-[#9B9B9B]" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="식당 이름으로 검색 (Google)"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        {isLoading && <p className="py-4 text-center text-xs text-[#9B9B9B]">검색 중…</p>}
        {isError && (
          <p className="py-4 text-center text-xs text-red-500">
            {error instanceof Error ? error.message : '검색에 실패했어요'}
          </p>
        )}

        {!isLoading && !isError && suggestions.length > 0 && (
          <div className="mt-2 divide-y divide-[#F5F0EC] rounded-xl border border-[#F0E8E0] bg-white">
            {suggestions.map((s) => (
              <button
                key={s.placeId}
                onClick={() => handleSelectSuggestion(s.placeId)}
                disabled={!!detailsLoadingId}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left active:bg-[#FFF5F5] disabled:opacity-50"
              >
                <MapPin size={14} className="shrink-0 text-[#EB5053]" />
                <span className="truncate text-sm text-[#1A1A1A]">{s.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="px-4 pt-5">
          <p className="mb-2 text-[13px] font-bold text-[#1A1A1A]">담은 식당 {selected.length}곳</p>
          <div className="space-y-2">
            {selected.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-[#F0E8E0] bg-white p-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EB5053] text-[12px] font-bold text-white">
                  {i + 1}
                </span>
                {r.image ? (
                  <img src={r.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-[#F5F0EC]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#1A1A1A]">{r.name}</p>
                  <p className="truncate text-[11px] text-[#9B9B9B]">
                    {r.rating > 0 ? `★ ${r.rating.toFixed(1)}` : '평점 없음'} · {r.category}
                  </p>
                </div>
                <button onClick={() => removeSelected(r.id)} className="shrink-0 active:scale-90" aria-label="제거">
                  <X size={16} className="text-[#9B9B9B]" />
                </button>
              </div>
            ))}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="코스 제목을 입력하세요"
            className="mt-4 h-11 w-full rounded-xl border border-[#F0E8E0] bg-white px-3 text-sm outline-none"
          />
          <button
            onClick={handleCreateCourse}
            className="mt-3 h-12 w-full rounded-xl text-[14px] font-bold text-white active:scale-[0.99]"
            style={{ background: '#EB5053' }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Check size={16} /> 코스 만들기
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
