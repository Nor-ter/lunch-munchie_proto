import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Heart, X, ArrowRight, MapPin, Clock, Bookmark } from "lucide-react";
import { useApp, Course, MOCK_RESTAURANTS } from "@/contexts/AppContext";
import CourseMapOverlay from "@/components/CourseMapOverlay";
import { logEvent } from "@/lib/eventLogger";
import { toast } from "sonner";

// 회고 마이크로설문: 지난 결정 식당의 만족(SURVEY=만족 정답). WINNER 시 localStorage에 대기 저장됨.
function RetroSurveyCard() {
  const { profile } = useApp();
  const [retro, setRetro] = useState<{ id: string; name: string; session?: string | null; at: number } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lunchie_retro");
      if (raw) setRetro(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);
  if (!retro) return null;
  const answer = (action: "POS" | "NEU" | "NEG" | null) => {
    if (action) {
      logEvent({ event_type: "SURVEY", action, user_id: profile.id, restaurant_id: retro.id, session_id: retro.session ?? null });
      toast.success("피드백 고마워요! 🙌");
    }
    try { localStorage.removeItem("lunchie_retro"); } catch { /* noop */ }
    setRetro(null);
  };
  return (
    <div className="mx-6 mt-3 rounded-2xl bg-white p-4 shadow-sm border border-[#F0E8E0]">
      <div className="flex items-start justify-between">
        <p className="text-[13px] text-[#6E6E6E] leading-snug">최근 점심, <b className="text-[#1A1A1A]">{retro.name}</b> 어땠어요?</p>
        <button onClick={() => answer(null)} className="text-[#B0B0B0] text-[13px] ml-2 leading-none">✕</button>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => answer("POS")} className="flex-1 py-2.5 rounded-xl bg-[#EAF7EC] text-[#2E9E42] font-bold text-[14px] active:scale-95 transition-transform">👍 좋았어요</button>
        <button onClick={() => answer("NEU")} className="flex-1 py-2.5 rounded-xl bg-[#F1EFE8] text-[#6E6E6E] font-bold text-[14px] active:scale-95 transition-transform">😐 그냥</button>
        <button onClick={() => answer("NEG")} className="flex-1 py-2.5 rounded-xl bg-[#FBECEC] text-[#D83A3D] font-bold text-[14px] active:scale-95 transition-transform">👎 별로</button>
      </div>
    </div>
  );
}

// 하루 여정: 오늘 결정된 스톱 타임라인 + (사슬 열림 시) 다음-스톱 제안.
function TodayJourneyCard() {
  const { profile } = useApp();
  const [, navigate] = useLocation();
  const [data, setData] = useState<{
    stops: { restaurant_id: string; category: string | null; satisfaction: string | null }[];
    nextSuggestion: { intent: string; restaurant: { id: string; category?: string }; reason: string } | null;
  } | null>(null);
  useEffect(() => {
    let on = true;
    fetch(`/api/journey/today?userId=${encodeURIComponent(profile.id)}`)
      .then((r) => r.json())
      .then((d) => { if (on) setData(d); })
      .catch(() => { /* 폴백: 카드 숨김 */ });
    return () => { on = false; };
  }, [profile.id]);
  if (!data || data.stops.length === 0) return null; // 오늘 스톱 0개 → 숨김

  const nameOf = (id: string) => MOCK_RESTAURANTS.find((r) => r.id === id)?.name ?? id;
  const sat = (s: string | null) => (s === "POS" ? "👍" : s === "NEG" ? "👎" : s === "NEU" ? "😐" : "");
  const intentLabel: Record<string, string> = { meal: "밥", cafe: "커피", dessert: "디저트" };

  return (
    <div className="mx-4 mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-3 text-[13px] font-bold text-[#1A1A1A]">오늘의 여정</p>
      <div className="space-y-2">
        {data.stops.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-[13px]">
            <span className="text-[#EB5053]">●</span>
            <span className="font-semibold text-[#1A1A1A]">{nameOf(s.restaurant_id)}</span>
            <span className="text-[#9B9B9B]">· {s.category ?? ""}</span>
            <span>{sat(s.satisfaction)}</span>
          </div>
        ))}
      </div>
      {data.nextSuggestion && (
        <button
          onClick={() => navigate(`/lunchie/settings?intent=${data.nextSuggestion!.intent}`)}
          className="mt-3 w-full rounded-xl border border-dashed border-[#EB5053] px-3 py-2.5 text-left text-[13px] font-bold text-[#EB5053] active:scale-[0.99]"
        >
          다음은 {intentLabel[data.nextSuggestion.intent] ?? data.nextSuggestion.intent}? →
        </button>
      )}
    </div>
  );
}

const TAG_CLASS: Record<string, string> = {
  '데이트 코스': 'tag-date',
  '맛집': 'tag-food',
  '카페': 'tag-cafe',
  '전시/문화': 'tag-culture',
  '액티비티': 'tag-activity',
  '혼자 여행': 'tag-hash',
  '맛집 투어': 'tag-food',
  '가성비': 'tag-activity',
};

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
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <button
          onClick={e => { e.stopPropagation(); isSaved ? unsaveCourse(course.id) : saveCourse(course.id); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center"
        >
          <Bookmark size={14} fill={isSaved ? '#EB5053' : 'none'} stroke={isSaved ? '#EB5053' : '#4A4A4A'} />
        </button>
        <div className="absolute bottom-3 left-3 flex gap-1.5 flex-wrap">
          {course.tags.slice(0, 2).map(tag => (
            <span key={tag} className={`tag ${TAG_CLASS[tag] || 'tag-hash'}`}>{tag}</span>
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

      {/* 회고 설문 (지난 결정 만족도 — 만족 정답 수집) */}
      <RetroSurveyCard />
      <TodayJourneyCard />

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
          {courses.slice(0, 4).map((course, idx) => (
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

        {/* 데이터 출처 표기 (ODbL 의무) */}
        <p className="mt-[28px] text-center text-[11px] text-[#B0B0B0]">
          식당 데이터 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a> contributors
        </p>
      </motion.div>
    </motion.div>
  );
}
