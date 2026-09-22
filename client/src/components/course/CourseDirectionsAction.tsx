import React from 'react';
import { Navigation } from 'lucide-react';

interface CourseDirectionsActionProps {
  href: string | null;
  stopCount: number;
  onNavigate?: () => void;
}

export default function CourseDirectionsAction({
  href,
  stopCount,
  onNavigate,
}: CourseDirectionsActionProps) {
  const explanation = href
    ? stopCount === 1
      ? "Get directions from your location. Check travel times in Google Maps."
      : `Follow all ${stopCount} places in order. Check travel times in Google Maps.`
    : "Some places are missing location details, so directions aren't available.";

  return (
    <section data-ui="course-directions-action" className="mx-4 mb-4 rounded-2xl border border-[#F0D4C9] bg-[#FFF7F3] p-3">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          aria-label="Open in Google Maps"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#E85053] text-[14px] font-black text-white shadow-[0_7px_16px_rgba(232,80,83,0.2)] active:scale-[0.99]"
        >
          <Navigation size={18} aria-hidden="true" />

          Open in Google Maps
        </a>
      ) : (
        <button
          type="button"
          disabled
          aria-label="Directions unavailable"
          className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#E5DDD8] text-[14px] font-black text-[#9B8980]"
        >
          <Navigation size={18} aria-hidden="true" />

          Directions unavailable
        </button>
      )}
      <p className="mt-2 text-center text-[10px] font-semibold leading-4 text-[#947F75]">
        {explanation}
      </p>
    </section>
  );
}
