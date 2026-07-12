/**
 * Lunchie Munchie App — Design: Soft Coral (Option 8)
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, useParams, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider } from "./contexts/AppContext";
import TabBar from "./components/TabBar";
import OnboardingPage from "./pages/OnboardingPage";
import HomePage from "./pages/HomePage";
import MunchieFeedPage from "./pages/MunchieFeedPage";
import FeedComposePage from "./pages/FeedComposePage";
import CourseNavigatePage from "./pages/CourseNavigatePage";
import NewCourseDetailPage from "./pages/course/CourseDetailPage";
import CourseEditPage from "./pages/course/CourseEditPage";
import CourseSharePage from "./pages/course/CourseSharePage";
import SavedPage from "./pages/SavedPage";
import ProfilePage from "./pages/ProfilePage";
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

const NO_TABBAR = ['/onboarding', '/tour-mode', '/course/', '/lunchie', '/session', '/join', '/feed/new'];

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
            <Route path="/feed" component={MunchieFeedPage} />
            <Route path="/feed/new" component={FeedComposePage} />
            <Route path="/courses/:id/navigate" component={CourseNavigatePage} />
            <Route path="/courses/:id" component={CoursesRedirect} />
            <Route path="/course/:id/edit" component={CourseEditPage} />
            <Route path="/course/:id/share" component={CourseSharePage} />
            <Route path="/course/:id" component={NewCourseDetailPage} />
            <Route path="/saved" component={SavedPage} />
            <Route path="/profile" component={ProfilePage} />
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

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AppProvider>
          <TooltipProvider>
            <Toaster />
            <AppShell />
          </TooltipProvider>
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
