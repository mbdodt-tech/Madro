import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { DesignPage } from "./pages/DesignPage";
import { DiaryPage } from "./pages/DiaryPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ProductPage } from "./pages/ProductPage";
import { ScanPage } from "./pages/ScanPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <HomePage />
            </RequireAuth>
          }
        />
        <Route
          path="/diary"
          element={
            <RequireAuth>
              <DiaryPage />
            </RequireAuth>
          }
        />
        <Route
          path="/scan"
          element={
            <RequireAuth>
              <ScanPage />
            </RequireAuth>
          }
        />
        <Route
          path="/product/:id"
          element={
            <RequireAuth>
              <ProductPage />
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
