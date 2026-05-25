/**
 * Lunchie Munchie — Tab Bar
 * Design: Soft Coral (Option 8)
 * 4 tabs: 홈 · 코스 · 저장 · 내 정보
 */

import { motion } from 'framer-motion';
import { Home, Map, Bookmark, User } from 'lucide-react';
import { useLocation } from 'wouter';

const TABS = [
  { path: '/', icon: Home, label: '홈' },
  { path: '/explore', icon: Map, label: '코스' },
  { path: '/saved', icon: Bookmark, label: '저장' },
  { path: '/profile', icon: User, label: '내 정보' },
];

export default function TabBar() {
  const [location, navigate] = useLocation();

  return (
    <div className="tab-bar">
      <div className="flex items-center justify-around h-16">
        {TABS.map((tab) => {
          const isActive = location === tab.path || (tab.path !== '/' && location.startsWith(tab.path));
          const Icon = tab.icon;
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
                  style={{ color: isActive ? '#EB5053' : '#9B9B9B' }}
                  fill={isActive ? '#EB5053' : 'none'}
                />
              </motion.div>
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? '#EB5053' : '#9B9B9B' }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
