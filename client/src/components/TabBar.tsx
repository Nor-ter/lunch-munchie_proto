import { motion } from "framer-motion";
import { useLocation } from "wouter";

// ─── Nav icons (sj_branch design) ────────────────────────────────────────────

function iconProps(active: boolean) {
  return {
    className: "h-[34px] w-[34px]",
    fill: "none",
    stroke: "white",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { opacity: active ? 1 : 0.55 },
  };
}

function MunchIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)} viewBox="0 0 40 40" aria-hidden="true">
      <rect
        x="7"
        y="5.5"
        width="26"
        height="29"
        rx="4"
        strokeWidth="2.2"
        fill={active ? "white" : "none"}
      />
      <path
        d="M8.2 15.2 H31.8 M8.2 24.4 H31.8"
        stroke={active ? "#FF424B" : "white"}
        strokeWidth="2.2"
      />
      <path
        d="M12 10.4 H28"
        stroke={active ? "#FF424B" : "white"}
        strokeWidth="2.2"
      />
      <rect
        x="11.8"
        y="27.7"
        width="16.4"
        height="2.7"
        rx="1.35"
        fill={active ? "#FF424B" : "white"}
        stroke="none"
      />
    </svg>
  );
}

function BookmarkIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)} viewBox="0 0 40 40">
      <path
        d="M12 6.5 H28 C30 6.5 31.3 7.9 31.3 9.8 V33.5 L20 26.8 L8.7 33.5 V9.8 C8.7 7.9 10 6.5 12 6.5 Z"
        strokeWidth="3"
        fill={active ? "white" : "none"}
      />
    </svg>
  );
}

function LightningIcon({ active }: { active: boolean }) {
  return (
    <svg
      className="h-[46px] w-[46px]"
      fill="none"
      stroke="white"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 40 40"
      style={{ opacity: active ? 1 : 0.7 }}
    >
      <path
        d="M22 5 L9 22 H19.5 L16 35 L31 18 H20.5 Z"
        strokeWidth="2.8"
        fill={active ? "white" : "none"}
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
      style={{ opacity: active ? 1 : 0.62 }}
    />
  );
}

const TABS = [
  { path: "/lunchie/settings", label: "Quick Match", Icon: LightningIcon },
  { path: "/feed", label: "피드", Icon: MunchIcon },
  { path: "/saved", label: "저장", Icon: BookmarkIcon },
  { path: "/profile", label: "프로필", Icon: FaceIcon },
] as const;

export default function TabBar() {
  const [location, navigate] = useLocation();
  const isFlat = location === "/" ||
    location === "/feed" ||
    location === "/saved" ||
    location === "/profile" ||
    location === "/lunchie/settings" ||
    location === "/session/lobby";

  return (
    <div className={`tab-bar ${isFlat ? "tab-bar--flat" : ""}`}>
      <div className="tab-bar-content grid grid-cols-4 items-center px-[22px]">
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
              aria-label={tab.label}
              className={`flex items-center justify-center justify-self-center transition-all active:scale-95 ${isProfile ? "h-[51px] w-[51px]" : "h-12 w-12"}`}
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
