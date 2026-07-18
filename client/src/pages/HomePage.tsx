import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ArrowRight, MapPin, Clock, Star } from "lucide-react";
import {
  useApp,
  Course,
  isFeedCommentHidden,
  resolveApiRequestAuth,
  type ApiRequestAuth,
} from "@/contexts/AppContext";
import { getCourseSequenceColor } from "@/constants/courseTheme";
import { MUNCHIE_SKINS } from "@/constants/skins";
import { getCreatorName } from "@/constants/creators";
import SkinFrame from "@/components/munchie/SkinFrame";
import { logEvent } from "@/lib/eventLogger";
import { toast } from "sonner";
import { useRotatingFeedback } from "@/hooks/useRotatingFeedback";

type JourneyStop = {
  restaurant_id: string;
  name: string;
  category: string | null;
  intent: string | null;
  at: number;
  satisfaction: "POS" | "NEU" | "NEG" | null;
};

interface JourneyRequestDependencies {
  resolveRequestAuth?: () => Promise<ApiRequestAuth>;
  request?: typeof fetch;
}

export async function fetchTodayJourney(
  userId: string,
  dependencies: JourneyRequestDependencies = {},
): Promise<JourneyStop[]> {
  try {
    const auth = await (
      dependencies.resolveRequestAuth ?? resolveApiRequestAuth
    )();
    if (auth.status === "blocked") {
      return [];
    }

    const request = dependencies.request ?? fetch;
    const requestInit: RequestInit | undefined =
      auth.status === "authenticated"
        ? {
            headers: {
              Authorization: `Bearer ${auth.accessToken}`,
            },
          }
        : undefined;
    const response = await request(
      `/api/journey/today?userId=${encodeURIComponent(userId)}`,
      requestInit,
    );
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.stops ?? [];
  } catch {
    return [];
  }
}

const INTENT_LABEL: Record<string, string> = { meal: "밥", cafe: "음료", dessert: "디저트" };
const INTENT_ICON: Record<string, string> = { meal: "🍚", cafe: "☕", dessert: "🍰" };
const INTENT_ORDER = ["meal", "cafe", "dessert"] as const;

function FeedbackRow({
  stop,
  onAnswer,
  defaultOpen,
}: {
  stop: JourneyStop;
  onAnswer: (action: "POS" | "NEU" | "NEG") => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const emoji = stop.satisfaction === "POS" ? "👍" : stop.satisfaction === "NEG" ? "👎" : stop.satisfaction === "NEU" ? "😐" : null;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex-shrink-0 text-[15px] leading-none active:scale-90">
        {emoji ?? <span className="whitespace-nowrap rounded-full bg-[#FFF5F5] px-2 py-1 text-[10px] font-bold text-[#EB5053]">평가하기</span>}
      </button>
    );
  }

  return (
    <div className="mt-1.5 flex w-full gap-1.5">
      {([[
        "POS", "👍 좋았어요", "#EAF7EC", "#2E9E42",
      ], [
        "NEU", "😐 그냥", "#F1EFE8", "#6E6E6E",
      ], [
        "NEG", "👎 별로", "#FBECEC", "#D83A3D",
      ]] as const).map(([action, label, background, color]) => (
        <button
          key={action}
          onClick={() => {
            onAnswer(action);
            setOpen(false);
          }}
          className="flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-transform active:scale-95"
          style={{ background, color }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// data-jp-v3의 오늘의 여정 + Lunchie Mode 통합 진입 카드.
function JourneyCard() {
  const { profile } = useApp();
  const [, navigate] = useLocation();
  const [stops, setStops] = useState<JourneyStop[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchTodayJourney(profile.id)
      .then(data => { if (active) setStops(data); })
      .catch(() => { if (active) setStops([]); });
    return () => { active = false; };
  }, [profile.id]);

  const answer = (stop: JourneyStop, action: "POS" | "NEU" | "NEG") => {
    logEvent({
      event_type: "SURVEY",
      action,
      user_id: profile.id,
      restaurant_id: stop.restaurant_id,
      session_id: null,
    });
    setStops(previous => previous?.map(item => (
      item.restaurant_id === stop.restaurant_id && item.at === stop.at
        ? { ...item, satisfaction: action }
        : item
    )) ?? previous);
    toast.success("피드백 고마워요! 🙌");
  };

  const hasStops = !!stops && stops.length > 0;
  const timeOf = (at: number) => new Date(at).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <motion.div
      className="mx-4 mb-4 mt-[31px] overflow-hidden rounded-3xl"
      style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
    >
      <div className="p-4">
        <p className="mb-1 text-[13px] font-bold text-[#1A1A1A]">오늘의 여정</p>
        {stops === null ? null : hasStops ? (
          <div className="mt-2 space-y-1">
            {stops.map((stop, index) => (
              <div key={`${stop.restaurant_id}-${stop.at}`} className="flex flex-wrap items-center gap-2 border-b border-[#F5F0EC] py-1.5 text-[13px] last:border-b-0">
                <span className="text-[#EB5053]">●</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-[#1A1A1A]">{stop.name}</span>
                    {stop.intent && (
                      <span className="rounded-full bg-[#FFF5F5] px-1.5 py-0.5 text-[10px] font-bold text-[#EB5053]">
                        {INTENT_LABEL[stop.intent] ?? stop.intent}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#9B9B9B]">
                    {stop.category ?? ""}{stop.category ? " · " : ""}{timeOf(stop.at)}
                  </p>
                </div>
                <FeedbackRow
                  stop={stop}
                  onAnswer={action => answer(stop, action)}
                  defaultOpen={index === stops.length - 1 && !stop.satisfaction}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-1 mt-1 text-[13px] text-[#9B9B9B]">오늘의 여정을 시작해보세요</p>
        )}
      </div>

      <div className="px-4 pb-4">
        {hasStops && <p className="mb-2 text-[12px] font-bold text-[#1A1A1A]">다음 여정은?</p>}
        <div className="flex gap-2">
          {INTENT_ORDER.map(intent => (
            <motion.button
              key={intent}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/lunchie/settings?intent=${intent}`)}
              className="flex flex-1 flex-col items-center gap-1 rounded-2xl py-3"
              style={{ background: "linear-gradient(180deg, #FB4448 0%, #F47F80 100%)" }}
            >
              <span className="text-[22px] leading-none">{INTENT_ICON[intent]}</span>
              <span className="text-[11px] font-bold text-white">{INTENT_LABEL[intent]}</span>
            </motion.button>
          ))}
        </div>
        <p className="mt-2 text-center text-[10px] text-[#B0B0B0]">그룹과 함께 스와이프로 빠르게 골라요 · Quick Match</p>
      </div>
    </motion.div>
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

      {/* 오늘의 여정 + Lunchie Mode — data-jp-v3 UI/로직 */}
      <JourneyCard />

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
