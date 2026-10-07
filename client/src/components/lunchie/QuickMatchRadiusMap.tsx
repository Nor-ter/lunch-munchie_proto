import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MarkerClusterer, type Renderer } from '@googlemaps/markerclusterer';
import { AdvancedMarker, Circle, Map as GoogleMap, useAdvancedMarkerRef, useMap } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Utensils } from 'lucide-react';
import { englishText } from '@shared/englishCopy';
import { distanceMetres, isValidCoordinate } from '@shared/geo';
import type { Restaurant } from '@/contexts/AppContext';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MELBOURNE_CENTER = { lat: -37.8136, lng: 144.9631 };

export interface QuickMatchMapCenter {
  lat: number;
  lng: number;
}

export interface QuickMatchRestaurantPin {
  restaurant: Restaurant;
  distanceMetres: number;
}

export interface QuickMatchCategoryCount {
  category: string;
  count: number;
}

export function quickMatchRestaurantPins(
  restaurants: Restaurant[],
  center: QuickMatchMapCenter | null,
  radiusMetres: number,
  distanceEnabled: boolean,
): QuickMatchRestaurantPin[] {
  if (!center) return [];

  return restaurants
    .filter(restaurant => isValidCoordinate(restaurant.lat, restaurant.lng))
    .map(restaurant => ({
      restaurant,
      distanceMetres: distanceMetres(center.lat, center.lng, restaurant.lat, restaurant.lng),
    }))
    .filter(pin => !distanceEnabled || pin.distanceMetres <= radiusMetres)
    .sort((a, b) => a.distanceMetres - b.distanceMetres || a.restaurant.name.localeCompare(b.restaurant.name));
}

export function quickMatchCategoryCounts(pins: QuickMatchRestaurantPin[]): QuickMatchCategoryCount[] {
  const counts = new Map<string, number>();

  pins.forEach(({ restaurant }) => {
    const category = englishText(restaurant.category.trim() || 'Other');
    counts.set(category, (counts.get(category) ?? 0) + 1);
  });

  return Array.from(counts, ([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

function formatPinDistance(metres: number) {
  return metres < 1_000 ? `${Math.round(metres / 10) * 10}m` : `${(metres / 1_000).toFixed(1)}km`;
}

function RadiusCamera({
  center,
  radiusMetres,
  distanceEnabled,
}: {
  center: QuickMatchMapCenter | null;
  radiusMetres: number;
  distanceEnabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !center) return;
    if (!distanceEnabled) {
      map.panTo(center);
      map.setZoom(14);
      return;
    }

    const latitudeDelta = radiusMetres / 111_320;
    const longitudeScale = Math.max(0.2, Math.cos(center.lat * Math.PI / 180));
    const longitudeDelta = radiusMetres / (111_320 * longitudeScale);
    const bounds = new google.maps.LatLngBounds(
      { lat: center.lat - latitudeDelta, lng: center.lng - longitudeDelta },
      { lat: center.lat + latitudeDelta, lng: center.lng + longitudeDelta },
    );
    map.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });
  }, [center, distanceEnabled, map, radiusMetres]);

  return null;
}

const lunchieClusterRenderer: Renderer = {
  render({ count, position }) {
    const content = document.createElement('div');
    content.setAttribute('aria-label', `${count} restaurants in this area`);
    content.textContent = String(count);
    Object.assign(content.style, {
      alignItems: 'center',
      background: '#AA1A0D',
      border: '3px solid white',
      borderRadius: '999px',
      boxShadow: '0 6px 18px rgba(90, 35, 29, 0.32)',
      color: 'white',
      display: 'flex',
      fontSize: '12px',
      fontWeight: '900',
      height: '42px',
      justifyContent: 'center',
      minWidth: '42px',
      padding: '0 8px',
    });

    return new google.maps.marker.AdvancedMarkerElement({
      position,
      content,
      title: `${count} nearby restaurants`,
      zIndex: 1_000 + count,
    });
  },
};

interface ClusteredRestaurantMarkerProps {
  restaurant: Restaurant;
  isSelected: boolean;
  onSelect: () => void;
  onMarkerReady: (restaurantId: string, marker: google.maps.marker.AdvancedMarkerElement | null) => void;
}

