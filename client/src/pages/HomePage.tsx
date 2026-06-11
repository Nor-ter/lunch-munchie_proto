import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Circle, Heart, X, ArrowRight } from "lucide-react";
import { useApp, Course, MOCK_RESTAURANTS } from "@/contexts/AppContext";

function RouteIllustration({ seed = 0 }: { seed?: number }) {
  const paths = [
    "M 33 22 C 14 51, 50 59, 75 62 C 108 67, 109 30, 85 26 C 58 23, 93 93, 48 83 C 18 77, 23 108, 24 111",
    "M 103 16 C 76 16, 84 52, 97 66 C 120 90, 70 103, 58 78 C 46 53, 25 48, 30 17",
    "M 32 32 C 80 19, 111 45, 113 81 C 116 113, 71 111, 76 83 C 79 62, 44 65, 26 80 C 7 96, 20 119, 55 106",
    "M 31 37 C 13 65, 44 83, 74 70 C 117 51, 116 99, 83 105 C 50 111, 27 110, 28 85",
  ];

  const p = seed % paths.length;

  return (
    <svg viewBox="0 0 132 132" className="h-full w-full" fill="none">
      <path
        d={paths[p]}
        stroke="#6B5554"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={paths[p]}
        stroke="#FBF7EE"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1 8"
      />
    </svg>
  );
}

const BADGES = ["HOT", "MZ", "NEW", "HOT"];

