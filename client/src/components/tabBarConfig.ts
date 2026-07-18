import {
  Bookmark,
  House,
  Map,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type TabPath =
  | "/"
  | "/feed"
  | "/lunchie/settings"
  | "/saved"
  | "/profile";

export type TabItem = {
  path: TabPath;
  label: string;
  Icon: LucideIcon;
  emphasized?: boolean;
};

export const TAB_ITEMS: readonly TabItem[] = [
  { path: "/", label: "홈", Icon: House },
  { path: "/feed", label: "먼치", Icon: Map },
  { path: "/lunchie/settings", label: "런치", Icon: Zap, emphasized: true },
  { path: "/saved", label: "저장", Icon: Bookmark },
  { path: "/profile", label: "프로필", Icon: UserRound },
] as const;

function pathnameOf(location: string): string {
  const pathname = location.split(/[?#]/, 1)[0] || "/";
  return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
}

export function isTabActive(location: string, tabPath: TabPath): boolean {
  const pathname = pathnameOf(location);
  const normalizedTabPath = pathnameOf(tabPath);

  if (normalizedTabPath === "/") return pathname === "/";
  return pathname === normalizedTabPath || pathname.startsWith(`${normalizedTabPath}/`);
}
