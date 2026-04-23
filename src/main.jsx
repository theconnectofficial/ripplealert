import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";

function ProtectedApp() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#05060f", color: "#7d8099",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Instrument Sans','Inter',sans-serif", fontSize: 13,
      }}>Loading session…</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <App />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"      element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app"   element={<ProtectedApp />} />
          <Route path="*"      element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
