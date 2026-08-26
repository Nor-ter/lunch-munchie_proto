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

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)} viewBox="0 0 40 40">
      <path d="M8 19 L20 8 L32 19" strokeWidth="2.5" />
      <path d="M11 18.5 V31.5 H29 V18.5" strokeWidth="2.5" />
      <path
        d="M16.5 31.5 V24.5 C16.5 22.3 18 21 20 21 C22 21 23.5 22.3 23.5 24.5 V31.5"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function LightningIcon({ active }: { active: boolean }) {
  return (
    <svg
      className="h-[43px] w-[43px]"
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
      style={{ opacity: active ? 1 : 0.85 }}
    />
  );
}

const TABS = [
  { path: "/", label: "홈", Icon: HomeIcon },
  { path: "/feed", label: "먼치", Icon: MunchIcon },
  { path: "/lunchie/settings", label: "런치", Icon: LightningIcon },
  { path: "/saved", label: "저장", Icon: BookmarkIcon },
  { path: "/profile", label: "프로필", Icon: FaceIcon },
] as const;

export default function TabBar() {
  const [location, navigate] = useLocation();

  return (
    <div className="tab-bar">
      <div className="tab-bar-content grid grid-cols-5 items-center px-[18px]">
        {TABS.map((tab) => {
          const isActive =
            location === tab.path ||
            (tab.path !== "/" && location.startsWith(tab.path)) ||
            (tab.path === "/lunchie/settings" && location === "/session/lobby");
          const isProfile = tab.path === "/profile";

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              className={`flex items-center justify-center justify-self-center transition-all active:scale-95 ${isProfile ? "h-14 w-14" : "h-[52px] w-[52px]"}`}
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
