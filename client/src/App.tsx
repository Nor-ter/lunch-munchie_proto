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
import LunchieSwipePage from "./pages/LunchieSwipePage";
import CourseFeedsPage from "./pages/CourseFeedsPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import CourseNavigatePage from "./pages/CourseNavigatePage";
import SavedPage from "./pages/SavedPage";
import ProfilePage from "./pages/ProfilePage";
import LunchieSettingsPage from "./pages/LunchieSettingsPage";
import SessionLobbyPage from "./pages/SessionLobbyPage";
import TourMapPage from "./pages/TourMapPage";
import CourseEditorPage from "./pages/CourseEditorPage";
import SessionJoinPage from "./pages/SessionJoinPage";
import LunchieResultsPage from "./pages/LunchieResultsPage";
import LunchieMapPage from "./pages/LunchieMapPage";
import RestaurantDetailPage from "./pages/RestaurantDetailPage";
import CourseSharePage from "./pages/CourseSharePage";

const NO_TABBAR = ['/onboarding', '/lunchie/swipe', '/lunchie/results', '/lunchie/map', '/courses/', '/restaurant/', '/join'];

function AppShell() {
  const [location] = useLocation();
  const showTabBar = !NO_TABBAR.some(p => location.startsWith(p));
  return (
    <div className="app-shell">
      <div className={showTabBar ? "min-h-dvh pb-20" : "min-h-dvh"}>
        <Switch>
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/" component={HomePage} />
          
          {/* Lunchie Mode */}
          <Route path="/lunchie/settings" component={LunchieSettingsPage} />
          <Route path="/lunchie/swipe" component={LunchieSwipePage} />
          <Route path="/lunchie/results" component={LunchieResultsPage} />
          <Route path="/lunchie/map" component={LunchieMapPage} />
          <Route path="/session/lobby" component={SessionLobbyPage} />
          <Route path="/join/:token" component={SessionJoinPage} />
          
          {/* Munchie Mode */}
          <Route path="/courses/feeds" component={CourseFeedsPage} />
          <Route path="/courses/:id" component={CourseDetailPage} />
          <Route path="/courses/:id/edit" component={CourseEditorPage} />
          <Route path="/courses/:id/navigate" component={CourseNavigatePage} />
          <Route path="/courses/:id/share" component={CourseSharePage} />
          <Route path="/tour-map" component={TourMapPage} />

          {/* Common / Misc */}
          <Route path="/restaurant/:id" component={RestaurantDetailPage} />
          <Route path="/saved" component={SavedPage} />
          <Route path="/profile" component={ProfilePage} />
          
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
