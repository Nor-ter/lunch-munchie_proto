import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Bell, MapPin, MessageCircle, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useLocation, useSearch } from 'wouter';
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
  { key: 'coffee', label: '커피', en: 'COFFEE', image: '/assets/characters/quick-match/coffee.png', intent: 'cafe', background: 'linear-gradient(160deg, #FFFDFC 0%, #FFEBDD 100%)', steam: true },
  { key: 'foodie', label: '밥', en: 'FOODIE', image: '/assets/characters/quick-match/rice.png', intent: 'meal', background: 'linear-gradient(160deg, #FFFDFC 0%, #FFE5E0 100%)', steam: true },
  { key: 'dessert', label: '디저트', en: 'DESSERT', image: '/assets/characters/quick-match/dessert.png', intent: 'dessert', background: 'linear-gradient(160deg, #FFFDFC 0%, #FFE2E8 100%)', steam: false },
] as const;

/** 카드 순환 위치: 0=앞, 1=오른쪽 behind, 2=왼쪽 behind */
const DECK_POSITIONS = [
  { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, zIndex: 3 },
  { x: 88, y: 12, scale: 0.88, rotate: 9, opacity: 1, zIndex: 1 },
  { x: -88, y: 12, scale: 0.88, rotate: -9, opacity: 1, zIndex: 1 },
] as const;

