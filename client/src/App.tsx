/**
 * Lunchie Munchie App — Design: Soft Coral (Option 8)
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider } from "./contexts/AppContext";
import TabBar from "./components/TabBar";
import OnboardingPage from "./pages/OnboardingPage";
import HomePage from "./pages/HomePage";
import QuickMatchPage from "./pages/QuickMatchPage";
import ExplorePage from "./pages/ExplorePage";
import CourseDetailPage from "./pages/CourseDetailPage";
import CourseNavigatePage from "./pages/CourseNavigatePage";
import SavedPage from "./pages/SavedPage";
import ProfilePage from "./pages/ProfilePage";
import SessionCreatePage from "./pages/SessionCreatePage";
import SessionLobbyPage from "./pages/SessionLobbyPage";
import TourMapPage from "./pages/TourMapPage";
import TourModePage from "./pages/TourModePage";
import CourseEditPage from "./pages/course/CourseEditPage";
import CourseSharePage from "./pages/course/CourseSharePage";

const NO_TABBAR = ['/onboarding', '/tour-mode', '/quick-match'];
const NO_TABBAR_SUFFIX = ['/edit', '/share', '/navigate'];

function AppShell() {
  const [location] = useLocation();
  const showTabBar = !NO_TABBAR.some(p => location.startsWith(p)) &&
    !NO_TABBAR_SUFFIX.some(s => location.endsWith(s));
  return (
    <div className="app-shell">
      <div className={showTabBar ? "min-h-dvh pb-20" : "min-h-dvh"}>
        <Switch>
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/" component={HomePage} />
          <Route path="/quick-match" component={QuickMatchPage} />
          <Route path="/explore" component={ExplorePage} />
          <Route path="/courses/:id/navigate" component={CourseNavigatePage} />
          <Route path="/courses/:id" component={CourseDetailPage} />
          <Route path="/saved" component={SavedPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/session/create" component={SessionCreatePage} />
          <Route path="/session/lobby" component={SessionLobbyPage} />
          <Route path="/tour-map" component={TourMapPage} />
          <Route path="/tour-mode" component={TourModePage} />
          <Route path="/courses/:id/edit" component={CourseEditPage} />
          <Route path="/courses/:id/share" component={CourseSharePage} />
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
