import { useEffect, useMemo, useState } from 'react';
import { AdvancedMarker, Map, Polyline, useMap } from '@vis.gl/react-google-maps';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, MapPin, X } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  groupSavedFeedMapPointsByCourse,
  type SavedFeedMapPoint,
} from '@/lib/savedFeedMap';
import { getSavedFeedDetailPath } from '@/lib/savedNavigation';
import { getCourseSequenceColor } from '@/constants/courseTheme';
import { useDirections } from '@/hooks/useDirections';
import RestaurantDetailSheet from '@/components/munchie/RestaurantDetailSheet';
import type { CoursePlace } from '@/types/course';

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface MapPosition {
  latitude: number;
  longitude: number;
}

function FitSavedPositions({
  positions,
  singleZoom,
}: {
  positions: MapPosition[];
  singleZoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || positions.length === 0) return;
    if (positions.length === 1) {
      map.panTo({ lat: positions[0].latitude, lng: positions[0].longitude });
      map.setZoom(singleZoom);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    positions.forEach((position) => bounds.extend({
      lat: position.latitude,
      lng: position.longitude,
    }));
    map.fitBounds(bounds, 72);
  }, [map, positions, singleZoom]);

  return null;
}

export function SavedMunchieMap({
  points,
  selectedFeedId,
  onSelectedFeedIdChange,
}: {
  points: SavedFeedMapPoint[];
  selectedFeedId: string | null;
  onSelectedFeedIdChange: (feedId: string | null) => void;
}) {
  const [, navigate] = useLocation();
  const courseGroups = useMemo(() => groupSavedFeedMapPointsByCourse(points), [points]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const selectedCourse = useMemo(
    () => courseGroups.find((course) => course.id === selectedFeedId) ?? null,
    [courseGroups, selectedFeedId],
  );
  const visiblePositions = useMemo<MapPosition[]>(
    () => selectedCourse?.points ?? courseGroups,
    [courseGroups, selectedCourse],
  );
  const directionStops = useMemo(
    () => selectedCourse?.points.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    })) ?? [],
    [selectedCourse],
  );
  const { coordinates: routeCoordinates } = useDirections(directionStops, 'walking');
  const routePath = useMemo(
    () => (routeCoordinates.length >= 2 ? routeCoordinates : directionStops).map((point) => ({
      lat: point.latitude,
      lng: point.longitude,
    })),
    [directionStops, routeCoordinates],
  );
  const selectedPlace = useMemo(
    () => selectedCourse?.points.find((point) => point.id === selectedPlaceId) ?? null,
    [selectedCourse, selectedPlaceId],
  );
  const selectedPlaceFallback = useMemo<CoursePlace | undefined>(
    () => selectedPlace ? {
      id: selectedPlace.restaurantId,
      name: selectedPlace.name,
      rating: 0,
      distance: '',
      category: selectedPlace.category,
      priceLevel: 1,
      imageUrl: selectedPlace.imageUrl,
      coords: { x: 50, y: 50 },
      latitude: selectedPlace.latitude,
      longitude: selectedPlace.longitude,
      address: selectedPlace.address,
    } : undefined,
    [selectedPlace],
  );

  useEffect(() => {
    if (selectedFeedId && !courseGroups.some((course) => course.id === selectedFeedId)) {
      onSelectedFeedIdChange(null);
    }
  }, [courseGroups, onSelectedFeedIdChange, selectedFeedId]);

  useEffect(() => {
    setSelectedPlaceId(null);
  }, [selectedFeedId]);

  if (points.length === 0) {
    return (
      <div className="flex h-full min-h-[430px] items-center justify-center rounded-[26px] border border-dashed border-[#DCCBC0] bg-[#FFFDFC] px-8 text-center">
        <div>
          <MapPin className="mx-auto text-[#E87874]" size={34} />
          <p className="mt-3 text-[15px] font-black text-[#3A2922]">표시할 코스 정보가 없어요</p>
          <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#9A8579]">
            저장한 코스의 장소 위치가 연결되면 이 지도에 자동으로 표시됩니다.
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
            지도 설정이 완료되면 저장한 코스가 여기에 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-ui="saved-course-map"
      data-mode={selectedCourse ? 'course-detail' : 'course-overview'}
      className="relative h-full min-h-[430px] overflow-hidden rounded-[26px] border border-[#E5D5CC] bg-[#EEE7E1] shadow-[0_12px_30px_rgba(91,57,42,0.12)]"
    >
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={visiblePositions[0]
          ? { lat: visiblePositions[0].latitude, lng: visiblePositions[0].longitude }
          : SEOUL_CENTER}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI
        style={{ width: '100%', height: '100%' }}
      >
        <FitSavedPositions positions={visiblePositions} singleZoom={selectedCourse ? 15 : 13} />

        {!selectedCourse && courseGroups.map((course) => (
          <AdvancedMarker
            key={course.id}
            position={{ lat: course.latitude, lng: course.longitude }}
            title={`${course.post.caption} · ${course.points.length}개 장소`}
            onClick={() => onSelectedFeedIdChange(course.id)}
          >
            <div
              data-ui="saved-course-centroid"
              className="relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-[#EF6B6D] text-[18px] shadow-[0_5px_14px_rgba(70,38,27,0.3)] transition-transform active:scale-95"
              aria-label={`${course.post.caption} 코스, 장소 ${course.points.length}개`}
            >
              {course.post.authorEmoji}
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#4B382F] px-1 text-[9px] font-black text-white">
                {course.points.length}
              </span>
            </div>
          </AdvancedMarker>
        ))}

        {selectedCourse && (
          <>
            {routePath.length >= 2 && (
              <Polyline
                path={routePath}
                strokeColor="#E85053"
                strokeWeight={4}
                strokeOpacity={0.9}
              />
            )}
            {selectedCourse.points.map((point, index) => {
              const color = getCourseSequenceColor(index).base;
              return (
                <AdvancedMarker
                  key={point.id}
                  position={{ lat: point.latitude, lng: point.longitude }}
                  title={`${index + 1}. ${point.name}`}
                  onClick={() => setSelectedPlaceId(point.id)}
                  zIndex={index + 1}
                >
                  <div
                    data-ui="saved-course-place"
                    data-selected={selectedPlaceId === point.id ? 'true' : 'false'}
                    aria-label={`${index + 1}번 장소 ${point.name} 상세정보 보기`}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white text-[13px] font-black text-white shadow-[0_4px_12px_rgba(61,35,26,0.3)] transition-transform ${
                      selectedPlaceId === point.id ? '-translate-y-1 scale-110' : ''
                    }`}
                    style={{ background: color }}
                  >
                    {index + 1}
                  </div>
                </AdvancedMarker>
              );
            })}
          </>
        )}
      </Map>

      <AnimatePresence>
        {selectedCourse && (
          <>
            <motion.button
              type="button"
              onClick={() => {
                setSelectedPlaceId(null);
                onSelectedFeedIdChange(null);
              }}
              aria-label="전체 저장 코스 보기"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-[#E7D5CB] bg-[#FFFDFC]/95 text-[#5A443A] shadow-md backdrop-blur"
            >
              <X size={14} />
            </motion.button>
            <motion.div
              key={selectedCourse.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              className="absolute inset-x-3 bottom-[92px] overflow-hidden rounded-[20px] border border-[#E7D5CB] bg-[#FFFDFC]/95 p-3 shadow-[0_14px_34px_rgba(65,38,28,0.2)] backdrop-blur"
            >
              <div className="flex gap-3">
                <img
                  src={selectedCourse.post.photos[0] ?? selectedCourse.points[0]?.imageUrl}
                  alt=""
                  className="h-[72px] w-[72px] shrink-0 rounded-[14px] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <span className="rounded-full bg-[#FFE4DE] px-2 py-0.5 text-[9px] font-black text-[#D85A59]">
                    저장 코스 · {selectedCourse.points.length}곳
                  </span>
                  <p className="mt-1 line-clamp-2 text-[13px] font-black leading-5 text-[#382820]">
                    {selectedCourse.post.caption}
                  </p>
                  <p className="mt-1 truncate text-[10px] font-semibold text-[#99847A]">
                    {selectedCourse.points.map((point) => point.name).join(' · ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(getSavedFeedDetailPath(selectedCourse.feedId, 'map'))}
                className="mt-3 flex h-10 w-full items-center justify-center gap-1 rounded-[13px] bg-[#EF6B6D] text-[12px] font-black text-white"
              >
                저장 피드 보기 <ChevronRight size={15} />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPlace && (
          <RestaurantDetailSheet
            restaurantId={selectedPlace.restaurantId}
            fallbackPlace={selectedPlaceFallback}
            presentation="modal"
            onClose={() => setSelectedPlaceId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