function MunchieCourseCard({ course, idx }: { course: Course; idx: number }) {
  const [, navigate] = useLocation();

  return (
    <motion.div
      onClick={() => navigate(`/course/${course.id}?from=explore`)}
      className="flex cursor-pointer overflow-hidden"
      style={{
        background: "#FFE9A8",
        borderRadius: 22,
        height: 156,
        boxShadow: "4px 5px 0 rgba(255, 213, 103, 0.55)",
      }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="flex flex-1 flex-col justify-between py-[38px] pl-[14px] pr-2 min-w-0">
        <div className="min-w-0">
          <span
            className="inline-flex h-[21px] items-center rounded-[6px] px-2 py-[3px] text-[13px] font-black text-black"
            style={{ background: "#FFD47A" }}
          >
            {BADGES[idx % BADGES.length]}
          </span>
          <p className="mt-[6px] text-[15px] font-bold leading-snug text-black truncate">
            {course.title}
          </p>
          <div className="mt-[7px] flex flex-wrap gap-1.5">
            {course.hashtags.slice(0, 2).map((h) => (
              <span key={h} className="text-[11px] leading-none text-black">
                {h}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-[5px]">
          <Heart size={10} color="#4B342F" strokeWidth={1.6} />
          <span className="text-[9px] leading-none text-black">
            {course.savedCount.toLocaleString()}
          </span>
        </div>
      </div>
      <div
        className="mr-[12px] mt-[12px] flex h-[132px] w-[132px] flex-shrink-0 items-center justify-center"
        style={{ background: "#FFF9ED", borderRadius: 14 }}
      >
        <RouteIllustration seed={idx} />
      </div>
    </motion.div>
  );
}

function StackedCards() {
  return (
    <div className="relative h-[96px] w-[128px] flex-shrink-0">
      {MOCK_RESTAURANTS.slice(0, 3).map((r, i) => (
        <div
          key={r.id}
          className="absolute overflow-hidden bg-white shadow-md"
          style={{
            width: 63,
            height: 87,
            right: 3 + i * 24,
            bottom: 5 + i * 8,
            zIndex: 3 - i,
            borderRadius: 3,
          }}
        >
          <img
            src={r.image}
            alt=""
            className="h-[38px] w-full object-cover"
            draggable={false}
          />
          <div className="p-[4px]">
            <div className="mb-[3px] h-[4px] w-[36px] rounded-full bg-[#2A2A2A]" />
            <div className="mb-[2px] h-[3px] w-[48px] rounded-full bg-[#E8E0D9]" />
            <div className="mb-[7px] h-[3px] w-[39px] rounded-full bg-[#E8E0D9]" />
            <div className="flex gap-[3px]">
              <span className="h-[8px] w-[20px] rounded-full bg-[#F4A040]" />
              <span className="h-[8px] w-[17px] rounded-full bg-[#EF4B4E]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 280, damping: 26 },
  },
};

export default function HomePage() {
  const [, navigate] = useLocation();
  const { courses } = useApp();

  return (
    <motion.div
      className="min-h-dvh pb-[86px]"
      style={{ background: "#FCF4EE" }}
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        variants={fadeUp}
        className="pb-2"
        style={{
          paddingLeft: "clamp(24px, 10.2vw, 41px)",
          paddingRight: "clamp(24px, 10.2vw, 41px)",
          paddingTop: 64,
        }}
      >
        <div className="mb-[27px] flex items-center justify-center gap-[9px]">
          <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center overflow-hidden">
            <img
              src="/Logo 004.png"
              alt="Lunchie Munchie Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <span
            className="text-[19px] font-black leading-none"
            style={{
              color: "#FF393D",
              textShadow: "0 4px 10px rgba(235,80,83,0.18)",
            }}
          >
            Lunchie Munchie
          </span>
        </div>

        <h1 className="text-[30px] font-bold leading-[1.2] text-black">
          오늘 어떻게
          <br />
          먹을까요?
        </h1>
        <p
          className="mt-[13px] text-[11px] leading-none"
          style={{ color: "#6E6A67" }}
        >
          모드를 선택해주세요.
        </p>
      </motion.div>

      {/* Lunchie Mode */}
      <motion.div
        variants={fadeUp}
        className="mt-[31px]"
        style={{
          paddingLeft: "clamp(24px, 10.2vw, 41px)",
          paddingRight: "clamp(24px, 10.2vw, 41px)",
        }}
      >
        <p className="mb-[15px] text-[20px] font-black leading-none text-black" style={{ paddingLeft: 20 }}>
          Lunchie Mode
        </p>

        <motion.button
          onClick={() => navigate("/lunchie/settings")}
          className="w-full overflow-hidden text-left"
          style={{
            height: 156,
            borderRadius: 27,
            background: "linear-gradient(180deg, #FB4448 0%, #F47F80 100%)",
            boxShadow: "5px 6px 0 rgba(240, 91, 83, 0.22)",
          }}
          whileTap={{ scale: 0.97 }}
        >
          <div className="flex h-full items-center justify-between gap-1 pl-[13px] pr-[18px] pt-[16px]">
            <div className="flex-1">
              <p
                className="text-white leading-none"
                style={{
                  fontFamily: "'Baloo 2', 'Pretendard Variable', 'Pretendard', cursive",
                  fontWeight: 700,
                  fontSize: 24,
                }}
              >
                Quick Match
              </p>
              <p className="mt-[8px] text-[11px] leading-[1.2] text-white/90">
                그룹 멤버들과 함께 음식 카드를
                <br />
                스와이프로 빠르게 메뉴를 결정해요.
              </p>
              <div className="mt-[8px] flex gap-[7px]">
                <span className="flex h-[15px] items-center gap-[3px] rounded-full bg-white/20 px-[8px] text-[9px] font-medium leading-none text-black">
                  <X size={9} strokeWidth={3} /> 싫어요
                </span>
                <span className="flex h-[15px] items-center gap-[3px] rounded-full bg-white/20 px-[8px] text-[9px] font-medium leading-none text-black">
                  <Circle size={8} strokeWidth={2.2} /> 좋아요
                </span>
              </div>
            </div>
            <StackedCards />
          </div>
        </motion.button>
      </motion.div>

      {/* Munchie Mode */}
      <motion.div
        variants={fadeUp}
        className="mt-[55px]"
        style={{
          paddingLeft: "clamp(24px, 10.2vw, 41px)",
          paddingRight: "clamp(24px, 10.2vw, 41px)",
        }}
      >
        <div className="mb-[6px] flex items-end justify-between">
          <p className="text-[20px] font-black leading-none text-black" style={{ paddingLeft: 20 }}>
            Munchie Mode
          </p>
          <button
            onClick={() => navigate("/explore")}
            className="flex items-center gap-[6px] text-[16px] font-bold leading-none text-black active:opacity-60"
          >
            더보기 <ArrowRight size={20} strokeWidth={2.4} />
          </button>
        </div>
        <p className="mb-[12px] text-[10px] leading-none text-black" style={{ paddingLeft: 20 }}>
          이번주 사람들이 많이 저장한 코스
        </p>

        <div className="space-y-[36px]">
          {courses.slice(0, 4).map((course, idx) => (
            <MunchieCourseCard key={course.id} course={course} idx={idx} />
          ))}
        </div>

        <motion.button
          onClick={() => navigate("/explore")}
          className="mt-[24px] flex h-[54px] w-full items-center justify-center gap-[8px] text-[16px] font-bold text-black"
          style={{
            background: "#FFE39B",
            borderRadius: 20,
            boxShadow: "4px 5px 0 rgba(255, 213, 103, 0.5)",
          }}
          whileTap={{ scale: 0.97 }}
        >
          코스 더보기 <ArrowRight size={20} strokeWidth={2.5} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