function ClusteredRestaurantMarker({
  restaurant,
  isSelected,
  onSelect,
  onMarkerReady,
}: ClusteredRestaurantMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  useEffect(() => {
    onMarkerReady(restaurant.id, marker);
    return () => onMarkerReady(restaurant.id, null);
  }, [marker, onMarkerReady, restaurant.id]);

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: restaurant.lat, lng: restaurant.lng }}
      title={restaurant.name}
      onClick={onSelect}
      zIndex={isSelected ? 30 : 10}
    >
      <div className={`flex size-8 items-center justify-center rounded-full border-[3px] border-white text-white shadow-[0_5px_14px_rgba(90,35,29,0.28)] transition-transform ${isSelected ? 'scale-125 bg-[#7F120A]' : 'bg-[#AA1A0D]'}`}>
        <Utensils size={14} strokeWidth={2.8} aria-hidden="true" />
      </div>
    </AdvancedMarker>
  );
}

function RestaurantMarkerCluster({
  pins,
  selectedRestaurantId,
  onSelect,
}: {
  pins: QuickMatchRestaurantPin[];
  selectedRestaurantId: string | null;
  onSelect: (restaurantId: string) => void;
}) {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const [markers, setMarkers] = useState<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());

  useEffect(() => {
    if (!map) return;

    const clusterer = new MarkerClusterer({ map, renderer: lunchieClusterRenderer });
    clustererRef.current = clusterer;

    return () => {
      clusterer.clearMarkers();
      clusterer.setMap(null);
      clustererRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const clusterer = clustererRef.current;
    if (!clusterer) return;

    clusterer.clearMarkers(true);
    clusterer.addMarkers(Array.from(markers.values()));
  }, [markers]);

  const handleMarkerReady = useCallback((restaurantId: string, marker: google.maps.marker.AdvancedMarkerElement | null) => {
    setMarkers(current => {
      if (current.get(restaurantId) === marker || (!marker && !current.has(restaurantId))) return current;

      const next = new Map(current);
      if (marker) next.set(restaurantId, marker);
      else next.delete(restaurantId);
      return next;
    });
  }, []);

  return pins.map(({ restaurant }) => (
    <ClusteredRestaurantMarker
      key={restaurant.id}
      restaurant={restaurant}
      isSelected={selectedRestaurantId === restaurant.id}
      onSelect={() => onSelect(restaurant.id)}
      onMarkerReady={handleMarkerReady}
    />
  ));
}

interface Props {
  center: QuickMatchMapCenter | null;
  radiusMetres: number;
  distanceEnabled: boolean;
  restaurants: Restaurant[];
  isLoadingRestaurants: boolean;
  isLocating: boolean;
  onRequestLocation: () => void;
  embedded?: boolean;
}

