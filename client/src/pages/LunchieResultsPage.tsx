import { useLocation, useParams } from 'wouter';
import { useApp } from '@/contexts/AppContext';
import { WinnerScreen } from './LunchieSwipePage';
import BackButton from '@/components/ui/BackButton';

export default function LunchieResultsPage() {
  const { restaurantId } = useParams<{ restaurantId?: string }>();
  const [, navigate] = useLocation();
  const { savedLunchPicks } = useApp();
  const pick = savedLunchPicks.find(item => item.restaurant.id === restaurantId);

  if (restaurantId && !pick) {
    return (
      <div className="min-h-dvh bg-[#FCFCFC] px-5 py-6">
        <BackButton onClick={() => navigate('/saved')} aria-label="Back to Saved" />
        <p className="mt-8 text-center text-[14px] text-[var(--lm-sub)]">Saved Lunchie pick not found.</p>
      </div>
    );
  }

  return (
    <WinnerScreen
      selectedWinner={pick?.restaurant}
      resultSession={pick ? pick.session : undefined}
      savedResult={Boolean(pick)}
      onReset={() => navigate('/lunchie/settings')}
    />
  );
}
