import { englishText } from '@shared/englishCopy';
/**
 * Lunchie Munchie — Tour Mode Page
 * Design: Soft Coral (Option 8) + Pubfish Reference
 * Flow: 투어 타입 선택 → 조건 설정 → 공유맵
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { MapPin, Clock, Users, DollarSign, ChevronRight, Share2, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import BackButton from '@/components/ui/BackButton';

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
    title: "Cafe Tour",
    subtitle: "Explore the cafes of Seongsu",
    color: '#3E719B',
    tag: '추천',
  },
  {
    id: 'bar',
    emoji: '🍺',
    title: "Bar Crawl",
    subtitle: "Explore Itaewon's bars",
    color: '#2C3E50',
    tag: '인기',
  },
  {
    id: 'food',
    emoji: '🍜',
    title: "Food Tour",
    subtitle: "Enjoy a variety of food stops",
    color: '#EB5053',
    tag: '',
  },
  {
    id: 'date',
    emoji: '💕',
    title: "Date Course",
    subtitle: "A course for a special day",
    color: '#C0392B',
    tag: 'NEW',
  },
  {
    id: 'solo',
    emoji: '🧘',
    title: "My Course",
    subtitle: "Create your own course",
    color: '#27AE60',
    tag: '',
  },
  {
    id: 'popular',
    emoji: '🔥',
    title: "Trending Spots",
    subtitle: "Explore today's popular places",
    color: '#D94447',
    tag: '',
  },
];

// ─── Conditions Setup ─────────────────────────────────────────────────────────

function ConditionsSetup({ tourType, onConfirm }: {
  tourType: typeof TOUR_TYPES[0];
  onConfirm: () => void;
}) {
  const [duration, setDuration] = useState("2 hours");
  const [budget, setBudget] = useState('$$');
  const [partySize, setPartySize] = useState(2);
  const [transport, setTransport] = useState("Walking");

  const { restaurants } = useApp();
  const nearbyPlaces = restaurants.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Tour type header */}
      <div className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: tourType.color }}>
        <span className="text-3xl">{englishText(tourType.emoji)}</span>
        <div>
          <p className="text-white font-black text-[17px]">{englishText(tourType.title)}</p>
          <p className="text-white/80 text-[12px]">{englishText(tourType.subtitle)}</p>
        </div>
      </div>

      {/* Duration */}
      <div className="rounded-2xl p-4 bg-[#F5F5F5]">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} color="#9B9B9B" />
          <p className="text-[13px] font-semibold text-[#1A1A1A]"> hours</p>
        </div>
        <div className="flex gap-2">
          {["1 hour", "2 hours", "3 hours", "All Day"].map(d => (
            <button key={d} onClick={() => setDuration(d)}
              className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95"
              style={duration === d
                ? { background: '#EB5053', color: 'white' }
                : { background: 'white', color: '#4A4A4A', border: '1px solid #E5E5E5' }}>
              {englishText(d)}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="rounded-2xl p-4 bg-[#F5F5F5]">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={15} color="#9B9B9B" />
          <p className="text-[13px] font-semibold text-[#1A1A1A]">Budget per Person</p>
        </div>
        <div className="flex gap-2">
          {['$', '$$', '$$$'].map(b => (
            <button key={b} onClick={() => setBudget(b)}
              className="flex-1 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95"
              style={budget === b
                ? { background: '#EB5053', color: 'white' }
                : { background: 'white', color: '#4A4A4A', border: '1px solid #E5E5E5' }}>
              {englishText(b)}
            </button>
          ))}
        </div>
      </div>

      {/* Party size */}
      <div className="rounded-2xl p-4 bg-[#F5F5F5]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={15} color="#9B9B9B" />
            <p className="text-[13px] font-semibold text-[#1A1A1A]">People</p>
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
        <p className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Travel Mode</p>
        <div className="flex gap-2">
          {[
            { label: "Walking", emoji: '🚶' },
            { label: "Public Transport", emoji: '🚇' },
            { label: "Driving", emoji: '🚗' },
          ].map(t => (
            <button key={t.label} onClick={() => setTransport(t.label)}
              className="flex-1 flex flex-col items-center py-2 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
              style={transport === t.label
                ? { background: '#EB5053', color: 'white' }
                : { background: 'white', color: '#4A4A4A', border: '1px solid #E5E5E5' }}>
              <span className="text-[18px] mb-0.5">{englishText(t.emoji)}</span>
              {englishText(t.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Nearby places preview */}
      <div className="rounded-2xl p-4 bg-[#F5F5F5]">
        <p className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Nearby Places</p>
        <div className="space-y-2">
          {nearbyPlaces.map((place, i) => (
            <div key={place.id} className="flex items-center gap-3 bg-white rounded-xl p-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-black flex-shrink-0"
                style={{ background: '#EB5053' }}>
                {i + 1}
              </div>
              <img src={place.image} alt="" className="w-9 h-9 object-cover rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[12px] text-[#1A1A1A] truncate">{englishText(place.name)}</p>
                <p className="text-[10px] text-[#9B9B9B]">{englishText(place.distance)}</p>
              </div>
              <span className="text-[10px] text-[#9B9B9B]">{englishText('₩'.repeat(place.priceRange))}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onConfirm}
        className="w-full py-4 rounded-2xl font-bold text-white text-[15px] active:scale-[0.98]"
        style={{ background: '#EB5053' }}
      >

        Start Tour →
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
              <Popup><strong>{englishText(stop.name)}</strong></Popup>
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
                {i + 1}. {englishText(stop.name.slice(0, 5))}
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
              <p className="font-bold text-[15px] text-[#1A1A1A]">{englishText(activeStop.name)}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={11} color="#9B9B9B" />
                <p className="text-[12px] text-[#9B9B9B] truncate">{englishText(activeStop.address)}</p>
              </div>
              <p className="text-[12px] font-semibold mt-0.5" style={{ color: '#EB5053' }}>

                About  {englishText(activeStop.distance)}
              </p>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-[#E5E5E5] text-[13px] font-semibold text-[#1A1A1A] active:scale-95">
            <Share2 size={15} />  Share Tour
          </button>
          <button
            onClick={() => {
              if (activeIdx < stops.length - 1) setActiveIdx(i => i + 1);
              else toast.success("Tour Complete! 🎉");
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-[13px] font-semibold active:scale-95"
            style={{ background: '#EB5053' }}>
            <Navigation size={15} />
            {englishText(activeIdx < stops.length - 1 ? "Next Place" : "Tour Complete!")}
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
      toast.success("Tour link copied! 📋");
    });
  };

  if (phase === 'map' && selectedTour) {
    return (
      <div className="min-h-dvh">
        <div className="flex items-center justify-between bg-white px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
          <BackButton onClick={() => setPhase('conditions')} aria-label="Back to Preferences" />
          <span className="font-bold text-[16px] text-[#1A1A1A]">Share Tour</span>
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
      <div className="flex items-center justify-between px-5 pb-4 pt-[max(12px,env(safe-area-inset-top))]">
        <BackButton onClick={() => phase === 'select' ? navigate('/') : setPhase('select')} aria-label="Back" />
        <span className="font-bold text-[17px] text-[#1A1A1A]">Tour Mode</span>
        <div className="w-10" />
      </div>

      <div className="px-5">
        <AnimatePresence mode="wait">
          {phase === 'select' ? (
            <motion.div key="select" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <h2 className="font-bold text-[18px] text-[#1A1A1A] mb-1">What Kind of Tour <br />Would You Like?</h2>
              <p className="text-[12px] text-[#9B9B9B] mb-5">Choose a category for course recommendations</p>

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
                    {englishText(tour.tag && (
                      <span className="absolute top-2 right-2 text-[9px] font-black bg-white/30 text-white px-1.5 py-0.5 rounded-full">
                        {englishText(tour.tag)}
                      </span>
                    ))}
                    <span className="text-3xl block mb-2">{englishText(tour.emoji)}</span>
                    <p className="text-white font-black text-[14px] leading-tight">{englishText(tour.title)}</p>
                    <p className="text-white/70 text-[10px] mt-1 leading-tight">{englishText(tour.subtitle)}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : phase === 'conditions' && selectedTour ? (
            <motion.div key="conditions" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <h2 className="font-bold text-[18px] text-[#1A1A1A] mb-4">Preferences</h2>
              <ConditionsSetup tourType={selectedTour} onConfirm={() => setPhase('map')} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
