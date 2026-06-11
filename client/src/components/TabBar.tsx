import { motion } from "framer-motion";
import { ContactRound, Heart, Home, MapPinned, User } from "lucide-react";
import { useLocation } from "wouter";

const TABS = [
  { path: "/", label: "홈", icon: "home" },
  { path: "/explore", label: "코스", icon: "map" },
  { path: "/quick-match", label: "런치", icon: "cards" },
  { path: "/saved", label: "저장", icon: "contacts" },
  { path: "/profile", label: "프로필", icon: "profile" },
];

function CardStackIcon() {
  return (
    <div className="relative h-[30px] w-[32px]">
      <div className="absolute left-[12px] top-[1px] h-[26px] w-[19px] rotate-[14deg] rounded-[5px] border-[3px] border-white" />
      <div className="absolute left-[2px] top-[6px] flex h-[24px] w-[20px] items-center justify-center rounded-[5px] border-[3px] border-white bg-[#f43d40]">
        <Heart size={12} color="white" fill="white" strokeWidth={2.4} />
      </div>
    </div>
  );
}

function TabIcon({ type }: { type: string }) {
  if (type === "cards") return <CardStackIcon />;

  const shared = { size: 29, strokeWidth: 2.45, color: "white" };

  if (type === "map") return <MapPinned {...shared} />;
  if (type === "contacts") return <ContactRound {...shared} />;
  if (type === "profile") return <User {...shared} />;
  return <Home {...shared} />;
}

export default function TabBar() {
  const [, navigate] = useLocation();

  return (
    <div className="tab-bar">
      <div className="flex h-[68px] items-center justify-around px-[42px]">
        {TABS.map((tab) => {
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              className="flex h-10 w-10 items-center justify-center transition-all active:scale-95"
            >
              <motion.div
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <TabIcon type={tab.icon} />
              </motion.div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
