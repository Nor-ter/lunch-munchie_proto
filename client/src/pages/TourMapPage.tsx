/**
 * Lunchie Munchie — Tour Map Share Page
 * Strava-style transparent SVG course overlay
 * - Customizable line color, width, style, markers
 * - Background photo upload
 * - Export as PNG / share
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { ArrowLeft, Download, Share2, Camera, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourStop {
  id: string;
  name: string;
  image: string;
  nx: number; // 0-1 normalized x
  ny: number; // 0-1 normalized y
}

interface StyleConfig {
  lineColor: string;
  lineWidth: number;
  markerStyle: 'circle' | 'dot';
  showLabels: boolean;
  showPhotos: boolean;
  lineStyle: 'solid' | 'dashed' | 'gradient';
  bgMode: 'transparent' | 'photo' | 'dark';
}



const COLOR_PRESETS = [
  { label: 'Coral', value: '#EB5053' },
  { label: 'Neon', value: '#00F5A0' },
  { label: 'Gold', value: '#FFD700' },
  { label: 'Sky', value: '#00BFFF' },
  { label: 'Purple', value: '#C77DFF' },
  { label: 'White', value: '#FFFFFF' },
];

// ─── SVG Course Overlay ───────────────────────────────────────────────────────

function CourseOverlaySVG({ stops, config, width, height }: {
  stops: TourStop[];
  config: StyleConfig;
  width: number;
  height: number;
}) {
  const pts = stops.map(s => ({ x: s.nx * width, y: s.ny * height }));

  // Smooth cubic bezier path
  let pathD = '';
  if (pts.length >= 2) {
    pathD = `M ${pts[0]!.x} ${pts[0]!.y}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1]!;
      const c = pts[i]!;
      const cpx = p.x + (c.x - p.x) * 0.5;
      pathD += ` C ${cpx} ${p.y}, ${cpx} ${c.y}, ${c.x} ${c.y}`;
    }
  }

  const dash = config.lineStyle === 'dashed' ? `${config.lineWidth * 3},${config.lineWidth * 2}` : undefined;
  const gradId = 'cg1';

  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={config.lineColor} stopOpacity="1" />
          <stop offset="100%" stopColor={config.lineColor} stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Glow */}
      {pathD && config.lineStyle !== 'dashed' && (
        <path d={pathD} stroke={config.lineColor} strokeWidth={config.lineWidth + 8}
          strokeOpacity={0.15} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Main line */}
      {pathD && (
        <path d={pathD}
          stroke={config.lineStyle === 'gradient' ? `url(#${gradId})` : config.lineColor}
          strokeWidth={config.lineWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dash}
        />
      )}

      {/* Markers */}
      {pts.map((pt, i) => {
        const stop = stops[i]!;
        const r = config.markerStyle === 'dot' ? config.lineWidth * 1.2 : 15;
        const isFirst = i === 0;
        const isLast = i === stops.length - 1;
        const fill = isFirst ? config.lineColor : isLast ? '#FFD700' : '#FFFFFF';
        const textFill = isFirst ? '#FFFFFF' : config.lineColor;

        return (
          <g key={stop.id}>
            {config.markerStyle !== 'dot' && (
              <circle cx={pt.x} cy={pt.y} r={r + 5} fill={config.lineColor} fillOpacity={0.15} />
            )}
            <circle cx={pt.x} cy={pt.y} r={r} fill={fill} stroke={config.lineColor} strokeWidth={2} />
            {config.markerStyle !== 'dot' && (
              <text x={pt.x} y={pt.y + 5} textAnchor="middle"
                fontSize={11} fontWeight="bold" fill={textFill}>
                {i + 1}
              </text>
            )}
            {config.showLabels && config.markerStyle !== 'dot' && (
              <>
                <text x={pt.x} y={pt.y + r + 16} textAnchor="middle"
                  fontSize={9} fontWeight="600" fill="#000" stroke="#000" strokeWidth={3} opacity={0.5}>
                  {stop.name.length > 7 ? `${stop.name.slice(0, 7)}…` : stop.name}
                </text>
                <text x={pt.x} y={pt.y + r + 16} textAnchor="middle"
                  fontSize={9} fontWeight="600" fill={config.lineColor}>
                  {stop.name.length > 7 ? `${stop.name.slice(0, 7)}…` : stop.name}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* START / END */}
      {pts.length > 0 && (
        <>
          <text x={pts[0]!.x} y={pts[0]!.y - 22} textAnchor="middle"
            fontSize={8} fontWeight="700" fill="#000" stroke="#000" strokeWidth={2.5} opacity={0.5}>START</text>
          <text x={pts[0]!.x} y={pts[0]!.y - 22} textAnchor="middle"
            fontSize={8} fontWeight="700" fill={config.lineColor}>START</text>
          <text x={pts[pts.length - 1]!.x} y={pts[pts.length - 1]!.y - 22} textAnchor="middle"
            fontSize={8} fontWeight="700" fill="#000" stroke="#000" strokeWidth={2.5} opacity={0.5}>END</text>
          <text x={pts[pts.length - 1]!.x} y={pts[pts.length - 1]!.y - 22} textAnchor="middle"
            fontSize={8} fontWeight="700" fill="#FFD700">END</text>
        </>
      )}

      {/* Watermark */}
      <text x={width - 10} y={height - 10} textAnchor="end"
        fontSize={9} fontWeight="700" fill={config.lineColor} opacity={0.7}>
        🍱 Lunchie Munchie
      </text>
    </svg>
  );
}

// ─── Style Editor ─────────────────────────────────────────────────────────────

function StyleEditor({ config, onChange }: { config: StyleConfig; onChange: (c: StyleConfig) => void }) {
  return (
    <div className="bg-[#F5F5F5] rounded-2xl p-4 space-y-4">
      <p className="font-bold text-[14px] text-[#1A1A1A]">✏️ 스타일 커스텀</p>

      {/* Color */}
      <div>
        <p className="text-[11px] text-[#9B9B9B] font-semibold uppercase tracking-wider mb-2">라인 색상</p>
        <div className="flex gap-2">
          {COLOR_PRESETS.map(c => (
            <button
              key={c.value}
              onClick={() => onChange({ ...config, lineColor: c.value })}
              className="w-8 h-8 rounded-full border-2 transition-transform active:scale-90"
              style={{
                backgroundColor: c.value,
                borderColor: config.lineColor === c.value ? '#1A1A1A' : c.value === '#FFFFFF' ? '#ccc' : c.value,
                transform: config.lineColor === c.value ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Line Width */}
      <div>
        <p className="text-[11px] text-[#9B9B9B] font-semibold uppercase tracking-wider mb-2">라인 굵기</p>
        <div className="flex gap-2">
          {[3, 5, 8, 12].map(w => (
            <button key={w} onClick={() => onChange({ ...config, lineWidth: w })}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all active:scale-95"
              style={config.lineWidth === w
                ? { backgroundColor: config.lineColor, color: '#fff', borderColor: config.lineColor }
                : { backgroundColor: '#fff', color: '#4A4A4A', borderColor: '#E5E5E5' }}>
              {w}px
            </button>
          ))}
        </div>
      </div>

      {/* Line Style */}
      <div>
        <p className="text-[11px] text-[#9B9B9B] font-semibold uppercase tracking-wider mb-2">라인 스타일</p>
        <div className="flex gap-2">
          {(['solid', 'dashed', 'gradient'] as const).map(s => (
            <button key={s} onClick={() => onChange({ ...config, lineStyle: s })}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all active:scale-95"
              style={config.lineStyle === s
                ? { backgroundColor: config.lineColor, color: '#fff', borderColor: config.lineColor }
                : { backgroundColor: '#fff', color: '#4A4A4A', borderColor: '#E5E5E5' }}>
              {s === 'solid' ? '실선' : s === 'dashed' ? '점선' : '그라데'}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-2">
        {[
          { key: 'showLabels' as const, label: '장소명' },
          { key: 'showPhotos' as const, label: '사진 스트립' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => onChange({ ...config, [key]: !config[key] })}
            className="flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-all active:scale-95"
            style={config[key]
              ? { backgroundColor: config.lineColor, color: '#fff', borderColor: config.lineColor }
              : { backgroundColor: '#fff', color: '#4A4A4A', borderColor: '#E5E5E5' }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TourMapPage() {
  const [, navigate] = useLocation();
  const { likedRestaurantIds, getRestaurantById, restaurants } = useApp();

  const likedRests = likedRestaurantIds
    .map((id: string) => getRestaurantById(id))
    .filter(Boolean) as typeof restaurants;

  const sourceRests = likedRests.length >= 2 ? likedRests : restaurants;

  const stops: TourStop[] = sourceRests.slice(0, 5).map((r, i) => ({
    id: r.id,
    name: r.name,
    image: r.image,
    nx: 0.12 + (i % 2 === 0 ? 0.10 : 0.52),
    ny: 0.12 + i * 0.18,
  }));

  const [bgImage, setBgImage] = useState<string | null>(null);
  const [config, setConfig] = useState<StyleConfig>({
    lineColor: '#EB5053',
    lineWidth: 5,
    markerStyle: 'circle',
    showLabels: true,
    showPhotos: true,
    lineStyle: 'gradient',
    bgMode: 'transparent',
  });
  const [showEditor, setShowEditor] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const CANVAS_W = 320;
  const CANVAS_H = Math.round(CANVAS_W * 16 / 9);

  const handlePickPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => setBgImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(canvasRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: config.bgMode === 'transparent' ? null : '#000',
      });
      const link = document.createElement('a');
      link.download = `lunchie-munchie-course-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('코스맵이 저장됐어요! 📸\n인스타 스토리에 스티커로 추가하세요!');
    } catch {
      toast.error('저장에 실패했습니다');
    }
    setIsExporting(false);
  }, [config.bgMode]);

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Lunchie Munchie 코스맵', url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('링크가 복사됐어요! 📋');
    }
  };

  return (
    <div className="min-h-dvh bg-[#FCF4EE]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 border-b border-[#E5E5E5]">
        <button onClick={() => window.history.back()}
          className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center active:scale-95">
          <ArrowLeft size={18} color="#1A1A1A" />
        </button>
        <div className="text-center">
          <p className="font-bold text-[16px] text-[#1A1A1A]">코스맵 공유 🗺️</p>
          <p className="text-[11px] text-[#9B9B9B]">Strava 스타일 투명 오버레이</p>
        </div>
        <button onClick={() => setShowEditor(v => !v)}
          className="w-10 h-10 rounded-full bg-[#FFF5F5] flex items-center justify-center active:scale-95">
          <Sliders size={17} color="#EB5053" />
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative mx-auto rounded-3xl overflow-hidden"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            background: bgImage
              ? 'transparent'
              : config.bgMode === 'dark'
              ? '#111'
              : 'repeating-conic-gradient(#e8e8e8 0% 25%, #f8f8f8 0% 50%) 0 0 / 20px 20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}
        >
          {bgImage && (
            <img src={bgImage} alt="bg" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {!bgImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50">
              <p className="text-[11px] text-[#9B9B9B] text-center">📷 배경 사진을 추가하거나<br />투명 PNG로 내보내세요</p>
            </div>
          )}
          <CourseOverlaySVG stops={stops} config={config} width={CANVAS_W} height={CANVAS_H} />
        </div>

        {/* Photo strip */}
        {config.showPhotos && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {stops.map((stop, i) => (
              <div key={stop.id} className="flex-shrink-0 flex flex-col items-center gap-1">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2"
                  style={{ borderColor: config.lineColor }}>
                  <img src={stop.image} alt={stop.name} className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black"
                    style={{ backgroundColor: config.lineColor }}>
                    {i + 1}
                  </div>
                </div>
                <p className="text-[9px] text-[#4A4A4A] max-w-[56px] text-center truncate">{stop.name}</p>
              </div>
            ))}
          </div>
        )}

        {/* Style Editor */}
        <AnimatePresence>
          {showEditor && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <StyleEditor config={config} onChange={setConfig} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Background mode */}
        <div>
          <p className="text-[11px] text-[#9B9B9B] font-semibold uppercase tracking-wider mb-2">내보내기 형식</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { mode: 'transparent' as const, emoji: '🫥', title: '투명 PNG', sub: '인스타 스티커용' },
              { mode: 'dark' as const, emoji: '🖼️', title: '다크 배경', sub: '스토리 완성본' },
            ].map(({ mode, emoji, title, sub }) => (
              <button key={mode} onClick={() => setConfig(c => ({ ...c, bgMode: mode }))}
                className="p-3 rounded-2xl border-2 text-center transition-all active:scale-95"
                style={config.bgMode === mode
                  ? { borderColor: '#EB5053', backgroundColor: '#FFF5F5' }
                  : { borderColor: '#E5E5E5', backgroundColor: '#fff' }}>
                <p className="text-2xl mb-1">{emoji}</p>
                <p className="font-bold text-[13px] text-[#1A1A1A]">{title}</p>
                <p className="text-[10px] text-[#9B9B9B]">{sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={handlePickPhoto}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-[#E5E5E5] text-[13px] font-semibold text-[#1A1A1A] active:scale-95 bg-white">
            <Camera size={16} /> 배경 사진
          </button>
          <button onClick={() => void handleExport()}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-[13px] font-semibold active:scale-95"
            style={{ backgroundColor: '#EB5053' }}>
            <Download size={16} /> {isExporting ? '처리 중…' : '저장 & 공유'}
          </button>
        </div>

        {/* How-to tip */}
        <div className="rounded-2xl p-4 border-l-4" style={{ backgroundColor: '#FFF5F5', borderLeftColor: '#EB5053' }}>
          <p className="font-bold text-[13px] mb-2" style={{ color: '#EB5053' }}>📱 인스타 스토리에 올리는 법</p>
          <p className="text-[12px] text-[#4A4A4A] leading-relaxed">
            1. <strong>투명 PNG</strong>로 저장 후 인스타 스토리 열기<br />
            2. 내 사진을 스토리 배경으로 추가<br />
            3. 스티커 → 갤러리에서 코스맵 PNG 선택<br />
            4. 크기·위치 조정 후 공유! 🎉
          </p>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
