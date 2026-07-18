/**
 * Lunchie Munchie App — Design: Soft Coral (Option 8)
 */
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, useParams, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider } from "./contexts/AppContext";
import { supabase } from "./lib/supabase";
import AuthBootstrap from "./components/auth/AuthBootstrap";
import { MapProvider } from "./components/map/MapProvider";
import TabBar from "./components/TabBar";
import OnboardingPage from "./pages/OnboardingPage";
import HomePage from "./pages/HomePage";
import MunchieFeedPage from "./pages/MunchieFeedPage";
import FeedComposePage from "./pages/FeedComposePage";
import FeedDetailPage from "./pages/FeedDetailPage";
import FeedEditPage from "./pages/FeedEditPage";
import CourseNavigatePage from "./pages/CourseNavigatePage";
import NewCourseDetailPage from "./pages/course/CourseDetailPage";
import CourseEditPage from "./pages/course/CourseEditPage";
import CourseSharePage from "./pages/course/CourseSharePage";
import SavedPage from "./pages/SavedPage";
import ProfilePage from "./pages/ProfilePage";
import OtherProfilePage from "./pages/OtherProfilePage";
// Lunchie 그룹 세션 모드 (data-jp 플로우): 설정 → 로비/초대 → 스와이프 투표 → 결과
import LunchieSettingsPage from "./pages/LunchieSettingsPage";
import SessionLobbyPage from "./pages/SessionLobbyPage";
import SessionJoinPage from "./pages/SessionJoinPage";
import LunchieSwipePage from "./pages/LunchieSwipePage";
import LunchieResultsPage from "./pages/LunchieResultsPage";
import LunchieMapPage from "./pages/LunchieMapPage";
import TourMapPage from "./pages/TourMapPage";
import TourModePage from "./pages/TourModePage";
import SlideTransitionRoutes from "./components/SlideTransitionRoutes";
import MetricsPage from "./pages/MetricsPage";
import TemplateDetailPage from "./pages/TemplateDetailPage";
import TemplatesBrowsePage from "./pages/TemplatesBrowsePage";
import CourseFeedsPage from "./pages/course/CourseFeedsPage";
import PlaceExplorePage from "./pages/PlaceExplorePage";

const NO_TABBAR = ['/onboarding', '/tour-mode', '/course/', '/template/', '/templates', '/lunchie', '/session', '/join', '/feed/', '/explore/places'];

function CoursesRedirect() {
  const params = useParams<{ id: string }>();
  return <Redirect to={`/course/${params.id}`} />;
}

function AppShell() {
  const [location] = useLocation();
  const showTabBar = !NO_TABBAR.some(p => location.startsWith(p));
  return (
    <div className="app-shell">
      <div className={showTabBar ? "min-h-dvh pb-20" : "min-h-dvh"}>
        <SlideTransitionRoutes>
          <Switch>
            <Route path="/onboarding" component={OnboardingPage} />
            <Route path="/" component={HomePage} />
            {/* 기존 먼치모드(코스 탐색)는 Munchie Feed로 통합 */}
            <Route path="/explore">{() => <Redirect to="/feed" />}</Route>
            <Route path="/explore/places" component={PlaceExplorePage} />
            <Route path="/feed" component={MunchieFeedPage} />
            <Route path="/feed/new" component={FeedComposePage} />
            <Route path="/feed/:id/edit" component={FeedEditPage} />
            <Route path="/feed/:id" component={FeedDetailPage} />
            <Route path="/templates" component={TemplatesBrowsePage} />
            <Route path="/template/:templateId" component={TemplateDetailPage} />
            <Route path="/courses/:id/navigate" component={CourseNavigatePage} />
            <Route path="/courses/:id" component={CoursesRedirect} />
            <Route path="/course/:id/edit" component={CourseEditPage} />
            <Route path="/course/:id/share" component={CourseSharePage} />
            <Route path="/course/:id/feeds" component={CourseFeedsPage} />
            <Route path="/course/:id" component={NewCourseDetailPage} />
            <Route path="/saved" component={SavedPage} />
            <Route path="/profile" component={ProfilePage} />
            <Route path="/profile/:id" component={OtherProfilePage} />
            {/* Lunchie 그룹 세션 플로우 (data-jp) */}
            <Route path="/lunchie/settings" component={LunchieSettingsPage} />
            <Route path="/session/lobby" component={SessionLobbyPage} />
            <Route path="/join/:token" component={SessionJoinPage} />
            <Route path="/lunchie/swipe" component={LunchieSwipePage} />
            <Route path="/lunchie/results" component={LunchieResultsPage} />
            <Route path="/lunchie/map" component={LunchieMapPage} />
            <Route path="/metrics" component={MetricsPage} />
            <Route path="/tour-map" component={TourMapPage} />
            <Route path="/tour-mode" component={TourModePage} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </SlideTransitionRoutes>
      </div>
      {showTabBar && <TabBar />}
    </div>
  );
}

const queryClient = new QueryClient();

// 로그인/로그아웃/프로필갱신은 auth.uid()·is_anonymous가 바뀌는 "신원 전환" 이벤트 —
// 유저별 캐시(isFollowing/followCounts/… )를 통째로 비운다(mobile/app/_layout.tsx 패턴).
// TOKEN_REFRESHED·INITIAL_SESSION은 신원 전환이 아니라 제외.
const IDENTITY_CHANGE_EVENTS = new Set(["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"]);

export default function App() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (IDENTITY_CHANGE_EVENTS.has(event)) {
        window.setTimeout(() => {
          queryClient.clear();
        }, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <QueryClientProvider client={queryClient}>
          <AuthBootstrap>
            {(userId) => (
              <AppProvider initialAuthUserId={userId}>
                <MapProvider>
                  <TooltipProvider>
                    <Toaster />
                    <AppShell />
                  </TooltipProvider>
                </MapProvider>
              </AppProvider>
            )}
          </AuthBootstrap>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
