import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Bell, MapPin, MessageCircle, Sparkles, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  resolveApiRequestAuth,
  type ApiRequestAuth,
  useApp,
} from '@/contexts/AppContext';
import LunchkinCharacter from '@/components/munchie/LunchkinCharacter';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';

type JourneyStop = {
  restaurant_id: string;
  name: string;
  category: string | null;
  intent: string | null;
  at: number;
  satisfaction: 'POS' | 'NEU' | 'NEG' | null;
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
    if (auth.status === 'blocked') return [];

    const request = dependencies.request ?? fetch;
    const requestInit: RequestInit | undefined = auth.status === 'authenticated'
      ? { headers: { Authorization: `Bearer ${auth.accessToken}` } }
      : undefined;
    const response = await request(
      `/api/journey/today?userId=${encodeURIComponent(userId)}`,
      requestInit,
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.stops ?? [];
  } catch {
    return [];
  }
}

/** 스와이프 카드덱 — 커피/밥/디저트 세 장이 순환하며 앞의 카드가 선택 상태다 */
const QUICK_MATCH_CARDS = [
  { key: 'coffee', label: '커피', en: 'Coffee', icon: '☕', intent: 'cafe' },
  { key: 'foodie', label: '밥', en: 'Foodie', icon: '🍚', intent: 'meal' },
  { key: 'dessert', label: '디저트', en: 'Dessert', icon: '🍰', intent: 'dessert' },
] as const;

/** 카드 순환 위치: 0=앞, 1=오른쪽 behind, 2=왼쪽 behind */
const DECK_POSITIONS = [
  { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, zIndex: 3 },
  { x: 60, y: 10, scale: 0.84, rotate: 10, opacity: 0.88, zIndex: 1 },
  { x: -60, y: 10, scale: 0.84, rotate: -10, opacity: 0.88, zIndex: 1 },
] as const;

