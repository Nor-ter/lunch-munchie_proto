import { motion } from "framer-motion";
import { useLocation } from "wouter";

const ACTIVE_STROKE = "#FFFFFF";
const INACTIVE_STROKE = "#FFD5DD";

function iconProps(active: boolean) {
  return {
    className: "h-[35px] w-[35px]",
    fill: "none",
    stroke: active ? ACTIVE_STROKE : INACTIVE_STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { opacity: 1 },
  };
}

function MunchIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)} viewBox="0 0 40 40" aria-hidden="true">
      <rect
        x="7.5"
        y="8"
        width="25"
        height="24"
        rx="4.2"
        strokeWidth="2.6"
      />
      <path
        d="M8.7 16 H31.3 M8.7 24 H31.3"
        stroke={active ? ACTIVE_STROKE : INACTIVE_STROKE}
        strokeWidth="2.6"
      />
    </svg>
  );
}

function BookmarkIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)} viewBox="0 0 40 40">
      <path
        d="M13 7.5 H27 C29.1 7.5 30.5 8.9 30.5 11 V32.5 L20 26 L9.5 32.5 V11 C9.5 8.9 10.9 7.5 13 7.5 Z"
        strokeWidth="2.7"
      />
    </svg>
  );
}

function FaceIcon({ active }: { active: boolean }) {
  return (
    <img
      src="/assets/Logo%20003%203.png"
      alt=""
      aria-hidden="true"
      className="tab-profile-icon h-[35px] w-[35px] object-contain"
      style={{ opacity: active ? 1 : 0.85 }}
    />
  );
}

const TABS = [
  { path: "/feed", label: "발견", Icon: MunchIcon },
  { path: "/saved", label: "저장", Icon: BookmarkIcon },
  { path: "/profile", label: "내 정보", Icon: FaceIcon },
] as const;

export default function TabBar() {
  const [location, navigate] = useLocation();

  return (
    <div className="tab-bar">
      <nav aria-label="주요 메뉴" className="tab-bar-content grid grid-cols-3 items-center px-[30px]">
        {TABS.map((tab) => {
          const isActive = location === tab.path || location.startsWith(tab.path);
          const isProfile = tab.path === "/profile";

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className="flex h-[68px] min-w-[62px] flex-col items-center justify-center gap-0.5 justify-self-center transition-all active:scale-95"
            >
              <motion.div
                className={isProfile ? 'flex h-9 w-9 items-center justify-center' : undefined}
                animate={isActive && !isProfile ? { scale: 1.06 } : { scale: 1 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <tab.Icon active={isActive} />
              </motion.div>
              <span className={`text-[10px] font-black leading-none ${isActive ? 'text-white' : 'text-[#FFD5DD]'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
