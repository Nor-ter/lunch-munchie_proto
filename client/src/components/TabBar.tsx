import { useLocation } from "wouter";

import { cn } from "@/lib/utils";
import { isTabActive, TAB_ITEMS } from "./tabBarConfig";

export default function TabBar() {
  const [location, navigate] = useLocation();

  return (
    <nav
      className="tab-bar border-t border-[#F0E6DF] bg-white/95 shadow-[0_-4px_18px_rgba(70,45,32,0.08)] backdrop-blur"
      aria-label="주요 메뉴"
    >
      <ul className="mx-auto flex h-[68px] items-center justify-around px-4">
        {TAB_ITEMS.map((tab) => {
          const active = isTabActive(location, tab.path);

          return (
            <li key={tab.path} className="flex flex-1 justify-center">
              <button
                type="button"
                onClick={() => navigate(tab.path)}
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-h-12 min-w-12 items-center justify-center rounded-full text-[#8A8581] transition-[color,background-color,transform] duration-150",
                  "hover:bg-[#FFF4F1] hover:text-[#D94447] active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EB5053] focus-visible:ring-offset-2",
                  active && "text-[#EB5053]",
                  tab.emphasized && "-translate-y-1 bg-[#FFF0EE]",
                  tab.emphasized && active && "bg-[#FFE4E0] text-[#D94447]",
                )}
              >
                <tab.Icon
                  size={tab.emphasized ? 24 : 23}
                  strokeWidth={active ? 2.4 : 2.1}
                  aria-hidden="true"
                />
                <span className="sr-only">{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