function QuickMatchDeck({
  activeIndex,
  onChange,
}: {
  activeIndex: number;
  onChange: (index: number) => void;
}) {
  return (
    <div className="relative h-[128px] w-[180px]">
      {QUICK_MATCH_CARDS.map((card, index) => {
        const position = DECK_POSITIONS[(index - activeIndex + 3) % 3]!;
        const isFront = position.zIndex === 3;
        return (
          <motion.button
            type="button"
            key={card.key}
            aria-label={`${card.label} 카드${isFront ? ' (선택됨)' : ''}`}
            drag={isFront ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.45}
            onDragEnd={(_, info) => {
              if (info.offset.x < -45) onChange((activeIndex + 2) % 3);
              else if (info.offset.x > 45) onChange((activeIndex + 1) % 3);
            }}
            onClick={() => !isFront && onChange(index)}
            animate={{
              x: position.x,
              y: position.y,
              scale: position.scale,
              rotate: position.rotate,
              opacity: position.opacity,
            }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="absolute left-1/2 top-1/2 flex h-[112px] w-[86px] -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center justify-center rounded-[20px] border-2 border-white bg-white shadow-[0_10px_24px_rgba(85,49,34,0.14)] active:cursor-grabbing"
            style={{ zIndex: position.zIndex, touchAction: 'pan-y' }}
          >
            <span className="text-[32px]">{card.icon}</span>
            <span className="mt-1 text-[12px] font-black text-[#392A23]">{card.label}</span>
            <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#B79E92]">{card.en}</span>
            {isFront && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[#FF424B] px-2 py-0.5 text-[8px] font-black text-white shadow-sm">
                PICK
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

function LunchieLandingCard({ journeyStops }: { journeyStops: JourneyStop[] }) {
  const [, navigate] = useLocation();
  const [activeCard, setActiveCard] = useState(1); // 밥(Foodie) 카드가 기본 선택

  const selectedCard = QUICK_MATCH_CARDS[activeCard]!;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 flex flex-col overflow-hidden rounded-[24px] border border-[#E9DDD4] bg-white shadow-[0_10px_26px_rgba(73,44,30,0.07)]"
    >
      <div className="flex items-end justify-between px-4 pb-1.5 pt-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#FF4D57]">Quick decision</p>
          <h2 className="mt-0.5 text-[19px] font-black leading-none text-[#2B211D]">LUNCHIE</h2>
          <p className="mt-1 text-[10px] font-semibold text-[#8D776C]">런치로 같이 점심 정하기!</p>
        </div>
        {journeyStops.length > 0 && (
          <span className="max-w-[112px] truncate rounded-full bg-[#FFF0EA] px-2.5 py-1 text-[8px] font-black text-[#F25055]">
            오늘 {journeyStops.length}곳 완료
          </span>
        )}
      </div>

      <div className="relative mx-3 mb-3 flex min-h-[250px] flex-col justify-center overflow-hidden rounded-[20px] bg-[linear-gradient(145deg,#FFF3E9_0%,#FFE8E4_100%)] px-4 py-3">
        <div className="absolute -right-9 -top-9 h-32 w-32 rounded-full bg-white/40" />
        <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-[#FFC8C5]/35" />

        {/* 카드덱 + 런치킨 */}
        <div className="relative flex w-full flex-1 items-center justify-center gap-8">
          <div className="flex min-w-0 flex-1 justify-center">
            <QuickMatchDeck activeIndex={activeCard} onChange={setActiveCard} />
          </div>
          <div className="relative z-10 flex w-[108px] shrink-0 flex-col items-center">
            <span className="mb-[-4px] rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-[#FF424B] shadow-sm">
              뭐 먹지?
            </span>
            <LunchkinCharacter size={98} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/lunchie/settings?intent=${selectedCard.intent}`)}
          className="relative mt-1 flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-[13px] bg-[#FF5962] px-4 text-[11px] font-black text-white shadow-[0_8px_18px_rgba(255,77,87,0.22)] active:scale-[0.98]"
        >
          <Sparkles size={14} /> Quick Match Start! · {selectedCard.label}
        </button>
      </div>
    </motion.section>
  );
}

export default function HomePage() {
  const [, navigate] = useLocation();
  const { feedPosts, profile, isMyPost } = useApp();
  const [journeyStops, setJourneyStops] = useState<JourneyStop[]>([]);
  const [captionOffset, setCaptionOffset] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('lm_read_notifications') ?? '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    let active = true;
    fetchTodayJourney(profile.id).then(stops => { if (active) setJourneyStops(stops); });
    return () => { active = false; };
  }, [profile.id]);

  useEffect(() => {
    localStorage.setItem('lm_read_notifications', JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  useEffect(() => {
    if (feedPosts.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setCaptionOffset(current => (current + 1) % feedPosts.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [feedPosts.length]);

  const landingPosts = feedPosts;
  const rotatingCaptions = useMemo(() => landingPosts.map((_, index) => (
    feedPosts.length > 0
      ? feedPosts[(captionOffset + index) % feedPosts.length]!.caption
      : ''
  )), [captionOffset, feedPosts, landingPosts]);

  const notifications = useMemo(() => {
    const journeyItems = journeyStops.map(stop => ({
      id: `journey-${stop.restaurant_id}-${stop.at}`,
      kind: 'journey' as const,
      title: '오늘의 여정',
      body: `${stop.name}${stop.satisfaction ? '에서의 기록이 추가됐어요.' : '이(가) 다음 여정으로 등록됐어요.'}`,
      href: '/profile',
      at: stop.at,
    }));
    const feedItems = feedPosts.filter(isMyPost).flatMap(post => [
      ...(post.likes > 0 ? [{
        id: `feed-like-${post.id}-${post.likes}`,
        kind: 'like' as const,
        title: '새 좋아요',
        body: `내 코스피드에 좋아요 ${post.likes}개가 달렸어요.`,
        href: `/feed/${post.id}?from=home`,
        at: new Date(post.createdAt).getTime() + post.likes,
      }] : []),
      ...((post.dislikes ?? 0) > 0 ? [{
        id: `feed-dislike-${post.id}-${post.dislikes}`,
        kind: 'dislike' as const,
        title: '새 싫어요',
        body: `내 코스피드에 싫어요 ${post.dislikes}개가 달렸어요.`,
        href: `/feed/${post.id}?from=home`,
        at: new Date(post.createdAt).getTime() + (post.dislikes ?? 0),
      }] : []),
      ...post.comments.map(comment => ({
        id: `feed-comment-${comment.id}`,
        kind: 'comment' as const,
        title: `${comment.authorName}님의 새 코멘트`,
        body: comment.text,
        href: `/feed/${post.id}?from=home`,
        at: new Date(comment.createdAt).getTime(),
      })),
    ]);
    return [...journeyItems, ...feedItems].sort((a, b) => b.at - a.at).slice(0, 20);
  }, [feedPosts, isMyPost, journeyStops]);
  const unreadCount = notifications.filter(item => !readNotificationIds.includes(item.id)).length;

  const openNotification = (notification: (typeof notifications)[number]) => {
    setReadNotificationIds(current => current.includes(notification.id) ? current : [...current, notification.id]);
    setNotificationsOpen(false);
    navigate(notification.href);
  };

  return (
    <div className="min-h-dvh bg-[#FFFDFB] pb-[104px] pt-3">
      <header className="px-5 pt-2">
        <div className="relative flex items-center justify-center">
          <img src="/assets/lunchie-wordmark.png" alt="Lunchie Munchie" className="h-auto w-[172px] object-contain" />
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            aria-label="알림 열기"
            className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-full border border-[#2C211C] bg-white text-[#2C211C] active:scale-95"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#FF424B] px-1 text-[8px] font-black text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="mt-8">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#FF4D57]">Two ways to enjoy</p>
          <h1 className="mt-2 text-[29px] font-black leading-[1.3] tracking-[-0.04em] text-[#1F1713]">
            런치로 같이 점심 정하기!
            <br />
            먼치로 함께 맛집 코스 탐방!
          </h1>
        </div>
      </header>

      <div className="mt-12">
        <LunchieLandingCard journeyStops={journeyStops} />
      </div>

      <section className="mt-7">
        <div className="flex items-end justify-between px-5">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#FF4D57]">Munchie stories</p>
            <h2 className="mt-0.5 text-[18px] font-black leading-none text-[#211713]">MUNCHIE</h2>
            <p className="mt-1 text-[9px] font-semibold text-[#8D776C]">먼치로 함께 맛집 코스 탐방</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/feed')}
            className="flex items-center gap-1 text-[10px] font-black text-[#3B2B24]"
          >
            더보기 <ArrowRight size={17} />
          </button>
        </div>

        <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3.5 pb-4 scrollbar-hide">
          {landingPosts.map((post, index) => (
            <div key={post.id} className="w-[76%] shrink-0 snap-start">
              <UnifiedMunchieCard post={post} compact captionOverride={rotatingCaptions[index]} />
            </div>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {notificationsOpen && (
          <>
            <motion.button
              type="button"
              aria-label="알림 닫기"
              className="fixed inset-0 z-50 bg-black/35"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setNotificationsOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="fixed bottom-0 right-0 top-0 z-[60] w-[min(88vw,390px)] overflow-y-auto bg-[#FFFDFB] px-4 pb-8 pt-12 shadow-[-18px_0_45px_rgba(47,29,20,0.18)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FF424B]">Updates</p>
                  <h2 className="mt-1 text-[22px] font-black text-[#251A16]">알림 {unreadCount > 0 && <span className="text-[#FF424B]">{unreadCount}</span>}</h2>
                </div>
                <button type="button" onClick={() => setNotificationsOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7EFEA]" aria-label="닫기"><X size={18} /></button>
              </div>
              <section className="mt-5 rounded-[22px] border border-[#F1D8CC] bg-[#FFF5EF] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#E97770]">Today’s journey</p>
                    <h3 className="mt-1 text-[17px] font-black text-[#3E2D25]">오늘의 여정</h3>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#DB6C66]">{journeyStops.length}곳</span>
                </div>
                {journeyStops.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {journeyStops.map((stop, index) => (
                      <div key={`${stop.restaurant_id}-${stop.at}`} className="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F6B5AC] text-[11px] font-black text-white">{index + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-[#4B382F]">{stop.name}</span>
                        <span className="text-[10px] font-semibold text-[#A68C7F]">{stop.category ?? '맛집'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-2xl bg-white px-3 py-4 text-center text-[11px] font-semibold text-[#9D8579]">오늘 등록된 여정이 아직 없어요.</p>
                )}
              </section>
              {unreadCount > 0 && (
                <button type="button" onClick={() => setReadNotificationIds(notifications.map(item => item.id))} className="mt-3 text-[11px] font-black text-[#F25055]">모두 읽음</button>
              )}
              <div className="mt-5 space-y-2.5">
                {notifications.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#E1D2C8] px-5 py-12 text-center text-[12px] font-semibold text-[#A38D82]">새 알림이 없어요.</div>
                ) : notifications.map(item => {
                  const unread = !readNotificationIds.includes(item.id);
                  const Icon = item.kind === 'journey' ? MapPin : item.kind === 'like' ? ThumbsUp : item.kind === 'dislike' ? ThumbsDown : MessageCircle;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => openNotification(item)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left ${unread ? 'border-[#F7C7BE] bg-[#FFF2EE]' : 'border-[#EDE3DC] bg-white'}`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${unread ? 'bg-[#FF424B] text-white' : 'bg-[#F5EEEA] text-[#8A7469]'}`}><Icon size={15} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-black text-[#352720]">{item.title}</span>
                        <span className="mt-1 block line-clamp-2 text-[11px] font-semibold leading-relaxed text-[#887369]">{item.body}</span>
                      </span>
                      {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#FF424B]" />}
                    </button>
                  );
                })}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
