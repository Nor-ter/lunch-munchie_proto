/**
 * Lunchie Munchie — Course Navigation Page
 * Design: Soft Coral (Option 8)
 * Layout: Map (65%) + Next Place Card (35%)
 */

import { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { ArrowLeft, Navigation, MapPin, ChevronRight } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useApp } from '@/contexts/AppContext';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createCoralIcon(num: number) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:34px;height:34px;border-radius:50%;
      background:#EB5053;color:white;
      font-weight:900;font-size:14px;
      display:flex;align-items:center;justify-content:center;
      border:3px solid white;
      box-shadow:0 2px 8px rgba(235,80,83,0.4);
    ">${num}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export default function CourseNavigatePage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { getCourseById, getRestaurantById } = useApp();
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  const course = getCourseById(params.id);
  if (!course) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <button onClick={() => navigate('/explore')} className="lm-btn-primary px-6 flex items-center justify-center">
          코스 탐색
        </button>
      </div>
    );
  }

  const stops = course.stops.sort((a, b) => a.order - b.order);
  const currentStop = stops[currentStopIndex];
  const nextStop = stops[currentStopIndex + 1];
  const currentRestaurant = getRestaurantById(currentStop?.placeId || '');
  const nextRestaurant = nextStop ? getRestaurantById(nextStop.placeId) : null;

  const mapCenter: [number, number] = currentRestaurant
    ? [currentRestaurant.lat, currentRestaurant.lng]
    : [37.5447, 127.0561];

  const polylinePositions: [number, number][] = stops
    .map(s => getRestaurantById(s.placeId))
    .filter(Boolean)
    .map(r => [r!.lat, r!.lng]);

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3 bg-white z-10">
        <button
          onClick={() => navigate(`/course/${params.id}`)}
          className="w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center active:scale-95"
        >
          <ArrowLeft size={17} color="#1A1A1A" />
        </button>
        <span className="font-semibold text-[15px] text-[#1A1A1A]">코스 따라가기</span>
        <button
          onClick={() => navigate('/tour-map')}
          className="w-9 h-9 rounded-full bg-[#FFF5F5] flex items-center justify-center active:scale-95"
          title="코스맵 공유"
        >
          <span className="text-[16px]">🗺️</span>
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: '55vh' }}>
        <MapContainer
          center={mapCenter}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {stops.map((stop, i) => {
            const r = getRestaurantById(stop.placeId);
            if (!r) return null;
            return (
              <Marker key={stop.placeId} position={[r.lat, r.lng]} icon={createCoralIcon(i + 1)}>
                <Popup>
                  <strong>{r.name}</strong><br />
                  {stop.startTime} — {stop.endTime}
                </Popup>
              </Marker>
            );
          })}
          {polylinePositions.length > 1 && (
            <Polyline positions={polylinePositions} color="#EB5053" weight={3} dashArray="8, 6" />
          )}
        </MapContainer>

        {/* Stop progress chips */}
        <div className="absolute top-3 left-3 right-3 flex gap-2 overflow-x-auto z-10">
          {stops.map((stop, i) => {
            const r = getRestaurantById(stop.placeId);
            return (
              <button
                key={stop.placeId}
                onClick={() => setCurrentStopIndex(i)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-md transition-all ${
                  i === currentStopIndex ? 'text-white' : 'bg-white text-[#4A4A4A]'
                }`}
                style={i === currentStopIndex ? { background: '#EB5053' } : {}}
              >
                <span>{i + 1}</span>
                <span className="max-w-[60px] truncate">{r?.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Next Place Card */}
      <div className="bg-white px-5 py-4" style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.08)' }}>
        <p className="text-[11px] text-[#9B9B9B] font-medium mb-2">다음 장소</p>
        {currentRestaurant && (
          <div className="flex items-center gap-3 mb-4">
            <img
              src={currentRestaurant.image}
              alt={currentRestaurant.name}
              className="w-16 h-16 object-cover rounded-2xl flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px] text-[#1A1A1A]">{currentRestaurant.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={11} color="#9B9B9B" />
                <p className="text-[12px] text-[#9B9B9B] truncate">{currentRestaurant.address}</p>
              </div>
              <p className="text-[12px] text-[#EB5053] font-semibold mt-0.5">
                지금 위치에서 약 {currentRestaurant.distance}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {currentStopIndex > 0 && (
            <button
              onClick={() => setCurrentStopIndex(i => i - 1)}
              className="lm-btn-outline flex items-center justify-center flex-[3]"
            >
              이전
            </button>
          )}
          <button
            className="lm-btn-primary flex items-center justify-center gap-2 flex-[7]"
            onClick={() => {
              if (currentStopIndex < stops.length - 1) setCurrentStopIndex(i => i + 1);
            }}
          >
            <Navigation size={16} />
            {currentStopIndex < stops.length - 1 ? '다음 장소로' : '코스맵 공유 🗺️'}
          </button>
        </div>
      </div>
    </div>
  );
}