export default function QuickMatchRadiusMap({
  center,
  radiusMetres,
  distanceEnabled,
  restaurants,
  isLoadingRestaurants,
  isLocating,
  onRequestLocation,
  embedded = false,
}: Props) {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const pins = useMemo(
    () => quickMatchRestaurantPins(restaurants, center, radiusMetres, distanceEnabled),
    [center, distanceEnabled, radiusMetres, restaurants],
  );
  const categoryCounts = useMemo(() => quickMatchCategoryCounts(pins), [pins]);
  const selectedPin = pins.find(pin => pin.restaurant.id === selectedRestaurantId) ?? null;

  useEffect(() => {
    if (selectedRestaurantId && !pins.some(pin => pin.restaurant.id === selectedRestaurantId)) {
      setSelectedRestaurantId(null);
    }
  }, [pins, selectedRestaurantId]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`flex min-h-[190px] items-center justify-center bg-[#F5F4F5] px-6 text-center ${embedded ? 'border-y border-[#E8E6E7]' : 'mt-4 rounded-[18px] border border-[#E8E6E7]'}`}>
        <div>
          <MapPin className="mx-auto text-[#AA1A0D]" size={24} />
          <p className="mt-2 text-[12px] font-black text-[#302B2E]">Map preview unavailable</p>
          <p className="mt-1 text-[10px] leading-relaxed text-[#7C7276]">Add the Google Maps browser key to preview the live search area.</p>
        </div>
      </div>
    );
  }

  return (
    <section className={`relative overflow-hidden bg-[#F7F3F1] ${embedded ? 'border-y border-[#E6D9D5]' : 'mt-4 rounded-[18px] border border-[#E6D9D5] shadow-[0_10px_28px_rgba(80,45,38,0.08)]'}`} aria-label="Live Quick Match map">
      <div className="h-[220px]">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={MELBOURNE_CENTER}
          defaultZoom={12}
          gestureHandling="cooperative"
          disableDefaultUI
          clickableIcons={false}
          reuseMaps
          style={{ width: '100%', height: '100%' }}
        >
          <RadiusCamera center={center} radiusMetres={radiusMetres} distanceEnabled={distanceEnabled} />
          {center && distanceEnabled && (
            <Circle
              center={center}
              radius={radiusMetres}
              clickable={false}
              fillColor="#AA1A0D"
              fillOpacity={0.12}
              strokeColor="#AA1A0D"
              strokeOpacity={0.72}
              strokeWeight={2}
            />
          )}
          <RestaurantMarkerCluster
            pins={pins}
            selectedRestaurantId={selectedRestaurantId}
            onSelect={setSelectedRestaurantId}
          />
          {center && (
            <AdvancedMarker position={center} title="Your live location" zIndex={50}>
              <div className="relative flex size-9 items-center justify-center rounded-full border-[3px] border-white bg-[#2367D1] text-white shadow-[0_5px_16px_rgba(35,103,209,0.35)]">
                <span className="absolute inset-[-7px] -z-10 animate-ping rounded-full bg-[#4384E8]/25" aria-hidden="true" />
                <Navigation size={16} fill="currentColor" strokeWidth={2.4} aria-hidden="true" />
              </div>
            </AdvancedMarker>
          )}
        </GoogleMap>
      </div>

      {center && categoryCounts.length > 0 && (
        <div className="relative z-10 border-t border-[#E6D9D5] bg-white px-3 py-2" aria-label="Restaurant category counts">
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.12em] text-[#8C7F83]">Categories</span>
            {categoryCounts.map(({ category, count }) => (
              <span
                key={category}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#EBD8D3] bg-[#FFF3F0] px-2.5 py-1 text-[10px] font-extrabold text-[#7F120A]"
              >
                {category}
                <strong className="inline-flex min-w-4 items-center justify-center rounded-full bg-[#AA1A0D] px-1 text-[9px] leading-4 text-white">
                  {count}
                </strong>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
        <span className="rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-black text-[#302B2E] shadow-sm backdrop-blur">
          {distanceEnabled ? `${radiusMetres / 1_000}km radius` : 'No radius limit'}
        </span>
        {center && (
          <span className="rounded-full bg-[#AA1A0D] px-3 py-1.5 text-[10px] font-black text-white shadow-sm">
            {isLoadingRestaurants
              ? 'Loading spots…'
              : pins.length === 0
                ? 'No spots in radius'
                : `${pins.length} ${pins.length === 1 ? 'spot' : 'spots'}`}
          </span>
        )}
      </div>

      {!center && (
        <div className="absolute inset-x-0 top-0 flex h-[220px] items-center justify-center bg-[#FFFDFC]/72 px-8 text-center backdrop-blur-[2px]">
          <div>
            <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-[#AA1A0D] text-white shadow-lg">
              <Navigation size={20} fill="currentColor" />
            </span>
            <p className="mt-3 text-[13px] font-black text-[#302B2E]">See your live lunch area</p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#756D70]">Use your location to show the radius and nearby restaurant pins.</p>
            <button
              type="button"
              onClick={onRequestLocation}
              disabled={isLocating}
              className="pointer-events-auto mt-3 min-h-9 rounded-full bg-[#AA1A0D] px-4 text-[10px] font-black text-white disabled:opacity-60"
            >
              {isLocating ? 'Finding you…' : 'Use My Location'}
            </button>
          </div>
        </div>
      )}

      {selectedPin && (
        <button
          type="button"
          onClick={() => setSelectedRestaurantId(null)}
          className="absolute inset-x-3 bottom-[56px] flex items-center gap-3 rounded-[14px] border border-white/80 bg-white/95 p-2.5 text-left shadow-[0_8px_24px_rgba(48,31,27,0.20)] backdrop-blur"
          aria-label={`Hide ${selectedPin.restaurant.name} map details`}
        >
          <img src={selectedPin.restaurant.image} alt="" className="size-11 shrink-0 rounded-[10px] object-cover" />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-[11px] font-black text-[#302B2E]">{selectedPin.restaurant.name}</strong>
            <span className="mt-0.5 block truncate text-[9px] font-semibold text-[#7C7276]">
              {selectedPin.restaurant.category} · {formatPinDistance(selectedPin.distanceMetres)}
            </span>
          </span>
          <span className="text-[10px] font-black text-[#AA1A0D]">★ {selectedPin.restaurant.rating || '—'}</span>
        </button>
      )}
    </section>
  );
}
