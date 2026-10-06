import { englishText } from '@shared/englishCopy';
/** Lunchie Munchie — Quick Match decisions and after-meal memories. */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { MapPin, Star, Utensils } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import FoodImage from '@/components/FoodImage';
import { toast } from 'sonner';
import {
  mergeFoodJourneyStops,
  readFoodJourneyStops,
  updateFoodJourneyRating,
  type FoodJourneyStop,
} from '@/lib/foodJourney';

type JourneyDay = { key: string; label: string; stops: FoodJourneyStop[] };

function groupJourneyByDay(stops: FoodJourneyStop[]): JourneyDay[] {
  const days = new Map<string, JourneyDay>();
  [...stops].sort((a, b) => b.at - a.at).forEach(stop => {
    const date = new Date(stop.at);
    if (!Number.isFinite(date.getTime())) return;
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    const label = date.toDateString() === today.toDateString() ? "Today's Lunchie Picks"
      : date.toDateString() === yesterday.toDateString() ? "Yesterday's Lunchie Picks"
        : new Intl.DateTimeFormat('en-AU', { month: 'long', day: 'numeric', weekday: 'short' }).format(date);
    const day = days.get(key) ?? { key, label, stops: [] };
    day.stops.push(stop);
    days.set(key, day);
  });
  return Array.from(days.values());
}

