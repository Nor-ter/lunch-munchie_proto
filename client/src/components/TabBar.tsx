import { motion } from 'framer-motion';
import { useLocation } from 'wouter';

// ─── Custom nav icons (matching design reference) ────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 L12 4 L20 10.5 V18.5 C20 19.05 19.55 19.5 19 19.5 H5 C4.45 19.5 4 19.05 4 18.5 Z"
        stroke="white"
        strokeWidth={active ? 2 : 1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
        opacity={active ? 1 : 0.55}
      />
      <path
        d="M9.5 19.5 V14.5 C9.5 13.95 9.95 13.5 10.5 13.5 H13.5 C14.05 13.5 14.5 13.95 14.5 14.5 V19.5"
        stroke="white"
        strokeWidth={active ? 2 : 1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
        opacity={active ? 1 : 0.55}
      />
    </svg>
  );
}

function LocationIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21 C12 21 18 15.2 18 10.2 C18 6.77 15.31 4 12 4 C8.69 4 6 6.77 6 10.2 C6 15.2 12 21 12 21 Z"
        stroke="white"
        strokeWidth={active ? 2 : 1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
        opacity={active ? 1 : 0.55}
      />
      <circle
        cx="12"
        cy="10"
        r="2.5"
        stroke="white"
        strokeWidth={active ? 2 : 1.8}
        fill="none"
        opacity={active ? 1 : 0.55}
      />
    </svg>
  );
}

function CardsIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="9"
        y="4.5"
        width="11"
        height="13.5"
        rx="2.4"
        transform="rotate(12 14.5 11.25)"
        stroke="white"
        strokeWidth={active ? 2 : 1.8}
        fill="none"
        opacity={active ? 0.7 : 0.4}
      />
      <rect
        x="4"
        y="5.5"
        width="11"
        height="13.5"
        rx="2.4"
        stroke="white"
        strokeWidth={active ? 2 : 1.8}
        fill="none"
        opacity={active ? 1 : 0.55}
      />
      <path
        d="M9.5 15.4 C8 14.1 6.8 13.05 6.8 11.7 C6.8 10.76 7.52 10.1 8.35 10.1 C8.83 10.1 9.29 10.33 9.5 10.7 C9.71 10.33 10.17 10.1 10.65 10.1 C11.48 10.1 12.2 10.76 12.2 11.7 C12.2 13.05 11 14.1 9.5 15.4 Z"
        fill="white"
        opacity={active ? 1 : 0.55}
      />
    </svg>
  );
}

function AddressBookIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="6"
        y="4"
        width="13"
        height="16"
        rx="2.6"
        stroke="white"
        strokeWidth={active ? 2 : 1.8}
        fill="none"
        opacity={active ? 1 : 0.55}
      />
      {[6.5, 9, 11.5, 14, 16.5].map((y) => (
        <path
          key={y}
          d={`M6 ${y} H7.6`}
          stroke="white"
          strokeWidth={active ? 2 : 1.8}
          strokeLinecap="round"
          opacity={active ? 1 : 0.55}
        />
      ))}
      <circle
        cx="12.5"
        cy="9.6"
        r="1.7"
        stroke="white"
        strokeWidth={active ? 2 : 1.8}
        fill="none"
        opacity={active ? 1 : 0.55}
      />
      <path
        d="M9.3 16 C9.3 14.06 10.74 12.9 12.5 12.9 C14.26 12.9 15.7 14.06 15.7 16"
        stroke="white"
        strokeWidth={active ? 2 : 1.8}
        strokeLinecap="round"
        fill="none"
        opacity={active ? 1 : 0.55}
      />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="8"
        r="3.5"
        stroke="white"
        strokeWidth={active ? 2 : 1.8}
        fill="none"
        opacity={active ? 1 : 0.55}
      />
      <path
        d="M5.5 19.5 C5.5 16.18 8.41 13.5 12 13.5 C15.59 13.5 18.5 16.18 18.5 19.5"
        stroke="white"
        strokeWidth={active ? 2 : 1.8}
        strokeLinecap="round"
        fill="none"
        opacity={active ? 1 : 0.55}
      />
    </svg>
  );
}

const TABS = [
  { path: '/', Icon: HomeIcon, label: '홈' },
  { path: '/explore', Icon: LocationIcon, label: '코스' },
  { path: '/quick-match', Icon: CardsIcon, label: '런치' },
  { path: '/saved', Icon: AddressBookIcon, label: '저장' },
  { path: '/profile', Icon: ProfileIcon, label: '프로필' },
] as const;

export default function TabBar() {
  const [location, navigate] = useLocation();

  return (
    <div className="tab-bar">
      <div className="flex items-center justify-around h-[58px] px-2">
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
