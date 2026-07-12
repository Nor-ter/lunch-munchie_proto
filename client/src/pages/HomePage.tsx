import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Heart, X, ArrowRight, MapPin, Clock, Star } from "lucide-react";
import { useApp, Course, MOCK_RESTAURANTS, isFeedCommentHidden } from "@/contexts/AppContext";
import { getCourseSequenceColor } from "@/constants/courseTheme";
import { MUNCHIE_SKINS } from "@/constants/skins";
import { getCreatorName } from "@/constants/creators";
import SkinFrame from "@/components/munchie/SkinFrame";
import { logEvent } from "@/lib/eventLogger";
import { toast } from "sonner";
import { useRotatingFeedback } from "@/hooks/useRotatingFeedback";

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

/** 스크랩북 스킨을 입힌 코스 카드 — 홈 Munchie Mode 좌우 스와이프 캐러셀용 */
function SkinCourseCard({ course, skinIndex }: { course: Course; skinIndex: number }) {
  const [, navigate] = useLocation();
  const { getRestaurantById, feedPosts } = useApp();
  const skin = MUNCHIE_SKINS[skinIndex % 4]; // 핑크/옐로우/빈티지/블루 순환

  const stopRestaurants = course.stops
    .map(s => getRestaurantById(s.placeId))
    .filter((r): r is NonNullable<typeof r> => !!r);
  const rating = stopRestaurants.length
    ? (stopRestaurants.reduce((sum, r) => sum + r.rating, 0) / stopRestaurants.length).toFixed(1)
    : '4.5';
  const collagePhotos = [course.heroImage, ...stopRestaurants.map(r => r.image)].slice(0, 2);
  // 작성자의 한줄평 다음, 인기 피드의 답글을 최신순으로 순환한다.
  const coursePosts = feedPosts
    .filter(p => p.courseId === course.id)
    .sort((a, b) => (b.likes + b.saves) - (a.likes + a.saves) || b.createdAt.localeCompare(a.createdAt));
  const latestCaption = [...coursePosts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.caption;
  const rotatingFeedback = useRotatingFeedback([
    ...(latestCaption ? [latestCaption] : []),
    ...coursePosts.flatMap(post => post.comments
      .filter(comment => !isFeedCommentHidden(comment))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(comment => comment.text)),
  ]);

  return (
    <motion.div
      className="w-[236px] flex-shrink-0 snap-center cursor-pointer"
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/course/${course.id}?from=feed`)}
    >
      <SkinFrame skin={skin} radius={22} padding={9}>
        <div className="px-3 pt-3 pb-3.5">
          {/* 폴라로이드 콜라주 */}
          <div className="relative h-[118px]">
            {collagePhotos.map((src, i) => (
              <div
                key={i}
                className="absolute bg-white p-[5px] pb-[14px] shadow-md"
                style={{
                  width: 118,
                  left: i === 0 ? 6 : 84,
                  top: i === 0 ? 2 : 10,
                  transform: `rotate(${i === 0 ? -4 : 5}deg)`,
                  zIndex: i === 0 ? 1 : 2,
                  borderRadius: 4,
                }}
              >
                <img src={src} alt="" className="h-[80px] w-full object-cover" draggable={false} />
              </div>
            ))}
          </div>

          {/* 제목 + 평점 */}
          <div className="mt-2 flex items-center gap-1.5">
            <h3
              className="font-bold text-[14px] leading-tight truncate"
              style={{ color: skin.text, fontFamily: skin.titleFont }}
            >
              {course.title}
            </h3>
            <span className="flex items-center gap-0.5 text-[11px] font-bold shrink-0" style={{ color: skin.accent }}>
              <Star size={10} fill="currentColor" /> {rating}
            </span>
          </div>

          {/* 스탯 */}
          <div className="mt-1.5 flex items-center gap-2.5 text-[10px]" style={{ color: skin.sub }}>
            <span>◎ {course.metadata.placeCount} Stops</span>
            <span className="flex items-center gap-0.5"><Clock size={9} /> {Math.floor(course.metadata.duration / 60)}h</span>
            <span className="flex items-center gap-0.5"><MapPin size={9} /> {course.metadata.distance}km</span>
          </div>

          {/* 한줄평 (이 코스로 남긴 최근 피드) */}
          {rotatingFeedback && (
            <motion.p
              key={rotatingFeedback}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 flex h-[42px] items-center overflow-hidden rounded-lg px-2 py-1.5 text-[10.5px] leading-snug"
              style={{ background: `${skin.accent}12`, color: skin.text }}
            >
              <span className="line-clamp-2">💬 {rotatingFeedback}</span>
            </motion.p>
          )}

          {/* 스팟 번호 서클 */}
          <div className="mt-2.5 flex items-center">
            {stopRestaurants.slice(0, 4).map((r, i) => {
              const color = getCourseSequenceColor(i);
              return (
                <div key={`${r.id}-${i}`} className="flex items-center">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full overflow-hidden border-2" style={{ borderColor: color.base }}>
                      <img src={r.image} alt="" className="w-full h-full object-cover" draggable={false} />
                    </div>
                    <span
                      className="absolute -top-1 -left-1 w-[15px] h-[15px] rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                      style={{ background: color.base }}
                    >
                      {i + 1}
                    </span>
                  </div>
                  {i < Math.min(stopRestaurants.length, 4) - 1 && (
                    <span className="w-3 border-t-2 border-dotted" style={{ borderColor: color.lighter }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* 작성자 */}
          <div className="mt-2.5 flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[12px]" style={{ background: `${skin.accent}1A` }}>
              🙂
            </div>
            <span className="text-[10px] font-semibold" style={{ color: skin.text }}>
              {getCreatorName(course.creatorId)}
            </span>
            <span className="text-[10px]" style={{ color: skin.sub }}>
              팔로워 2,380명
            </span>
          </div>
        </div>
      </SkinFrame>
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

        <h1 className="text-[28px] font-bold leading-[1.25] text-black" style={{ paddingLeft: 20 }}>
          스크랩으로 기록하고,
          <br />
          함께 나누는 맛집 코스
        </h1>
        <p
          className="mt-[13px] text-[11px] leading-none"
          style={{ color: "#6E6A67", paddingLeft: 20 }}
        >
          코스를 발견하고, 스킨을 입혀 추억을 공유해요.
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
            onClick={() => navigate("/feed")}
            className="flex items-center gap-[6px] text-[16px] font-bold leading-none text-black active:opacity-60"
          >
            더보기 <ArrowRight size={20} strokeWidth={2.4} />
          </button>
        </div>
        <p className="mb-[12px] text-[10px] leading-none text-black" style={{ paddingLeft: 20 }}>
          이번주 사람들이 많이 저장한 코스
        </p>
      </motion.div>

      {/* 스킨 카드 캐러셀 — 좌우 스와이프 */}
      <motion.div variants={fadeUp}>
        <div
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pt-3 pb-4"
          style={{
            paddingLeft: "clamp(24px, 10.2vw, 41px)",
            paddingRight: "clamp(24px, 10.2vw, 41px)",
            scrollbarWidth: "none",
          }}
        >
          {courses.slice(0, 4).map((course, i) => (
            <SkinCourseCard key={course.id} course={course} skinIndex={i} />
          ))}
        </div>
      </motion.div>

    </motion.div>
  );
}
