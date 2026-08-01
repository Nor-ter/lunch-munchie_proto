import { type ReactNode } from 'react';
import { type MunchieSkin } from '@/constants/skins';

/**
 * 스킨 프레임 — 콘텐츠를 스크랩북 패턴 테두리로 감싼다.
 * skin이 없으면 children을 그대로 반환해 기존 레이아웃을 해치지 않는다.
 */
export default function SkinFrame({
  skin,
  children,
  padding = 10,
  radius = 24,
  className = '',
  showStickers = true,
}: {
  skin?: MunchieSkin;
  children: ReactNode;
  padding?: number;
  radius?: number;
  className?: string;
  showStickers?: boolean;
}) {
  if (!skin) return <div className={className}>{children}</div>;

  return (
    <div
      className={`relative ${className}`}
      style={{
        background: skin.frame,
        padding,
        borderRadius: radius,
        boxShadow: skin.frameShadow
          ? `${skin.frameShadow}, 0 4px 14px rgba(0,0,0,0.08)`
          : '0 4px 14px rgba(0,0,0,0.08)',
      }}
    >
      {showStickers && (
        <>
          <span
            className="absolute z-10 select-none pointer-events-none"
            style={{ top: -7, left: 14, fontSize: 18, transform: 'rotate(-14deg)' }}
          >
            {skin.stickers[0]}
          </span>
          <span
            className="absolute z-10 select-none pointer-events-none"
            style={{ bottom: -6, right: 16, fontSize: 16, transform: 'rotate(10deg)' }}
          >
            {skin.stickers[1]}
          </span>
        </>
      )}
      <div
        className="overflow-hidden"
        style={{ background: skin.paper, borderRadius: Math.max(radius - 8, 8) }}
      >
        {children}
      </div>
    </div>
  );
}
