import { BrowserRouter, Route, Routes } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";
import { RequireAuth } from "./auth/RequireAuth";
import { RequireOnboarded } from "./auth/RequireOnboarded";
import { LoginPage } from "./pages/LoginPage";

// Login er den eneste flade en udlogget bruger møder — den holdes ivrig, så
// første maling ikke venter på en chunk. Alt bag login lazy-loades pr. rute
// (PERF-1, audit 2026-07-20), så login-bundlet ikke slæber hele app'en med.
const TodayPage = lazy(() => import("./pages/TodayPage").then((m) => ({ default: m.TodayPage })));
const DiaryPage = lazy(() => import("./pages/DiaryPage").then((m) => ({ default: m.DiaryPage })));
const InsightsPage = lazy(() => import("./pages/InsightsPage").then((m) => ({ default: m.InsightsPage })));
const ScanPage = lazy(() => import("./pages/ScanPage").then((m) => ({ default: m.ScanPage })));
const ProductPage = lazy(() => import("./pages/ProductPage").then((m) => ({ default: m.ProductPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const PremiumPage = lazy(() => import("./pages/PremiumPage").then((m) => ({ default: m.PremiumPage })));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage").then((m) => ({ default: m.OnboardingPage })));
// Kun refereret bag import.meta.env.DEV — egen chunk, hentes aldrig i prod.
const DesignPage = lazy(() => import("./pages/DesignPage").then((m) => ({ default: m.DesignPage })));

/** Login + gennemført onboarding (4.1) — alle app-flader bag begge gates. */
function Protected({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <RequireOnboarded>{children}</RequireOnboarded>
    </RequireAuth>
  );
}

/** Rolig brand-flade mens en rute-chunk hentes — undgår hvidt blink. */
function RouteFallback() {
  return <div className="min-h-screen bg-bg" aria-hidden="true" />;
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Protected><TodayPage /></Protected>} />
          <Route path="/diary" element={<Protected><DiaryPage /></Protected>} />
          <Route path="/insights" element={<Protected><InsightsPage /></Protected>} />
          <Route path="/scan" element={<Protected><ScanPage /></Protected>} />
          <Route path="/product/:id" element={<Protected><ProductPage /></Protected>} />
          <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
          <Route path="/premium" element={<Protected><PremiumPage /></Protected>} />
          {/* Onboarding kræver login, men naturligvis ikke gennemført onboarding */}
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <OnboardingPage />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          {/* Intern specimen-side (0.2/0.3) — kun i udvikling, aldrig i prod (MISC-1). */}
          {import.meta.env.DEV ? <Route path="/design" element={<DesignPage />} /> : null}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
