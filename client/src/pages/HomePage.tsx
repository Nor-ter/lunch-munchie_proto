import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Bell, Sparkles } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  resolveApiRequestAuth,
  type ApiRequestAuth,
  useApp,
} from '@/contexts/AppContext';
import { lunchmateLoadoutFromProfile } from '@/utils/lunchmateProfile';
import LunchmateCharacterRenderer from '@/components/munchie/LunchmateCharacterRenderer';
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

const QUICK_MATCH_CHOICES = [
  { label: '밥', icon: '🍚', rotate: -7, x: 0 },
  { label: '카페', icon: '☕', rotate: 0, x: -7 },
  { label: '디저트', icon: '🍰', rotate: 7, x: -14 },
] as const;

function LunchieLandingCard() {
  const [, navigate] = useLocation();
  const { profile } = useApp();
  const [journeyStops, setJourneyStops] = useState<JourneyStop[]>([]);
  const loadout = useMemo(
    () => lunchmateLoadoutFromProfile(profile.lunchmateLoadout),
    [profile.lunchmateLoadout],
  );

  useEffect(() => {
    let active = true;
    fetchTodayJourney(profile.id).then(stops => {
      if (active) setJourneyStops(stops);
    });
    return () => { active = false; };
  }, [profile.id]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 overflow-hidden rounded-[28px] border border-[#E9DDD4] bg-white shadow-[0_14px_36px_rgba(73,44,30,0.08)]"
    >
      <div className="flex items-end justify-between px-5 pb-3 pt-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FF424B]">Quick decision</p>
          <h2 className="mt-1 text-[24px] font-black leading-none text-[#211713]">LUNCHIE</h2>
          <p className="mt-2 text-[12px] font-semibold text-[#8D776C]">런치로 같이 점심 정하기!</p>
        </div>
        {journeyStops.length > 0 && (
          <span className="max-w-[120px] truncate rounded-full bg-[#FFF0EA] px-3 py-1.5 text-[9px] font-black text-[#F25055]">
            오늘 {journeyStops.length}곳 완료
          </span>
        )}
      </div>

      <div className="relative mx-3.5 mb-3.5 min-h-[228px] overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#FFF2E8_0%,#FFE6E4_100%)] px-4 py-4">
        <div className="absolute -right-9 -top-9 h-32 w-32 rounded-full bg-white/40" />
        <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-[#FFC8C5]/35" />

        <div className="relative flex h-[142px] items-center">
          <div className="flex min-w-0 flex-1 items-center pl-1">
            {QUICK_MATCH_CHOICES.map(choice => (
              <button
                type="button"
                key={choice.label}
                onClick={() => navigate(`/lunchie/settings?intent=${choice.label === '밥' ? 'meal' : choice.label === '카페' ? 'cafe' : 'dessert'}`)}
                className="relative flex h-[104px] w-[82px] shrink-0 flex-col items-center justify-center rounded-[20px] border-2 border-white bg-white shadow-[0_10px_24px_rgba(85,49,34,0.12)] active:scale-95"
                style={{ transform: `translateX(${choice.x}px) rotate(${choice.rotate}deg)` }}
              >
                <span className="text-[30px]">{choice.icon}</span>
                <span className="mt-1 text-[12px] font-black text-[#392A23]">{choice.label}</span>
              </button>
            ))}
          </div>
          <div className="relative z-10 mr-1 flex w-[106px] flex-col items-center">
            <span className="mb-[-8px] rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-[#FF424B] shadow-sm">
              뭐 먹지?
            </span>
            <LunchmateCharacterRenderer
              flowState="selectingFood"
              loadout={loadout}
              size={94}
              renderSize="room"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/lunchie/settings')}
          className="relative flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF424B] text-[13px] font-black text-white shadow-[0_10px_22px_rgba(255,66,75,0.27)] active:scale-[0.98]"
        >
          <Sparkles size={16} /> Quick Match Start!
        </button>
      </div>
    </motion.section>
  );
}

export default function HomePage() {
  const [, navigate] = useLocation();
  const { feedPosts } = useApp();

  return (
    <div className="min-h-dvh bg-[#FFFDFB] pb-[96px]">
      <header className="px-5 pb-7 pt-12">
        <div className="relative flex items-center justify-center">
          <p className="text-[17px] font-black tracking-[-0.02em] text-[#251A16]">Lunchie Munchie</p>
          <button
            type="button"
            aria-label="알림 열기"
            className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-full border border-[#2C211C] bg-white text-[#2C211C] active:scale-95"
          >
            <Bell size={18} />
            <span className="absolute right-[9px] top-[8px] h-2 w-2 rounded-full border-2 border-white bg-[#FF424B]" />
          </button>
        </div>

        <div className="mt-12">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF424B]">Two ways to enjoy</p>
          <h1 className="mt-3 text-[29px] font-black leading-[1.32] tracking-[-0.04em] text-[#1F1713]">
            런치로 같이 점심 정하기!
            <br />
            먼치로 함께 맛집 코스 탐방!
          </h1>
          <p className="mt-3 text-[11px] font-semibold leading-relaxed text-[#927D72]">
            오늘의 메뉴를 빠르게 고르고, 마음에 든 코스는 템플릿으로 기록해요.
          </p>
        </div>
      </header>

      <LunchieLandingCard />

      <section className="mt-10">
        <div className="flex items-end justify-between px-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FF424B]">Course stories</p>
            <h2 className="mt-1 text-[24px] font-black leading-none text-[#211713]">MUNCHIE</h2>
            <p className="mt-2 text-[12px] font-semibold text-[#8D776C]">먼치로 함께 맛집 코스 탐방</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/feed')}
            className="flex items-center gap-1 text-[12px] font-black text-[#3B2B24]"
          >
            더보기 <ArrowRight size={17} />
          </button>
        </div>

        <div className="mt-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-5 scrollbar-hide">
          {feedPosts.slice(0, 4).map(post => (
            <div key={post.id} className="w-[340px] shrink-0 snap-center">
              <UnifiedMunchieCard post={post} compact />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