function SteamWisps() {
  return (
    <span className="pointer-events-none absolute left-1/2 top-0 z-10 flex -translate-x-1/2 gap-1" aria-hidden="true">
      {[0, 1, 2].map(index => (
        <motion.span
          key={index}
          className="block h-5 w-1 rounded-full bg-white/80 blur-[1px]"
          animate={{ y: [5, -3, -9], x: [0, index === 1 ? 2 : -1, 0], opacity: [0, 0.78, 0], scaleY: [0.7, 1.15, 1.35] }}
          transition={{ duration: 1.8, delay: index * 0.32, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </span>
  );
}

function QuickMatchDeck({
  activeIndex,
  onChange,
}: {
  activeIndex: number;
  onChange: (index: number) => void;
}) {
  return (
    <motion.div
      className="relative mx-auto h-[174px] w-full max-w-[330px]"
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 250, damping: 17 }}
    >
      {QUICK_MATCH_CARDS.map((card, index) => {
        const position = DECK_POSITIONS[(index - activeIndex + 3) % 3]!;
        const isFront = position.zIndex === 3;
        return (
          <div
            key={card.key}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ zIndex: position.zIndex }}
          >
            <motion.button
              type="button"
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
              whileHover={{ scale: position.scale + 0.025 }}
              whileTap={{ scale: position.scale - 0.03 }}
              className="pointer-events-auto flex h-[154px] w-[116px] cursor-grab flex-col items-center justify-center overflow-hidden rounded-[11px] border-[0.75px] border-[#EE8C8D] px-2 pb-3 pt-2 shadow-[0_10px_22px_rgba(153,74,62,0.13)] active:cursor-grabbing"
              style={{ touchAction: 'pan-y', background: card.background }}
            >
              <span className="relative flex h-[106px] w-[104px] items-end justify-center">
                {card.steam && <SteamWisps />}
                <img src={card.image} alt={`${card.label} 음식`} className="h-[98px] w-[102px] object-contain drop-shadow-[0_7px_8px_rgba(104,55,38,0.13)]" draggable={false} />
              </span>
              <span className="mt-0.5 rounded-full bg-white/75 px-2 py-0.5 text-[11px] font-black tracking-[0.05em] text-[#C93B3E]">{card.en}</span>
            </motion.button>
          </div>
        );
      })}
    </motion.div>
  );
}

function LunchieLandingCard() {
  const [, navigate] = useLocation();
  const [activeCard, setActiveCard] = useState(1); // 밥(Foodie) 카드가 기본 선택

  const selectedCard = QUICK_MATCH_CARDS[activeCard]!;

  return (
    <motion.div
      data-ui="lunchie-card-panel"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mx-4 flex min-h-[232px] items-start justify-center overflow-hidden rounded-[22px] border-[0.75px] border-[#F0A0A0] px-4 pb-8 pt-5 shadow-[0_14px_34px_rgba(139,74,61,0.12)]"
      style={{
        backgroundColor: '#FFF9F5',
        backgroundImage: 'radial-gradient(circle at 18% 22%, rgba(255,190,169,.28) 0 18px, transparent 19px), radial-gradient(circle at 84% 76%, rgba(255,214,181,.34) 0 26px, transparent 27px), radial-gradient(rgba(224,113,105,.18) .7px, transparent .7px)',
        backgroundSize: 'auto, auto, 12px 12px',
      }}
    >
      <span className="pointer-events-none absolute -left-5 top-8 h-16 w-16 rotate-12 rounded-[18px] bg-[#FFDCCF]/55" aria-hidden="true" />
      <span className="pointer-events-none absolute -right-3 bottom-8 h-14 w-20 -rotate-12 rounded-full bg-[#FFE5BE]/55" aria-hidden="true" />
      <span className="pointer-events-none absolute left-5 top-3 h-3 w-14 -rotate-6 rounded-sm bg-[#F5B9A5]/45" aria-hidden="true" />
      <div className="relative z-[1] w-full">
        <QuickMatchDeck activeIndex={activeCard} onChange={setActiveCard} />
      </div>
      <motion.button
        type="button"
        onClick={() => navigate(`/lunchie/settings?intent=${selectedCard.intent}`)}
        whileHover={{ y: -2, scale: 1.025 }}
        whileTap={{ scale: 0.97 }}
        className="absolute bottom-4 left-1/2 z-10 flex h-12 w-[64%] -translate-x-1/2 items-center justify-center rounded-[11px] border-[0.75px] border-[#D94447] bg-[#EB5053] px-4 text-[16px] font-black text-white shadow-[0_9px_20px_rgba(201,59,62,0.26)]"
      >
        Quick Match!
      </motion.button>
    </motion.div>
  );
}

export default function HomePage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { feedPosts, profile, isMyPost } = useApp();
  const [journeyStops, setJourneyStops] = useState<JourneyStop[]>([]);
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
    if (new URLSearchParams(search).get('notifications') === '1') {
      setNotificationsOpen(true);
    }
  }, [search]);

  const landingPosts = feedPosts;

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
        body: `내 Munchie 피드에 좋아요 ${post.likes}개가 달렸어요.`,
        href: `/feed/${post.id}?from=notifications`,
        at: new Date(post.createdAt).getTime() + post.likes,
      }] : []),
      ...((post.dislikes ?? 0) > 0 ? [{
        id: `feed-dislike-${post.id}-${post.dislikes}`,
        kind: 'dislike' as const,
        title: '새 싫어요',
        body: `내 Munchie 피드에 싫어요 ${post.dislikes}개가 달렸어요.`,
        href: `/feed/${post.id}?from=notifications`,
        at: new Date(post.createdAt).getTime() + (post.dislikes ?? 0),
      }] : []),
      ...post.comments.map(comment => ({
        id: `feed-comment-${comment.id}`,
        kind: 'comment' as const,
        title: `${comment.authorName}님의 새 코멘트`,
        body: comment.text,
        href: `/feed/${post.id}?from=notifications`,
        at: new Date(comment.createdAt).getTime(),
      })),
    ]);
    return [...journeyItems, ...feedItems].sort((a, b) => b.at - a.at).slice(0, 20);
  }, [feedPosts, isMyPost, journeyStops]);
  const unreadCount = notifications.filter(item => !readNotificationIds.includes(item.id)).length;
  const visibleNotifications = notifications.filter(
    item => !readNotificationIds.includes(item.id),
  );

  const openNotification = (notification: (typeof notifications)[number]) => {
    setReadNotificationIds(current => {
      const next = current.includes(notification.id) ? current : [...current, notification.id];
      localStorage.setItem('lm_read_notifications', JSON.stringify(next));
      return next;
    });
    setNotificationsOpen(false);
    navigate(notification.href);
  };

  return (
    <div className="min-h-dvh bg-[#FFF8F2] pb-[104px] pt-6">
      <header className="px-5 pt-2">
        <div className="relative flex items-center justify-center">
          <img src="/assets/lunchie-wordmark.png" alt="Lunchie Munchie" className="h-auto w-[148px] object-contain" />
          <motion.button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            aria-label="알림 열기"
            aria-expanded={notificationsOpen}
            whileHover={{ scale: 1.08, y: -2, rotate: 4 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 360, damping: 16 }}
            className="group absolute right-0 flex h-10 w-10 items-center justify-center overflow-visible rounded-full border-[0.75px] border-[#EF777A] bg-[linear-gradient(145deg,#FFFDFC_5%,#FFE1D7_100%)] text-[#D94447] shadow-[0_6px_16px_rgba(209,74,68,0.18)]"
          >
            <span className="pointer-events-none absolute inset-[3px] rounded-full bg-[radial-gradient(circle_at_32%_22%,rgba(255,255,255,0.95),transparent_48%)]" aria-hidden="true" />
            <motion.span
              className="relative z-[1] flex"
              animate={unreadCount > 0 ? { rotate: [0, 0, -8, 8, -4, 0, 0] } : { rotate: 0 }}
              transition={unreadCount > 0 ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
            >
              <Bell size={18} strokeWidth={2.1} />
            </motion.span>
            {unreadCount > 0 && (
              <motion.span
                className="absolute -right-1 -top-1 z-[2] flex h-5 min-w-5 items-center justify-center rounded-full border-[1.5px] border-white bg-[linear-gradient(145deg,#FF6B68,#F23844)] px-1 text-[8px] font-black text-white shadow-[0_3px_8px_rgba(219,55,65,0.3)]"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </motion.button>
        </div>

        <div className="mt-9 flex items-center justify-between gap-3">
          <h1 className="min-w-0 text-[25px] font-black leading-[1.45] tracking-[-0.04em] text-[#3B2A23]">
            런치로 같이 메뉴 정하기!
            <br />먼치로 함께 맛집 코스 탐방!
          </h1>
          <LunchkinCharacter size={78} className="mr-2" />
        </div>
      </header>

      <section className="mt-10">
        <div className="px-4">
          <h2 className="text-[25px] font-black leading-none tracking-[0.01em] text-[#C93B3E]">LUNCHIE</h2>
          <p className="mt-1 text-[14px] font-medium text-[#8B5E5D]">런치로 같이 점심 정하기!</p>
        </div>
        <div className="mt-3">
        <LunchieLandingCard />
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between px-4">
          <div>
            <h2 className="text-[25px] font-black leading-none text-[#C93B3E]">MUNCHIE</h2>
            <p className="mt-1 text-[14px] font-medium text-[#8B5E5D]">먼치로 함께 맛집 코스 탐방</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/feed')}
            className="flex items-center gap-1 text-[14px] font-black text-[#D94447]"
          >
            더보기 <ArrowRight size={17} />
          </button>
        </div>

        <div className="mt-5 pl-4">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 pr-4 scrollbar-hide">
            {landingPosts.map(post => (
              <div key={post.id} data-ui="munchie-home-card" className="w-[68%] shrink-0 snap-start">
                <UnifiedMunchieCard post={post} compact homeSummary />
              </div>
            ))}
          </div>
        </div>
      </section>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {notificationsOpen && (
            <>
            <motion.button
              type="button"
              aria-label="알림 닫기"
              className="fixed inset-0 z-50 bg-black/35"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, pointerEvents: 'auto' }}
              exit={{ opacity: 0, pointerEvents: 'none' }}
              onClick={() => setNotificationsOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0, pointerEvents: 'auto' }}
              exit={{ x: '100%', pointerEvents: 'none' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="fixed bottom-0 right-0 top-0 z-[60] w-[min(88vw,390px)] overflow-y-auto bg-[#FFFDFB] px-4 pb-8 pt-12 shadow-[-18px_0_45px_rgba(47,29,20,0.18)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="mt-1 text-[22px] font-black text-[#251A16]">알림 {unreadCount > 0 && <span className="text-[#FF424B]">{unreadCount}</span>}</h2>
                </div>
                <button type="button" onClick={() => setNotificationsOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7EFEA]" aria-label="닫기"><X size={18} /></button>
              </div>
              <section className="mt-5 rounded-[22px] border border-[#F1D8CC] bg-[#FFF5EF] p-4">
                <div className="flex items-center justify-between">
                  <div>
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
                {visibleNotifications.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#E1D2C8] px-5 py-12 text-center text-[12px] font-semibold text-[#A38D82]">더이상 새로운 알람이 없어요</div>
                ) : visibleNotifications.map(item => {
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
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
