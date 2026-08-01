import { useEffect, useMemo, useState } from 'react';
import { AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, MapPin, X } from 'lucide-react';
import { useLocation } from 'wouter';
import type { SavedFeedMapPoint } from '@/lib/savedFeedMap';
import { getSavedFeedDetailPath } from '@/lib/savedNavigation';

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function FitSavedPlaces({ points }: { points: SavedFeedMapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.panTo({ lat: points[0].latitude, lng: points[0].longitude });
      map.setZoom(15);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend({
      lat: point.latitude,
      lng: point.longitude,
    }));
    map.fitBounds(bounds, 96);
  }, [map, points]);

  return null;
}

export function SavedMunchieMap({ points }: { points: SavedFeedMapPoint[] }) {
  const [, navigate] = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedPoint = useMemo(
    () => points.find((point) => point.id === selectedId) ?? null,
    [points, selectedId],
  );

  useEffect(() => {
    if (selectedId && !points.some((point) => point.id === selectedId)) {
      setSelectedId(null);
    }
  }, [points, selectedId]);

  if (points.length === 0) {
    return (
      <div className="flex h-full min-h-[430px] items-center justify-center rounded-[26px] border border-dashed border-[#DCCBC0] bg-[#FFFDFC] px-8 text-center">
        <div>
          <MapPin className="mx-auto text-[#E87874]" size={34} />
          <p className="mt-3 text-[15px] font-black text-[#3A2922]">표시할 장소 정보가 없어요</p>
          <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#9A8579]">
            피드의 식당·카페 위치가 연결되면 이 지도에 자동으로 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-full min-h-[430px] items-center justify-center rounded-[26px] border border-dashed border-[#DCCBC0] bg-[#FFFDFC] px-8 text-center">
        <div>
          <MapPin className="mx-auto text-[#E87874]" size={34} />
          <p className="mt-3 text-[15px] font-black text-[#3A2922]">지도를 불러올 수 없어요</p>
          <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#9A8579]">
            지도 설정이 완료되면 저장한 먼치픽의 장소가 여기에 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[430px] overflow-hidden rounded-[26px] border border-[#E5D5CC] bg-[#EEE7E1] shadow-[0_12px_30px_rgba(91,57,42,0.12)]">
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={points[0]
          ? { lat: points[0].latitude, lng: points[0].longitude }
          : SEOUL_CENTER}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI
        style={{ width: '100%', height: '100%' }}
      >
        <FitSavedPlaces points={points} />
        {points.map((point) => {
          const selected = point.id === selectedId;
          return (
            <AdvancedMarker
              key={point.id}
              position={{ lat: point.latitude, lng: point.longitude }}
              title={`${point.name} · ${point.post.authorName}님의 먼치픽`}
              onClick={() => setSelectedId(point.id)}
              zIndex={selected ? 20 : 1}
            >
              <div
                data-selected={selected ? 'true' : 'false'}
                className="relative transition-all"
                style={{
                  width: selected ? 44 : 34,
                  height: selected ? 44 : 34,
                  transform: selected ? 'translateY(-4px)' : undefined,
                }}
                aria-label={`${point.name}${selected ? `, ${point.post.authorName}님의 피드 선택됨` : ''}`}
              >
                <div
                  className="flex h-full w-full items-center justify-center rounded-full border-[3px] border-white bg-[#EF6B6D] font-black text-white"
                  style={{
                    fontSize: selected ? 18 : 15,
                    boxShadow: selected
                      ? '0 0 0 7px rgba(239,107,109,0.22), 0 6px 16px rgba(70,38,27,0.32)'
                      : '0 3px 9px rgba(70,38,27,0.25)',
                  }}
                >
                  {point.post.authorEmoji}
                </div>
                <AnimatePresence>
                  {selected && (
                    <div className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2">
                      <motion.span
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        className="block whitespace-nowrap rounded-full border border-[#E7D5CB] bg-[#FFFDFC]/95 px-3 py-1.5 text-[11px] font-black text-[#4B382F] shadow-[0_5px_14px_rgba(65,38,28,0.18)] backdrop-blur"
                      >
                        {point.post.authorName}
                      </motion.span>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </AdvancedMarker>
          );
        })}
      </Map>

      <AnimatePresence>
        {selectedPoint && (
          <motion.div
            key={selectedPoint.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            className="absolute inset-x-3 bottom-[92px] overflow-hidden rounded-[20px] border border-[#E7D5CB] bg-[#FFFDFC]/95 p-3 shadow-[0_14px_34px_rgba(65,38,28,0.2)] backdrop-blur"
          >
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="장소 미리보기 닫기"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#F4EAE5] text-[#8B7469]"
            >
              <X size={14} />
            </button>
            <div className="flex gap-3 pr-7">
              <img
                src={selectedPoint.imageUrl}
                alt={selectedPoint.name}
                className="h-[72px] w-[72px] shrink-0 rounded-[14px] object-cover"
              />
              <div className="min-w-0 flex-1">
                <span className="rounded-full bg-[#FFE4DE] px-2 py-0.5 text-[9px] font-black text-[#D85A59]">
                  {selectedPoint.category}
                </span>
                <p className="mt-1 truncate text-[14px] font-black text-[#382820]">{selectedPoint.name}</p>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-[#99847A]">{selectedPoint.address}</p>
                <p className="mt-1 line-clamp-1 text-[10px] font-bold text-[#725C52]">
                  {selectedPoint.post.authorEmoji} {selectedPoint.post.caption}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(getSavedFeedDetailPath(selectedPoint.feedId, 'map'))}
              className="mt-3 flex h-10 w-full items-center justify-center gap-1 rounded-[13px] bg-[#EF6B6D] text-[12px] font-black text-white"
            >
              저장 피드 보기 <ChevronRight size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
