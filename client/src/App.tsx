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
import QuickMatchPage from "./pages/QuickMatchPage";
import ExplorePage from "./pages/ExplorePage";
import CourseNavigatePage from "./pages/CourseNavigatePage";
import NewCourseDetailPage from "./pages/course/CourseDetailPage";
import CourseEditPage from "./pages/course/CourseEditPage";
import CourseSharePage from "./pages/course/CourseSharePage";
import SavedPage from "./pages/SavedPage";
import ProfilePage from "./pages/ProfilePage";
import SessionCreatePage from "./pages/SessionCreatePage";
import SessionLobbyPage from "./pages/SessionLobbyPage";
import TourMapPage from "./pages/TourMapPage";
import TourModePage from "./pages/TourModePage";

const NO_TABBAR = ['/onboarding', '/tour-mode', '/quick-match', '/course/'];

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
        <Switch>
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/" component={HomePage} />
          <Route path="/quick-match" component={QuickMatchPage} />
          <Route path="/explore" component={ExplorePage} />
          <Route path="/courses/:id/navigate" component={CourseNavigatePage} />
          <Route path="/courses/:id" component={CoursesRedirect} />
          <Route path="/course/:id/edit" component={CourseEditPage} />
          <Route path="/course/:id/share" component={CourseSharePage} />
          <Route path="/course/:id" component={NewCourseDetailPage} />
          <Route path="/saved" component={SavedPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/session/create" component={SessionCreatePage} />
          <Route path="/session/lobby" component={SessionLobbyPage} />
          <Route path="/tour-map" component={TourMapPage} />
          <Route path="/tour-mode" component={TourModePage} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
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
