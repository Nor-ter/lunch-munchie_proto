import { englishText } from '@shared/englishCopy';
import { motion } from "framer-motion";
import { useLocation } from "wouter";

const ACTIVE_STROKE = "#FFFFFF";
const INACTIVE_STROKE = "#777477";

function iconProps(active: boolean) {
  return {
    className: "h-[27px] w-[27px]",
    fill: "none",
    stroke: active ? ACTIVE_STROKE : INACTIVE_STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { opacity: 1 },
  };
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

function LightningIcon({ active }: { active: boolean }) {
  return (
    <svg
      className="h-[30px] w-[30px]"
      fill="none"
      stroke={active ? ACTIVE_STROKE : INACTIVE_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 40 40"
    >
      <path
        d="M22 4.5 L10 22 H19 L16 35.5 L31 17.5 H21.5 Z"
        strokeWidth="2.4"
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
      className="tab-profile-icon object-contain"
      style={{ opacity: active ? 1 : 0.48, filter: active ? 'none' : 'grayscale(1)' }}
    />
  );
}

const TABS = [
  { path: "/saved", label: "Save", Icon: BookmarkIcon },
  { path: "/lunchie/settings", label: "Quick Match", Icon: LightningIcon },
  { path: "/profile", label: "Profile", Icon: FaceIcon },
] as const;

export default function TabBar() {
  const [location, navigate] = useLocation();

  return (
    <div className="tab-bar">
      <div className="tab-bar-content grid grid-cols-3 items-center px-5">
        {TABS.map((tab) => {
          const isActive =
            location === tab.path ||
            location.startsWith(`${tab.path}/`) ||
            (tab.path === "/lunchie/settings" && location === "/session/lobby");
          const isProfile = tab.path === "/profile";

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-label={englishText(tab.label)}
              className={`relative flex h-12 w-12 items-center justify-center justify-self-center transition-all active:scale-95 ${isActive ? 'after:absolute after:bottom-0 after:h-0.5 after:w-4 after:rounded-full after:bg-white' : ''}`}
            >
              <motion.div
                animate={isActive && !isProfile ? { scale: 1.06 } : { scale: 1 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
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
