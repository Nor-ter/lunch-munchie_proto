import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Heart, X, ChevronRight } from 'lucide-react';
import { useApp, Course, MOCK_RESTAURANTS } from '@/contexts/AppContext';

// ─── Route Illustration SVG ───────────────────────────────────────────────────

function RouteIllustration({ seed = 0 }: { seed?: number }) {
  const paths = [
    'M 10 80 C 30 20, 60 110, 90 50 S 130 10, 160 60 S 185 100, 200 55',
    'M 10 50 C 40 110, 70 15, 100 70 S 140 130, 170 50 S 195 20, 210 75',
    'M 10 90 C 50 20, 80 110, 120 45 S 160 100, 190 40 S 210 10, 220 60',
    'M 10 60 C 35 130, 75 10, 105 80 S 150 130, 175 55 S 200 20, 215 70',
  ];

  const stops = [
    [10, 80], [90, 50], [160, 60], [200, 55],
    [10, 50], [100, 70], [170, 50], [210, 75],
    [10, 90], [120, 45], [190, 40], [220, 60],
    [10, 60], [105, 80], [175, 55], [215, 70],
  ];

  const p = seed % paths.length;
  const baseStops = stops.slice(p * 4, p * 4 + 4);

  return (
    <svg viewBox="0 0 230 130" className="w-full h-full" fill="none">
      <path d={paths[p]} stroke="#5C3D2E" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      {baseStops.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i === 0 || i === baseStops.length - 1 ? 7 : 5}
          fill={i === 0 || i === baseStops.length - 1 ? '#5C3D2E' : 'white'}
          stroke="#5C3D2E" strokeWidth="2.5" opacity="0.8" />
      ))}
    </svg>
  );
}

// ─── Munchie Course Card ──────────────────────────────────────────────────────

const BADGES = ['HOT', 'MZ', 'NEW', 'HOT'];

function MunchieCourseCard({ course, idx }: { course: Course; idx: number }) {
  const [, navigate] = useLocation();

  return (
    <motion.div
      onClick={() => navigate(`/courses/${course.id}`)}
      className="flex overflow-hidden rounded-2xl cursor-pointer"
      style={{ background: '#FFF3C4', minHeight: 110 }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="flex-1 p-4">
        <span className="text-[10px] font-black text-white px-2.5 py-1 rounded-full"
          style={{ background: '#EB5053' }}>
          {BADGES[idx % BADGES.length]}
        </span>
        <p className="font-bold text-[15px] text-[#1A1A1A] mt-2 leading-snug">{course.title}</p>
        <div className="flex gap-1.5 flex-wrap mt-1">
          {course.hashtags.slice(0, 2).map(h => (
            <span key={h} className="text-[11px] text-[#9B9B9B]">{h}</span>
          ))}
        </div>
        <div className="flex items-center gap-1 mt-2">
          <Heart size={11} color="#9B9B9B" />
          <span className="text-[11px] text-[#9B9B9B]">{course.savedCount.toLocaleString()}</span>
        </div>
      </div>
      <div className="w-28 p-3 flex items-center justify-center flex-shrink-0">
        <RouteIllustration seed={idx} />
      </div>
    </motion.div>
  );
}

// ─── Stacked Food Cards ────────────────────────────────────────────────────────

function StackedCards() {
  return (
    <div className="relative w-28 h-24 flex-shrink-0">
      {MOCK_RESTAURANTS.slice(0, 3).map((r, i) => (
        <div
          key={r.id}
          className="absolute rounded-xl overflow-hidden border-2 border-white/40 shadow-lg"
          style={{
            width: 66,
            height: 80,
            right: i * 14,
            bottom: 0,
            zIndex: 3 - i,
            transform: `rotate(${(i - 1) * 6}deg)`,
          }}
        >
          <img src={r.image} alt="" className="w-full h-full object-cover" draggable={false} />
        </div>
      ))}
    </div>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } },
};

export default function HomePage() {
  const [, navigate] = useLocation();
  const { courses } = useApp();

  return (
    <motion.div
      className="min-h-dvh pb-24"
      style={{ background: '#FFF8F2' }}
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="px-5 pt-12 pb-2">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#EB5053' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="10" r="7" fill="white" opacity="0.95" />
              <circle cx="9.5" cy="9" r="1.2" fill="#EB5053" />
              <circle cx="14.5" cy="9" r="1.2" fill="#EB5053" />
              <path d="M9 12.5 Q12 15 15 12.5" stroke="#EB5053" strokeWidth="1.4" strokeLinecap="round" fill="none" />
              <rect x="9" y="18" width="6" height="2.5" rx="1.2" fill="white" opacity="0.9" />
              <rect x="10.5" y="16.5" width="3" height="2" rx="0.8" fill="white" opacity="0.9" />
            </svg>
          </div>
          <span className="font-black text-[20px]" style={{ color: '#EB5053' }}>Lunchie Munchie</span>
        </div>

        <h1 className="font-bold text-[30px] text-[#1A1A1A] leading-tight">
          오늘 어떻게<br />먹을까요?
        </h1>
        <p className="text-[13px] mt-1" style={{ color: '#9B9B9B' }}>모드를 선택해 주세요.</p>
      </motion.div>

      {/* Lunchie Mode */}
      <motion.div variants={fadeUp} className="px-5 mt-5">
        <p className="font-black text-[17px] text-[#1A1A1A] mb-3">Lunchie Mode</p>

        <motion.button
          onClick={() => navigate('/quick-match')}
          className="w-full rounded-3xl overflow-hidden text-left"
          style={{ background: 'linear-gradient(135deg, #EB5053 0%, #D03E41 100%)' }}
          whileTap={{ scale: 0.97 }}
        >
          <div className="px-5 pt-5 pb-4 flex items-end justify-between gap-3">
            <div className="flex-1">
              <p className="text-white font-black text-[22px] leading-tight">Quick Match</p>
              <p className="text-white/80 text-[12px] mt-1.5 leading-relaxed">
                그룹 멤버들과 함께 음식 카드를<br />스와이프로 빠르게 메뉴를 결정해요.
              </p>
              <div className="flex gap-2 mt-3">
                <span className="flex items-center gap-1.5 bg-white/20 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full">
                  <X size={10} strokeWidth={3} /> 싫어요
                </span>
                <span className="flex items-center gap-1.5 bg-white/20 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full">
                  <Heart size={10} fill="white" /> 좋아요
                </span>
              </div>
            </div>
            <StackedCards />
          </div>
        </motion.button>
      </motion.div>

      {/* Munchie Mode */}
      <motion.div variants={fadeUp} className="px-5 mt-7">
        <div className="flex items-end justify-between mb-1">
          <p className="font-black text-[17px] text-[#1A1A1A]">Munchie Mode</p>
          <button onClick={() => navigate('/explore')}
            className="flex items-center gap-0.5 text-[13px] font-semibold text-[#1A1A1A] active:opacity-60">
            더보기 <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        </div>
        <p className="text-[12px] mb-4" style={{ color: '#9B9B9B' }}>이번주 사람들이 많이 저장한 코스</p>

        <div className="space-y-3">
          {courses.slice(0, 3).map((course, idx) => (
            <MunchieCourseCard key={course.id} course={course} idx={idx} />
          ))}
        </div>

        <motion.button
          onClick={() => navigate('/explore')}
          className="w-full py-4 mt-4 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 text-white"
          style={{ background: '#F09D09' }}
          whileTap={{ scale: 0.97 }}
        >
          코스 더보기 <ChevronRight size={16} strokeWidth={2.5} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
