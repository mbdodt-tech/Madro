import { BrowserRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { RequireAuth } from "./auth/RequireAuth";
import { RequireOnboarded } from "./auth/RequireOnboarded";
import { DesignPage } from "./pages/DesignPage";
import { DiaryPage } from "./pages/DiaryPage";
import { InsightsPage } from "./pages/InsightsPage";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { ProductPage } from "./pages/ProductPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ScanPage } from "./pages/ScanPage";
import { TodayPage } from "./pages/TodayPage";

/** Login + gennemført onboarding (4.1) — alle app-flader bag begge gates. */
function Protected({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <RequireOnboarded>{children}</RequireOnboarded>
    </RequireAuth>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Protected><TodayPage /></Protected>} />
        <Route path="/diary" element={<Protected><DiaryPage /></Protected>} />
        <Route path="/insights" element={<Protected><InsightsPage /></Protected>} />
        <Route path="/scan" element={<Protected><ScanPage /></Protected>} />
        <Route path="/product/:id" element={<Protected><ProductPage /></Protected>} />
        <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
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
        {/* Midlertidig dev-side (0.2/0.3) — åben, indeholder ingen brugerdata */}
        <Route path="/design" element={<DesignPage />} />
      </Routes>
    </BrowserRouter>
  );
}
