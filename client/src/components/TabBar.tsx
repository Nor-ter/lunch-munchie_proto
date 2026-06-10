import { motion } from 'framer-motion';
import { useLocation } from 'wouter';

// ─── Custom nav icons (matching design reference) ────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="32" height="32" viewBox="0 0 26 26" fill="none" aria-hidden>
      <path
        d="M13 4 L22 11.5 V20.5 C22 21.05 21.55 21.5 21 21.5 H5 C4.45 21.5 4 21.05 4 20.5 V11.5 Z"
        fill={active ? 'white' : 'none'}
        stroke="white"
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={active ? 1 : 0.55}
      />
    </svg>
  );
}

function CompassIcon({ active }: { active: boolean }) {
  return (
    <svg width="32" height="32" viewBox="0 0 26 26" fill="none" aria-hidden>
      <circle
        cx="13"
        cy="13"
        r="8.5"
        stroke="white"
        strokeWidth={1.8}
        fill="none"
        opacity={active ? 1 : 0.55}
      />
      <path
        d="M16.5 9.5 L14.2 14.2 L9.5 16.5 L11.8 11.8 Z"
        stroke="white"
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill={active ? 'white' : 'none'}
        opacity={active ? 1 : 0.55}
      />
    </svg>
  );
}

function LightningIcon({ active }: { active: boolean }) {
  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{
        width: 56,
        height: 56,
        background: active ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.16)',
        boxShadow: active ? '0 4px 14px rgba(0,0,0,0.12)' : 'none',
      }}
    >
      <svg width="32" height="32" viewBox="0 0 26 26" fill="none" aria-hidden>
        <path
          d="M14.5 4 L7 14.5 H12 L11 22 L19 11 H14 Z"
          stroke="white"
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill={active ? 'white' : 'none'}
          opacity={active ? 1 : 0.7}
        />
      </svg>
    </div>
  );
}

function BookmarkIcon({ active }: { active: boolean }) {
  return (
    <svg width="32" height="32" viewBox="0 0 26 26" fill="none" aria-hidden>
      <path
        d="M7.5 4.5 H18.5 C19.05 4.5 19.5 4.95 19.5 5.5 V21.5 L13 17.5 L6.5 21.5 V5.5 C6.5 4.95 6.95 4.5 7.5 4.5 Z"
        fill={active ? 'white' : 'none'}
        stroke="white"
        strokeWidth={1.8}
        strokeLinejoin="round"
        opacity={active ? 1 : 0.55}
      />
      <path
        d="M10 12.3 L12 14.3 L16 9.8"
        stroke={active ? '#EB5053' : 'white'}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={active ? 1 : 0.55}
      />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="32" height="32" viewBox="0 0 26 26" fill="none" aria-hidden>
      <circle
        cx="13"
        cy="9"
        r="3.4"
        stroke="white"
        strokeWidth={1.8}
        fill={active ? 'white' : 'none'}
        opacity={active ? 1 : 0.55}
      />
      <path
        d="M6.5 21 C6.5 17.27 9.41 14.5 13 14.5 C16.59 14.5 19.5 17.27 19.5 21"
        stroke="white"
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
        opacity={active ? 1 : 0.55}
      />
    </svg>
  );
}

const TABS = [
  { path: '/', Icon: HomeIcon, label: '홈' },
  { path: '/explore', Icon: CompassIcon, label: '코스' },
  { path: '/quick-match', Icon: LightningIcon, label: '런치' },
  { path: '/saved', Icon: BookmarkIcon, label: '저장' },
  { path: '/profile', Icon: ProfileIcon, label: '프로필' },
] as const;

export default function TabBar() {
  const [location, navigate] = useLocation();

  return (
    <div className="tab-bar">
      <div className="flex items-center justify-around h-[60px] px-2">
        {TABS.map((tab) => {
          const isActive =
            location === tab.path || (tab.path !== '/' && location.startsWith(tab.path));

          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              className="flex items-center justify-center flex-1 h-full transition-all active:opacity-70"
              aria-label={tab.label}
            >
              <motion.div
                animate={isActive ? { scale: 1.06 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <tab.Icon active={isActive} />
              </motion.div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
