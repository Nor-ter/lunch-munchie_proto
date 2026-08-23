import { useEffect } from 'react';
import { AdvancedMarker, Circle, Map, useMap } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';

export interface FeedRadiusCenter {
  lat: number;
  lng: number;
}

interface Props {
  center: FeedRadiusCenter | null;
  radiusKm: number;
  onCenterChange: (center: FeedRadiusCenter) => void;
}

const MELBOURNE_CENTER = { lat: -37.8136, lng: 144.9631 };

function RecenterMap({ center }: { center: FeedRadiusCenter | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && center) map.panTo(center);
  }, [center, map]);
  return null;
}

export default function FeedRadiusMap({ center, radiusKm, onCenterChange }: Props) {
  const updateFromLatLng = (latLng: google.maps.LatLng | google.maps.LatLngLiteral | null) => {
    if (!latLng) return;
    const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
    const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;
    if (Number.isFinite(lat) && Number.isFinite(lng)) onCenterChange({ lat, lng });
  };

  return (
    <div className="h-[168px] overflow-hidden rounded-[18px] border border-[#D7E5DB] bg-[#EEF5F0]">
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={MELBOURNE_CENTER}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons={false}
        onClick={event => updateFromLatLng(event.detail.latLng)}
        style={{ width: '100%', height: '100%' }}
      >
        <RecenterMap center={center} />
        {center && <>
          <Circle
            center={center}
            radius={radiusKm * 1_000}
            clickable={false}
            fillColor="#E96A6D"
            fillOpacity={0.15}
            strokeColor="#D94C55"
            strokeOpacity={0.7}
            strokeWeight={2}
          />
          <AdvancedMarker
            position={center}
            draggable
            title="피드 검색 기준 위치"
            onDragEnd={event => updateFromLatLng(event.latLng)}
          >
            <div className="flex size-10 items-center justify-center rounded-full border-[3px] border-white bg-[#E95259] text-white shadow-[0_7px_18px_rgba(170,55,62,0.34)]">
              <MapPin size={20} strokeWidth={2.7} aria-hidden="true" />
            </div>
          </AdvancedMarker>
        </>}
      </Map>
    </div>
  );
}
