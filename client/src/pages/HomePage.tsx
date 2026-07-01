import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Heart, X, ArrowRight, MapPin, Clock, Bookmark } from "lucide-react";
import { useApp, Course, MOCK_RESTAURANTS } from "@/contexts/AppContext";
import CourseMapOverlay from "@/components/CourseMapOverlay";
import { getCourseTagStyle } from "@/constants/courseTheme";

function MunchieCourseCard({ course }: { course: Course }) {
  const [, navigate] = useLocation();
  const { savedCourseIds, saveCourse, unsaveCourse } = useApp();
  const isSaved = savedCourseIds.includes(course.id);

  return (
    <motion.div
      className="lm-card overflow-hidden cursor-pointer"
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/course/${course.id}?from=explore`)}
    >
      <div className="relative h-40">
        <img src={course.heroImage} alt={course.title} className="w-full h-full object-cover" />
        <CourseMapOverlay course={course} />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/50 to-transparent" />
        <button
          onClick={e => { e.stopPropagation(); isSaved ? unsaveCourse(course.id) : saveCourse(course.id); }}
          className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center"
        >
          <Bookmark size={14} fill={isSaved ? '#E85053' : 'none'} stroke={isSaved ? '#E85053' : '#4A4A4A'} />
        </button>
        <div className="absolute bottom-3 left-3 z-30 flex gap-1.5 flex-wrap">
          {course.tags.slice(0, 2).map(tag => (
            <span key={tag} className="tag" style={getCourseTagStyle(tag)}>
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-[15px] text-[#1A1A1A] mb-1">{course.title}</h3>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {course.hashtags.slice(0, 3).map(h => (
            <span key={h} className="tag tag-hash">{h}</span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[#9B9B9B]">
          <span className="flex items-center gap-1 text-[12px]">
            <MapPin size={11} /> {course.metadata.distance}km
          </span>
          <span className="flex items-center gap-1 text-[12px]">
            <Clock size={11} /> {Math.floor(course.metadata.duration / 60)}시간
          </span>
          <span className="flex items-center gap-1 text-[12px]">
            📍 {course.metadata.placeCount}개 장소
          </span>
          <span className="flex items-center gap-1 text-[12px] ml-auto">
            <Bookmark size={11} /> {course.savedCount}
          </span>
        </div>
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
        <div className="mb-[27px] flex items-center justify-center">
          <span
            className="text-center text-[19px] font-black leading-none"
            style={{
              color: "#FF393D",
              textShadow: "0 4px 10px rgba(235,80,83,0.18)",
            }}
          >
            Lunchie Munchie
          </span>
        </div>

        <h1 className="text-[30px] font-bold leading-[1.2] text-black" style={{ paddingLeft: 20 }}>
          오늘 어떻게
          <br />
          먹을까요?
        </h1>
        <p
          className="mt-[13px] text-[11px] leading-none"
          style={{ color: "#6E6A67", paddingLeft: 20 }}
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
                  <Heart size={8} fill="white" strokeWidth={0} /> 좋아요
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
          {courses.slice(0, 4).map((course) => (
            <MunchieCourseCard key={course.id} course={course} />
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
