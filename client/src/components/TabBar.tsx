import { motion } from "framer-motion";
import { useLocation } from "wouter";

const TABS = [
  { path: "/", label: "홈", icon: "home" },
  { path: "/explore", label: "지도", icon: "map" },
  { path: "/quick-match", label: "런치", icon: "lightning" },
  { path: "/saved", label: "저장", icon: "bookmark" },
  { path: "/profile", label: "프로필", icon: "face" },
];

const iconProps = {
  className: "h-[34px] w-[34px]",
  fill: "none",
  stroke: "white",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function MapIcon() {
  return (
    <svg {...iconProps} viewBox="0 0 40 40">
      <path
        d="M5 12.5 L14 8.5 L25 12.5 L35 8.5 V29 L25 33 L14 29 L5 33 Z"
        strokeWidth="2.7"
      />
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

function BookmarkIcon() {
  return (
    <svg {...iconProps} viewBox="0 0 40 40">
      <path
        d="M12 6.5 H28 C30 6.5 31.3 7.9 31.3 9.8 V33.5 L20 26.8 L8.7 33.5 V9.8 C8.7 7.9 10 6.5 12 6.5 Z"
        strokeWidth="3"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg {...iconProps} viewBox="0 0 40 40">
      <path d="M6.2 19.5 L20 7 L33.8 19.5" strokeWidth="2.8" />
      <path d="M10 18.5 V32.5 H30 V18.5" strokeWidth="2.8" />
      <path
        d="M16.3 32.5 V24.5 C16.3 22.2 17.8 20.8 20 20.8 C22.2 20.8 23.7 22.2 23.7 24.5 V32.5"
        strokeWidth="2.8"
      />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg
      className="h-[48px] w-[48px]"
      fill="none"
      stroke="white"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 52 52"
    >
      <circle cx="26" cy="26" r="22" strokeWidth="3.2" />
      <path
        d="M24.8 10.8 L12.7 27.2 H24.1 L20.2 41.3 L37.2 21.9 H25.6 Z"
        strokeWidth="3.4"
      />
      <path d="M35.4 19.5 H43" strokeWidth="3" />
      <path d="M34 26.6 H42.2" strokeWidth="3" />
      <path d="M31.8 33.3 H38" strokeWidth="3" />
    </svg>
  );
}

function FaceIcon() {
  return (
    <svg {...iconProps} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="15" strokeWidth="2.7" />
      <circle cx="14.5" cy="20" r="1.7" fill="white" strokeWidth="0" />
      <circle cx="25.5" cy="20" r="1.7" fill="white" strokeWidth="0" />
      <path d="M15.8 25.4 C18.3 27.6 21.7 27.6 24.2 25.4" strokeWidth="2.5" />
      <path d="M10.8 24.5 H10.9" strokeWidth="3.3" />
      <path d="M29.1 24.5 H29.2" strokeWidth="3.3" />
    </svg>
  );
}

function TabIcon({ type }: { type: string }) {
  if (type === "map") return <MapIcon />;
  if (type === "bookmark") return <BookmarkIcon />;
  if (type === "lightning") return <LightningIcon />;
  if (type === "face") return <FaceIcon />;
  return <HomeIcon />;
}

export default function TabBar() {
  const [, navigate] = useLocation();

  return (
    <div className="tab-bar">
      <div className="flex h-[68px] items-center justify-around px-[34px]">
        {TABS.map((tab) => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            aria-label={tab.label}
            className="flex h-12 w-12 items-center justify-center transition-all active:scale-95"
          >
            <motion.div
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <TabIcon type={tab.icon} />
            </motion.div>
          </button>
        ))}
      </div>
    </div>
  );
}
