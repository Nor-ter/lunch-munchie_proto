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
      ? '현재 위치에서 이 장소까지 연결합니다. 실제 이동 시간은 Google 지도에서 확인하세요.'
      : `저장된 ${stopCount}곳 순서대로 경로를 엽니다. 실제 이동 시간은 Google 지도에서 확인하세요.`
    : '코스의 모든 장소에 주소 또는 좌표가 있어야 순서를 보존한 길찾기를 열 수 있어요.';

  return (
    <section data-ui="course-directions-action" className="mx-4 mb-4 rounded-2xl border border-[#F0D4C9] bg-[#FFF7F3] p-3">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          aria-label="Google 지도에서 길찾기"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#E85053] text-[14px] font-black text-white shadow-[0_7px_16px_rgba(232,80,83,0.2)] active:scale-[0.99]"
        >
          <Navigation size={18} aria-hidden="true" />
          Google 지도에서 길찾기
        </a>
      ) : (
        <button
          type="button"
          disabled
          aria-label="길찾기 정보 없음"
          className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#E5DDD8] text-[14px] font-black text-[#9B8980]"
        >
          <Navigation size={18} aria-hidden="true" />
          길찾기 정보 없음
        </button>
      )}
      <p className="mt-2 text-center text-[10px] font-semibold leading-4 text-[#947F75]">
        {explanation}
      </p>
    </section>
  );
}
