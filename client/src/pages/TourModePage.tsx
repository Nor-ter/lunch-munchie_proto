/**
 * Lunchie Munchie — Tour Mode Page
 * Design: Soft Coral (Option 8) + Pubfish Reference
 * Flow: 투어 타입 선택 → 조건 설정 → 공유맵
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { ArrowLeft, MapPin, Clock, Users, DollarSign, ChevronRight, Share2, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useApp, MOCK_RESTAURANTS } from '@/contexts/AppContext';
import { toast } from 'sonner';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createCoralIcon(num: number) {
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50%;background:#EB5053;color:white;font-weight:900;font-size:13px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(235,80,83,0.4);">${num}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

// ─── Tour Types ───────────────────────────────────────────────────────────────

const TOUR_TYPES = [
  {
    id: 'cafe',
    emoji: '☕',
    title: '카페 투어',
    subtitle: '성수동 카페를 하나씩 탐방해요',
    color: '#3E719B',
    tag: '추천',
  },
  {
    id: 'bar',
    emoji: '🍺',
    title: '바 코스',
    subtitle: '이태원 바를 순서대로 즐겨요',
    color: '#2C3E50',
    tag: '인기',
  },
  {
    id: 'food',
    emoji: '🍜',
    title: '맛 투어',
    subtitle: '다양한 음식을 코스로 즐겨요',
    color: '#EB5053',
    tag: '',
  },
  {
    id: 'date',
    emoji: '💕',
    title: '데이트 코스',
    subtitle: '특별한 날을 위한 코스예요',
    color: '#C0392B',
    tag: 'NEW',
  },
  {
    id: 'solo',
    emoji: '🧘',
    title: '나만의 코스',
    subtitle: '직접 코스를 만들어보세요',
    color: '#27AE60',
    tag: '',
  },
  {
    id: 'popular',
    emoji: '🔥',
    title: '핫플 코스',
    subtitle: '지금 가장 핫한 장소들',
    color: '#D94447',
    tag: '',
  },
];

// ─── Conditions Setup ─────────────────────────────────────────────────────────

function ConditionsSetup({ tourType, onConfirm }: {
  tourType: typeof TOUR_TYPES[0];
  onConfirm: () => void;
}) {
  const [duration, setDuration] = useState('2시간');
  const [budget, setBudget] = useState('$$');
  const [partySize, setPartySize] = useState(2);
  const [transport, setTransport] = useState('도보');

  const nearbyPlaces = MOCK_RESTAURANTS.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Tour type header */}
      <div className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: tourType.color }}>
        <span className="text-3xl">{tourType.emoji}</span>
        <div>
          <p className="text-white font-black text-[17px]">{tourType.title}</p>
          <p className="text-white/80 text-[12px]">{tourType.subtitle}</p>
        </div>
      </div>

      {/* Duration */}
      <div className="rounded-2xl p-4 bg-[#F5F5F5]">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} color="#9B9B9B" />
          <p className="text-[13px] font-semibold text-[#1A1A1A]">시간</p>
        </div>
        <div className="flex gap-2">
          {['1시간', '2시간', '3시간', '종일'].map(d => (
            <button key={d} onClick={() => setDuration(d)}
              className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95"
              style={duration === d
                ? { background: '#EB5053', color: 'white' }
                : { background: 'white', color: '#4A4A4A', border: '1px solid #E5E5E5' }}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="rounded-2xl p-4 bg-[#F5F5F5]">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={15} color="#9B9B9B" />
          <p className="text-[13px] font-semibold text-[#1A1A1A]">예산 (1인당)</p>
        </div>
        <div className="flex gap-2">
          {['$', '$$', '$$$'].map(b => (
            <button key={b} onClick={() => setBudget(b)}
              className="flex-1 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95"
              style={budget === b
                ? { background: '#EB5053', color: 'white' }
                : { background: 'white', color: '#4A4A4A', border: '1px solid #E5E5E5' }}>
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Party size */}
      <div className="rounded-2xl p-4 bg-[#F5F5F5]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={15} color="#9B9B9B" />
            <p className="text-[13px] font-semibold text-[#1A1A1A]">인원</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setPartySize(p => Math.max(1, p - 1))}
              className="w-8 h-8 rounded-full border border-[#E5E5E5] bg-white flex items-center justify-center font-bold active:scale-95">−</button>
            <span className="font-black text-[20px] w-8 text-center" style={{ color: '#EB5053' }}>{partySize}</span>
            <button onClick={() => setPartySize(p => Math.min(10, p + 1))}
              className="w-8 h-8 rounded-full border border-[#E5E5E5] bg-white flex items-center justify-center font-bold active:scale-95">+</button>
          </div>
        </div>
      </div>

      {/* Transport */}
      <div className="rounded-2xl p-4 bg-[#F5F5F5]">
        <p className="text-[13px] font-semibold text-[#1A1A1A] mb-3">이동 수단</p>
        <div className="flex gap-2">
          {[
            { label: '도보', emoji: '🚶' },
            { label: '대중교통', emoji: '🚇' },
            { label: '차', emoji: '🚗' },
          ].map(t => (
            <button key={t.label} onClick={() => setTransport(t.label)}
              className="flex-1 flex flex-col items-center py-2 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
              style={transport === t.label
                ? { background: '#EB5053', color: 'white' }
                : { background: 'white', color: '#4A4A4A', border: '1px solid #E5E5E5' }}>
              <span className="text-[18px] mb-0.5">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nearby places preview */}
      <div className="rounded-2xl p-4 bg-[#F5F5F5]">
        <p className="text-[13px] font-semibold text-[#1A1A1A] mb-3">근처 장소</p>
        <div className="space-y-2">
          {nearbyPlaces.map((place, i) => (
            <div key={place.id} className="flex items-center gap-3 bg-white rounded-xl p-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-black flex-shrink-0"
                style={{ background: '#EB5053' }}>
                {i + 1}
              </div>
              <img src={place.image} alt="" className="w-9 h-9 object-cover rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[12px] text-[#1A1A1A] truncate">{place.name}</p>
                <p className="text-[10px] text-[#9B9B9B]">{place.distance}</p>
              </div>
              <span className="text-[10px] text-[#9B9B9B]">{'₩'.repeat(place.priceRange)}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onConfirm}
        className="w-full py-4 rounded-2xl font-bold text-white text-[15px] active:scale-[0.98]"
        style={{ background: '#EB5053' }}
      >
        투어로 →
      </button>
    </div>
  );
}

// ─── Shared Map ───────────────────────────────────────────────────────────────

function SharedMap({ tourType, onShare }: { tourType: typeof TOUR_TYPES[0]; onShare: () => void }) {
  const { restaurants } = useApp();
  const [, navigate] = useLocation();
  const [activeIdx, setActiveIdx] = useState(0);

  const stops = restaurants.slice(0, 3);
  const activeStop = stops[activeIdx];
  const mapCenter: [number, number] = [37.5447, 127.0561];
  const polyline: [number, number][] = stops.map((_, i) => [
    37.5447 + i * 0.003,
    127.0561 + (i % 2 === 0 ? 0.002 : -0.001),
  ]);

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: '50vh' }}>
        <MapContainer center={mapCenter} zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap' />
          {stops.map((stop, i) => (
            <Marker key={stop.id}
              position={[37.5447 + i * 0.003, 127.0561 + (i % 2 === 0 ? 0.002 : -0.001)]}
              icon={createCoralIcon(i + 1)}
              eventHandlers={{ click: () => setActiveIdx(i) }}>
              <Popup><strong>{stop.name}</strong></Popup>
            </Marker>
          ))}
          {polyline.length > 1 && (
            <Polyline positions={polyline} color="#EB5053" weight={3} dashArray="8,6" />
          )}
        </MapContainer>

        {/* Map header overlay */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
          <div className="flex gap-1.5 overflow-x-auto">
            {stops.map((stop, i) => (
              <button key={stop.id} onClick={() => setActiveIdx(i)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-md"
                style={i === activeIdx
                  ? { background: '#EB5053', color: 'white' }
                  : { background: 'white', color: '#4A4A4A' }}>
                {i + 1}. {stop.name.slice(0, 5)}
              </button>
            ))}
          </div>
          <button onClick={() => navigate('/tour-map')}
            className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center active:scale-95 flex-shrink-0 ml-2">
            <span className="text-[15px]">🗺️</span>
          </button>
        </div>
      </div>

      {/* Bottom card */}
      <div className="bg-white px-5 py-4" style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.08)' }}>
        {activeStop && (
          <div className="flex items-center gap-3 mb-4">
            <img src={activeStop.image} alt="" className="w-16 h-16 object-cover rounded-2xl flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px] text-[#1A1A1A]">{activeStop.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={11} color="#9B9B9B" />
                <p className="text-[12px] text-[#9B9B9B] truncate">{activeStop.address}</p>
              </div>
              <p className="text-[12px] font-semibold mt-0.5" style={{ color: '#EB5053' }}>
                지금 위치에서 약 {activeStop.distance}
              </p>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-[#E5E5E5] text-[13px] font-semibold text-[#1A1A1A] active:scale-95">
            <Share2 size={15} /> 투어 공유하기
          </button>
          <button
            onClick={() => {
              if (activeIdx < stops.length - 1) setActiveIdx(i => i + 1);
              else toast.success('투어 완료! 🎉');
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-[13px] font-semibold active:scale-95"
            style={{ background: '#EB5053' }}>
            <Navigation size={15} />
            {activeIdx < stops.length - 1 ? '다음 장소' : '투어 완료!'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Tour Mode Page ──────────────────────────────────────────────────────

type TourPhase = 'select' | 'conditions' | 'map';

export default function TourModePage() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<TourPhase>('select');
  const [selectedTour, setSelectedTour] = useState<typeof TOUR_TYPES[0] | null>(null);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success('투어 링크가 복사됐어요! 📋');
    });
  };

  if (phase === 'map' && selectedTour) {
    return (
      <div className="min-h-dvh">
        <div className="flex items-center justify-between px-5 pt-12 pb-3 bg-white">
          <button onClick={() => setPhase('conditions')}
            className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center active:scale-95">
            <ArrowLeft size={18} color="#1A1A1A" />
          </button>
          <span className="font-bold text-[16px] text-[#1A1A1A]">투어 공유</span>
          <button onClick={handleShare}
            className="w-10 h-10 rounded-full bg-[#FFF5F5] flex items-center justify-center active:scale-95">
            <Share2 size={17} color="#EB5053" />
          </button>
        </div>
        <SharedMap tourType={selectedTour} onShare={handleShare} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button onClick={() => phase === 'select' ? navigate('/') : setPhase('select')}
          className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center active:scale-95">
          <ArrowLeft size={18} color="#1A1A1A" />
        </button>
        <span className="font-bold text-[17px] text-[#1A1A1A]">Tour Mode</span>
        <div className="w-10" />
      </div>

      <div className="px-5">
        <AnimatePresence mode="wait">
          {phase === 'select' ? (
            <motion.div key="select" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <h2 className="font-bold text-[18px] text-[#1A1A1A] mb-1">어떤 투어를<br />원하세요?</h2>
              <p className="text-[12px] text-[#9B9B9B] mb-5">카테고리를 선택하면 코스를 추천해드려요</p>

              {/* Location */}
              <div className="flex items-center gap-1.5 mb-5 p-3 bg-[#F5F5F5] rounded-xl">
                <MapPin size={14} color="#EB5053" />
                <span className="text-[13px] font-semibold text-[#1A1A1A]">Melbourne, VIC</span>
                <ChevronRight size={14} color="#9B9B9B" className="ml-auto" />
              </div>

              {/* Tour type grid */}
              <div className="grid grid-cols-2 gap-3">
                {TOUR_TYPES.map(tour => (
                  <motion.button
                    key={tour.id}
                    onClick={() => { setSelectedTour(tour); setPhase('conditions'); }}
                    className="relative rounded-2xl p-4 text-left active:scale-95 overflow-hidden"
                    style={{ background: tour.color }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {tour.tag && (
                      <span className="absolute top-2 right-2 text-[9px] font-black bg-white/30 text-white px-1.5 py-0.5 rounded-full">
                        {tour.tag}
                      </span>
                    )}
                    <span className="text-3xl block mb-2">{tour.emoji}</span>
                    <p className="text-white font-black text-[14px] leading-tight">{tour.title}</p>
                    <p className="text-white/70 text-[10px] mt-1 leading-tight">{tour.subtitle}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : phase === 'conditions' && selectedTour ? (
            <motion.div key="conditions" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <h2 className="font-bold text-[18px] text-[#1A1A1A] mb-4">조건 설정</h2>
              <ConditionsSetup tourType={selectedTour} onConfirm={() => setPhase('map')} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