export default function SavedPage() {
  const [, navigate] = useLocation();
  const { savedLunchPicks } = useApp();
  const auth = useAuthStatus();
  const [journeyStops, setJourneyStops] = useState<FoodJourneyStop[]>([]);
  const [journeyLoading, setJourneyLoading] = useState(true);
  const [savingRatingKey, setSavingRatingKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const localStops = readFoodJourneyStops(
      localStorage.getItem('lm_lunchie_journey') ?? localStorage.getItem('lm_today_journey'),
    );
    if (auth.isError || auth.data?.isAnonymous) {
      setJourneyStops(localStops);
      setJourneyLoading(false);
      return;
    }
    if (!auth.data) return;
    fetch('/api/journey?days=90', { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : { stops: [] })
      .then((data: { stops?: FoodJourneyStop[] }) => {
        if (!active) return;
        setJourneyStops(data.stops?.length ? mergeFoodJourneyStops(data.stops, localStops) : localStops);
        setJourneyLoading(false);
      })
      .catch(() => { if (active) { setJourneyStops(localStops); setJourneyLoading(false); } });
    return () => { active = false; };
  }, [auth.data?.isAnonymous, auth.isError]);

  const journeyDays = useMemo(() => groupJourneyByDay(journeyStops), [journeyStops]);
  const closestSavedPick = (stop: FoodJourneyStop) => savedLunchPicks
    .filter(pick => pick.restaurant.id === stop.restaurant_id)
    .sort((a, b) => Math.abs(a.savedAt - stop.at) - Math.abs(b.savedAt - stop.at))[0];
  const rateJourneyStop = async (stop: FoodJourneyStop, rating: number) => {
    const key = `${stop.restaurant_id}:${stop.at}`;
    if (savingRatingKey === key) return;
    setSavingRatingKey(key);
    try {
      const sessionId = stop.session_id ?? closestSavedPick(stop)?.session?.id ?? null;
      if (auth.data && !auth.data.isAnonymous && sessionId) {
        const response = await fetch('/api/journey-rating', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, rating }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(payload.error ?? "Couldn't save your rating.");
        }
      }

      setJourneyStops(current => updateFoodJourneyRating(current, stop, rating));
      const stored = readFoodJourneyStops(
        localStorage.getItem('lm_lunchie_journey') ?? localStorage.getItem('lm_today_journey'),
      );
      const updated = updateFoodJourneyRating(stored, stop, rating);
      localStorage.setItem('lm_lunchie_journey', JSON.stringify(updated));
      localStorage.setItem('lm_today_journey', JSON.stringify(
        updated.filter(item => new Date(item.at).toDateString() === new Date().toDateString()),
      ));
      toast.success(stop.meal_rating ? 'Meal rating updated!' : 'Meal rating saved!');
    } catch (error) {
      console.error('Food Journey rating failed', error);
      toast.error(error instanceof Error ? error.message : "Couldn't save your rating.");
    } finally {
      setSavingRatingKey(null);
    }
  };
  return (
    <div className="saved-page min-h-dvh bg-[#FCFCFC] pb-24">
      {/* Header */}
      <div className="border-b border-[#E8E6E7] bg-[#F5F4F5] px-5 pt-12 pb-4">
        <h1 className="text-[22px] font-semibold text-[#1A1A1A]">Food Journey</h1>
        <p className="mt-1 text-[12px] font-medium text-[#858185]">Your Lunchie decisions and after-meal memories.</p>
      </div>

      {/* ── Food Journey ─────────────────────────────────────────────────── */}
      <div className="space-y-5 px-5 py-5">
          {journeyDays.map(day => (
            <section key={day.key}>
              <p className="mb-2 text-[12px] font-black text-[#B26A62]">{englishText(day.label)} · {day.stops.length} decisions</p>
              <div className="space-y-3">
                {day.stops.map((stop, index) => {
                  const savedPick = closestSavedPick(stop);
                  const image = stop.photo ?? savedPick?.restaurant.image ?? savedPick?.restaurant.photos?.[0];
                  const rating = stop.meal_rating ?? 0;
                  const ratingKey = `${stop.restaurant_id}:${stop.at}`;
                  const time = new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit' }).format(new Date(stop.at));
                  return (
                    <article key={ratingKey} className="overflow-hidden rounded-2xl border border-[#E8E6E7] bg-white shadow-[0_6px_18px_rgba(49,35,29,0.06)]">
                      <button
                        type="button"
                        onClick={() => navigate(savedPick
                          ? `/lunchie/results/${encodeURIComponent(stop.restaurant_id)}`
                          : `/lunchie/map?id=${stop.restaurant_id}`)}
                        className="flex w-full gap-3 p-3 text-left active:bg-[#F9F7F6]"
                        aria-label={`${stop.name} decision details`}
                      >
                        <FoodImage
                          src={image}
                          name={stop.name}
                          category={stop.category ?? undefined}
                          className="h-[78px] w-[88px] shrink-0 rounded-xl object-cover"
                          emojiClass="text-[34px]"
                        />
                        <span className="min-w-0 flex-1 py-1">
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.5px] text-[#AA1A0D]"><Utensils size={11} /> Lunchie Decision #{day.stops.length - index}</span>
                          <span className="mt-1 block truncate text-[15px] font-bold text-[#1A1A1A]">{englishText(stop.name)}</span>
                          <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#858185]"><MapPin size={11} />{englishText(stop.category ?? 'Food Spots')} · {time}</span>
                        </span>
                      </button>

                      <div className="border-t border-[#F0E8E0] bg-[#FFFDFC] px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-bold text-[#3A302C]">{rating ? 'Your meal rating' : 'How was it after your visit?'}</p>
                            <p className="mt-0.5 text-[10px] font-medium text-[#9A8B84]">{rating ? 'Tap a star to update it' : 'Add a rating when you have been there'}</p>
                          </div>
                          <div className="flex items-center" role="group" aria-label={`${stop.name} meal rating`}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                type="button"
                                key={star}
                                disabled={savingRatingKey === ratingKey}
                                onClick={() => void rateJourneyStop(stop, star)}
                                aria-label={`Rate ${stop.name} ${star} stars`}
                                aria-pressed={rating === star}
                                className="flex size-8 items-center justify-center rounded-full transition-transform active:scale-90 disabled:opacity-50"
                              >
                                <Star size={21} fill={star <= rating ? '#AA1A0D' : 'transparent'} color={star <= rating ? '#AA1A0D' : '#C9C3C0'} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {!journeyLoading && journeyStops.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <div className="text-5xl mb-3">⚡</div>
              <p className="font-bold text-[16px] text-[#1A1A1A] mb-1">Your Food Journey Starts Here</p>
              <p className="text-[13px] text-[#9B9B9B] mb-6">
                Every final Quick Match decision will appear here automatically.
              </p>
              <button onClick={() => navigate('/lunchie/settings')} className="lm-btn-primary px-6 inline-flex items-center justify-center">

                Start Quick Match
              </button>
            </motion.div>
          )}
      </div>

    </div>
  );
}
