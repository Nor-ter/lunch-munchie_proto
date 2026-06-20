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

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)} viewBox="0 0 40 40">
      <path d="M5 12.5 L14 8.5 L25 12.5 L35 8.5 V29 L25 33 L14 29 L5 33 Z" strokeWidth="2.7" />
      <path d="M14 8.5 V29" strokeWidth="2.4" />
      <path d="M25 12.5 V33" strokeWidth="2.4" />
      <path
        d="M20 4.7 C15.9 4.7 12.7 7.8 12.7 11.7 C12.7 16.7 20 23 20 23 C20 23 27.3 16.7 27.3 11.7 C27.3 7.8 24.1 4.7 20 4.7 Z"
        strokeWidth="2.7"
      />
      <circle cx="20" cy="11.8" r="2.4" fill="white" strokeWidth="0" />
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

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)} viewBox="0 0 40 40">
      <path d="M6.2 19.5 L20 7 L33.8 19.5" strokeWidth="2.8" />
      <path d="M10 18.5 V32.5 H30 V18.5" strokeWidth="2.8" />
      <path
        d="M16.3 32.5 V24.5 C16.3 22.2 17.8 20.8 20 20.8 C22.2 20.8 23.7 22.2 23.7 24.5 V32.5"
        strokeWidth="2.8"
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
      className="h-[38px] w-[38px] object-contain"
      style={{ opacity: active ? 1 : 0.62 }}
    />
  );
}

const TABS = [
  { path: "/", label: "홈", Icon: HomeIcon },
  { path: "/explore", label: "지도", Icon: MapIcon },
  { path: "/lunchie/settings", label: "런치", Icon: LightningIcon },
  { path: "/saved", label: "저장", Icon: BookmarkIcon },
  { path: "/profile", label: "프로필", Icon: FaceIcon },
] as const;

export default function TabBar() {
  const [location, navigate] = useLocation();

  return (
    <div className="tab-bar">
      <div className="flex h-[68px] items-center justify-around px-[34px]">
        {TABS.map((tab) => {
          const isActive =
            location === tab.path || (tab.path !== "/" && location.startsWith(tab.path));

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              className="flex h-12 w-12 items-center justify-center transition-all active:scale-95"
            >
              <motion.div
                animate={isActive ? { scale: 1.06 } : { scale: 1 }}
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
