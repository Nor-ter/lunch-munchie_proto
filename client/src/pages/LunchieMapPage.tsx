import { useLocation } from 'wouter';
import { ArrowLeft, MapPin, Clock, Star } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useApp } from '@/contexts/AppContext';

// Set up leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createCoralIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:34px;height:34px;border-radius:50%;
      background:#EB5053;color:white;
      display:flex;align-items:center;justify-content:center;
      border:3px solid white;
      box-shadow:0 2px 8px rgba(235,80,83,0.4);
      font-size:16px;
    ">📍</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export default function LunchieMapPage() {
  const [, navigate] = useLocation();
  const { getRestaurantById } = useApp();

  // Parse restaurant ID from URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const restaurantId = searchParams.get('id');
  const restaurant = restaurantId ? getRestaurantById(restaurantId) : null;

  if (!restaurant) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-5 text-center">
        <p className="text-[14px] text-[#9B9B9B] mb-4">식당 정보를 찾을 수 없습니다.</p>
        <button onClick={() => navigate('/')} className="lm-btn-primary px-6 py-3 flex items-center justify-center">
          홈으로
        </button>
      </div>
    );
  }

  const position: [number, number] = [restaurant.lat, restaurant.lng];

  return (
    <div className="min-h-dvh bg-[#FCF4EE] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3 bg-white z-10 border-b border-[#E5E5E5]">
        <button
          onClick={() => window.history.back()}
          className="w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center active:scale-95"
        >
          <ArrowLeft size={17} color="#1A1A1A" />
        </button>
        <span className="font-semibold text-[15px] text-[#1A1A1A]">식당 위치 안내</span>
        <div className="w-9" />
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: '50vh' }}>
        <MapContainer
          center={position}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <Marker position={position} icon={createCoralIcon()}>
            <Popup>
              <strong>{restaurant.name}</strong><br />
              {restaurant.category}
            </Popup>
          </Marker>
        </MapContainer>
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
