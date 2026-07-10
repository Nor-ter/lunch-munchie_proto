import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ArrowRight, MapPin, Clock, Bookmark } from "lucide-react";
import { useApp, Course } from "@/contexts/AppContext";
import CourseMapOverlay from "@/components/CourseMapOverlay";
import { logEvent } from "@/lib/eventLogger";
import { toast } from "sonner";

type JourneyStop = { restaurant_id: string; name: string; category: string | null; intent: string | null; at: number; satisfaction: "POS" | "NEU" | "NEG" | null };

const INTENT_LABEL: Record<string, string> = { meal: "밥", cafe: "음료", dessert: "디저트" };
const INTENT_ICON: Record<string, string> = { meal: "🍚", cafe: "☕", dessert: "🍰" };
const INTENT_ORDER: ("meal" | "cafe" | "dessert")[] = ["meal", "cafe", "dessert"];

// 한 스톱의 만족도 — 상시 탭해서 남기거나 바꿀 수 있음(한 번 답하면 끝나는 팝업이 아님).
function FeedbackRow({ stop, onAnswer, defaultOpen }: { stop: JourneyStop; onAnswer: (a: "POS" | "NEU" | "NEG") => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const sat = stop.satisfaction;
  const emoji = sat === "POS" ? "👍" : sat === "NEG" ? "👎" : sat === "NEU" ? "😐" : null;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex-shrink-0 text-[15px] leading-none active:scale-90">
        {emoji ?? <span className="text-[10px] font-bold text-[#EB5053] bg-[#FFF5F5] px-2 py-1 rounded-full whitespace-nowrap">평가하기</span>}
      </button>
    );
  }
  return (
    <div className="w-full mt-1.5 flex gap-1.5">
      {([["POS", "👍 좋았어요", "#EAF7EC", "#2E9E42"], ["NEU", "😐 그냥", "#F1EFE8", "#6E6E6E"], ["NEG", "👎 별로", "#FBECEC", "#D83A3D"]] as const).map(([a, label, bg, fg]) => (
        <button
          key={a}
          onClick={() => { onAnswer(a); setOpen(false); }}
          className="flex-1 py-1.5 rounded-lg font-bold text-[11px] active:scale-95 transition-transform"
          style={{ background: bg, color: fg }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// 통합 여정 카드 — "오늘의 여정"(스톱 타임라인+상시 피드백) + Lunchie Mode 진입점(카테고리 아이콘).
// 여정 없으면 "시작해보세요", 있으면 "다음 여정은?"으로 안내문이 바뀐다.
function JourneyCard() {
  const { profile } = useApp();
  const [, navigate] = useLocation();
  const [stops, setStops] = useState<JourneyStop[] | null>(null);
  useEffect(() => {
    let on = true;
    fetch(`/api/journey/today?userId=${encodeURIComponent(profile.id)}`)
      .then((r) => r.json())
      .then((d) => { if (on) setStops(d.stops ?? []); })
      .catch(() => { if (on) setStops([]); });
    return () => { on = false; };
  }, [profile.id]);

  const timeOf = (at: number) => new Date(at).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  const answer = (stop: JourneyStop, action: "POS" | "NEU" | "NEG") => {
    logEvent({ event_type: "SURVEY", action, user_id: profile.id, restaurant_id: stop.restaurant_id, session_id: null });
    setStops((prev) => prev?.map((s) => (s.restaurant_id === stop.restaurant_id && s.at === stop.at ? { ...s, satisfaction: action } : s)) ?? prev);
    toast.success("피드백 고마워요! 🙌");
  };

  const hasStops = !!stops && stops.length > 0;

  return (
    <motion.div
      className="mx-4 mb-4 rounded-3xl overflow-hidden"
      style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
    >
      <div className="p-4">
        <p className="text-[13px] font-bold text-[#1A1A1A] mb-1">오늘의 여정</p>

        {stops === null ? null : hasStops ? (
          <div className="space-y-1 mt-2">
            {stops.map((s, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-[13px] py-1.5 border-b border-[#F5F0EC] last:border-b-0">
                <span className="text-[#EB5053]">●</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[#1A1A1A]">{s.name}</span>
                    {s.intent && (
                      <span className="text-[10px] font-bold bg-[#FFF5F5] text-[#EB5053] px-1.5 py-0.5 rounded-full">
                        {INTENT_LABEL[s.intent] ?? s.intent}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#9B9B9B] mt-0.5">
                    {s.category ?? ""}{s.category ? " · " : ""}{timeOf(s.at)}
                  </p>
                </div>
                <FeedbackRow stop={s} onAnswer={(a) => answer(s, a)} defaultOpen={i === stops.length - 1 && !s.satisfaction} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[#9B9B9B] mt-1 mb-1">오늘의 여정을 시작해보세요</p>
        )}
      </div>

      {/* Lunchie Mode 진입점 — 카테고리 아이콘으로 바로 시작 */}
      <div className="px-4 pb-4">
        {hasStops && <p className="text-[12px] font-bold text-[#1A1A1A] mb-2">다음 여정은?</p>}
        <div className="flex gap-2">
          {INTENT_ORDER.map((intent) => (
            <motion.button
              key={intent}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/lunchie/settings?intent=${intent}`)}
              className="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl"
              style={{ background: "linear-gradient(180deg, #FB4448 0%, #F47F80 100%)" }}
            >
              <span className="text-[22px] leading-none">{INTENT_ICON[intent]}</span>
              <span className="text-[11px] font-bold text-white">{INTENT_LABEL[intent]}</span>
            </motion.button>
          ))}
        </div>
        <p className="text-[10px] text-[#B0B0B0] mt-2 text-center">그룹과 함께 스와이프로 빠르게 골라요 · Quick Match</p>
      </div>
    </motion.div>
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
      <motion.div variants={fadeUp}>
        <JourneyCard />
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
