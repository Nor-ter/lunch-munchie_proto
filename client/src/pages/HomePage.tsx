import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Heart, X, ChevronRight, Circle } from 'lucide-react';
import { useApp, Course, MOCK_RESTAURANTS } from '@/contexts/AppContext';
import { LunchieLogo } from '@/components/brand/LunchieLogo';
import { BRAND } from '@/constants/brand';

const COLORS = {
  bg: BRAND.bg,
  coral: BRAND.primary,
  munchieCard: BRAND.primaryLight,
  munchieBadge: BRAND.primaryDark,
  text: BRAND.text,
  sub: BRAND.sub,
} as const;

// ─── Route Illustration SVG ───────────────────────────────────────────────────

function RouteIllustration({ seed = 0 }: { seed?: number }) {
  const paths = [
    'M 12 108 C 28 30, 52 95, 78 48 S 118 18, 148 58 S 178 95, 210 42',
    'M 12 55 C 38 115, 68 20, 98 72 S 138 125, 168 48 S 198 15, 218 68',
    'M 12 95 C 48 25, 82 108, 118 42 S 158 98, 188 35 S 212 12, 222 58',
    'M 12 65 C 32 130, 72 12, 102 78 S 148 128, 172 52 S 202 22, 218 72',
  ];

  return (
    <svg viewBox="0 0 230 130" className="w-full h-full" fill="none">
      <path
        d={paths[seed % paths.length]}
        stroke="#4A3228"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Munchie Course Card ──────────────────────────────────────────────────────

const BADGES = ['HOT', 'MZ', 'NEW', 'HOT'];

function MunchieCourseCard({ course, idx }: { course: Course; idx: number }) {
  const [, navigate] = useLocation();

  return (
    <motion.button
      type="button"
      onClick={() => navigate(`/course/${course.id}?from=explore`)}
      className="w-full flex items-stretch rounded-[24px] text-left"
      style={{
        background: COLORS.munchieCard,
        boxShadow: '0 2px 10px rgba(235, 80, 83, 0.08)',
        minHeight: 192,
      }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex-1 px-4 py-3.5 flex flex-col justify-center min-w-0">
        <span
          className="inline-flex self-start text-[10px] font-bold text-white px-2 py-0.5 rounded-md"
          style={{ background: COLORS.munchieBadge }}
        >
          {BADGES[idx % BADGES.length]}
        </span>
        <p className="font-bold text-[15px] mt-1.5 leading-snug truncate" style={{ color: COLORS.text }}>
          {course.title}
        </p>
        <div className="flex gap-1.5 flex-wrap mt-0.5">
          {course.hashtags.slice(0, 2).map(h => (
            <span key={h} className="text-[11px]" style={{ color: COLORS.sub }}>
              {h}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 mt-1.5">
          <Heart size={11} color={COLORS.sub} strokeWidth={2} />
          <span className="text-[11px]" style={{ color: COLORS.sub }}>
            {course.savedCount.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="w-[152px] p-3 flex items-center justify-center flex-shrink-0">
        <div
          className="w-full aspect-square bg-white rounded-[18px] flex items-center justify-center p-2.5"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)' }}
        >
          <RouteIllustration seed={idx} />
        </div>
      </div>
    </motion.button>
  );
}

// ─── Stacked Food Cards ───────────────────────────────────────────────────────

function StackedCards() {
  const cards = [
    { ...MOCK_RESTAURANTS[13], rotate: -10, offset: 0, z: 1 },
    { ...MOCK_RESTAURANTS[10], rotate: 2, offset: 16, z: 2 },
    { ...MOCK_RESTAURANTS[3], rotate: 12, offset: 32, z: 3 },
  ];

  return (
    <div className="relative w-[100px] h-[92px] flex-shrink-0 mr-1">
      {cards.map((r) => (
        <div
          key={r.id}
          className="absolute rounded-[14px] overflow-hidden border-[2px] border-white"
          style={{
            width: 62,
            height: 78,
            right: r.offset,
            bottom: 2,
            zIndex: r.z,
            transform: `rotate(${r.rotate}deg)`,
            boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
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
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
};

export default function HomePage() {
  const [, navigate] = useLocation();
  const { courses } = useApp();

  return (
    <motion.div
      className="min-h-dvh pb-24"
      style={{ background: COLORS.bg }}
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="px-5 pt-10">
        <div className="flex justify-center mb-7">
          <LunchieLogo showWordmark />
        </div>

        <h1 className="font-bold text-[30px] leading-[1.25]" style={{ color: COLORS.text }}>
          오늘 어떻게<br />먹을까요?
        </h1>
        <p className="text-[13px] mt-1.5" style={{ color: COLORS.sub }}>
          모드를 선택해주세요.
        </p>
      </motion.div>

      {/* Lunchie Mode */}
      <motion.div variants={fadeUp} className="px-5 mt-7">
        <p className="font-black text-[16px] mb-3" style={{ color: COLORS.text }}>
          Lunchie Mode
        </p>

        <motion.button
          type="button"
          onClick={() => navigate('/lunchie/settings')}
          className="w-full rounded-[28px] overflow-hidden text-left"
          style={{
            background: COLORS.coral,
            boxShadow: '0 6px 20px rgba(235, 80, 83, 0.28)',
          }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="px-5 pt-5 pb-4 flex items-end justify-between">
            <div className="flex-1 min-w-0 pb-1">
              <p
                className="text-white text-[24px] leading-none"
                style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700 }}
              >
                Quick Match
              </p>
              <p className="text-white/90 text-[11.5px] mt-2.5 leading-[1.55]">
                그룹 멤버들과 함께 음식 카드를
                <br />
                스와이프로 빠르게 메뉴를 결정해요.
              </p>
              <div className="flex gap-2 mt-3.5">
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/75 text-white text-[11px] font-semibold">
                  <X size={11} strokeWidth={2.5} />
                  싫어요
                </span>
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/75 text-white text-[11px] font-semibold">
                  <Circle size={11} strokeWidth={2.5} />
                  좋아요
                </span>
              </div>
            </div>
            <StackedCards />
          </div>
        </motion.button>
      </motion.div>

      {/* Munchie Mode */}
      <motion.div variants={fadeUp} className="px-5 mt-9">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-black text-[16px]" style={{ color: COLORS.text }}>
              Munchie Mode
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: COLORS.sub }}>
              이번주 사람들이 많이 저장한 코스
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="flex items-center gap-0.5 text-[12px] font-semibold pt-0.5 shrink-0 active:opacity-60"
            style={{ color: COLORS.text }}
          >
            더보기 <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        </div>

        <div className="space-y-3 mt-4">
          {courses.slice(0, 4).map((course, idx) => (
            <MunchieCourseCard key={course.id} course={course} idx={idx} />
          ))}
        </div>

        <motion.button
          type="button"
          onClick={() => navigate('/explore')}
          className="w-full py-3.5 mt-4 rounded-[24px] font-bold text-[14px] flex items-center justify-center gap-0.5"
          style={{
            background: COLORS.munchieCard,
            color: COLORS.text,
            boxShadow: '0 2px 8px rgba(235, 80, 83, 0.06)',
          }}
          whileTap={{ scale: 0.98 }}
        >
          코스 더보기 <ChevronRight size={15} strokeWidth={2.5} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
