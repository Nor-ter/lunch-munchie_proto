import { motion } from 'framer-motion';
import { Home, MapPin, BookOpen, User } from 'lucide-react';
import { useLocation } from 'wouter';

function OverlappingHeartsIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8.5 5.5C6.5 5.5 5 7.2 5 9.2c0 2.8 3.5 5.3 6 7.3 2.5-2 6-4.5 6-7.3 0-2-1.5-3.7-3.5-3.7-1.1 0-2.1.6-2.5 1.5-.4-.9-1.4-1.5-2.5-1.5z"
        stroke="white"
        strokeWidth={active ? 2 : 1.8}
        fill="none"
        opacity={active ? 1 : 0.55}
        transform="translate(-2, 1)"
      />
      <path
        d="M13.5 4.5C11.8 4.5 10.5 5.9 10.5 7.5c0 2.2 2.8 4.2 4.8 5.8 2-1.6 4.8-3.6 4.8-5.8 0-1.6-1.3-3-3-3-.9 0-1.7.5-2 .9-.3-.4-1.1-.9-2-.9z"
        stroke="white"
        strokeWidth={active ? 2 : 1.8}
        fill="none"
        opacity={active ? 1 : 0.55}
        transform="translate(2, -1)"
      />
    </svg>
  );
}

const TABS = [
  { path: '/', icon: Home, label: '홈' },
  { path: '/explore', icon: MapPin, label: '코스' },
  { path: '/quick-match', customIcon: true, label: '런치' },
  { path: '/saved', icon: BookOpen, label: '저장' },
  { path: '/profile', icon: User, label: '프로필' },
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
                {'customIcon' in tab && tab.customIcon ? (
                  <OverlappingHeartsIcon active={isActive} />
                ) : (
                  <tab.icon
                    size={24}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    color="white"
                    fill="none"
                    style={{ opacity: isActive ? 1 : 0.55 }}
                  />
                )}
              </motion.div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
