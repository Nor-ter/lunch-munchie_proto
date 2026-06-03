import { motion } from 'framer-motion';
import { Home, Compass, BookmarkCheck, Zap, User } from 'lucide-react';
import { useLocation } from 'wouter';

const TABS = [
  { path: '/', icon: Home, label: '홈' },
  { path: '/explore', icon: Compass, label: '코스' },
  { path: '/quick-match', icon: Zap, label: '런치', special: true },
  { path: '/saved', icon: BookmarkCheck, label: '저장' },
  { path: '/profile', icon: User, label: '프로필' },
];

export default function TabBar() {
  const [location, navigate] = useLocation();

  return (
    <div className="tab-bar">
      <div className="flex items-center justify-around h-16">
        {TABS.map((tab) => {
          const isActive = location === tab.path || (tab.path !== '/' && location.startsWith(tab.path));
          const Icon = tab.icon;

          if (tab.special) {
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center gap-0.5 flex-1 py-2 transition-all active:scale-90"
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: isActive ? 'white' : 'rgba(255,255,255,0.25)' }}
                >
                  <Icon
                    size={20}
                    strokeWidth={2.5}
                    style={{ color: isActive ? '#EB5053' : 'white' }}
                  />
                </motion.div>
                <span className="text-[9px] font-bold" style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.7)' }}>
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-0.5 flex-1 py-2 transition-all active:scale-95"
            >
              <motion.div
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.55)' }}
                  fill={isActive ? 'white' : 'none'}
                />
              </motion.div>
              <span className="text-[10px] font-semibold" style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.55)' }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
