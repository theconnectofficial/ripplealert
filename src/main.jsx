import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";

const MOBILE_BREAKPOINT = 900;

function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const get = () =>
    typeof window !== "undefined" &&
    (window.matchMedia?.(`(max-width: ${breakpoint}px)`).matches ||
      window.innerWidth <= breakpoint);
  const [isMobile, setIsMobile] = useState(get);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setIsMobile(get());
    mql.addEventListener?.("change", onChange);
    window.addEventListener("resize", onChange);
    return () => {
      mql.removeEventListener?.("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, [breakpoint]);
  return isMobile;
}

function MobileBlock() {
  return (
    <div style={{
      minHeight: "100vh", background: "#03040a", color: "#e8e8f0",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "32px 24px", textAlign: "center",
      fontFamily: "'Instrument Sans','Inter',sans-serif",
    }}>
      <div style={{ maxWidth: 420 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(240,62,62,0.10)",
          border: "1px solid rgba(240,62,62,0.35)",
          color: "#f03e3e", fontSize: 26,
        }}>⚠</div>
        <h1 style={{
          fontFamily: "'Syne','Inter',sans-serif",
          fontSize: 22, fontWeight: 700, margin: "0 0 12px", letterSpacing: "-0.01em",
        }}>Desktop required</h1>
        <p style={{ color: "#9a9cb3", fontSize: 14, lineHeight: 1.55, margin: "0 0 22px" }}>
          The RippleAlert dashboard is optimized for larger screens.
          Please open this app on your desktop or laptop to continue.
        </p>
        <a
          href="/"
          style={{
            display: "inline-block", padding: "10px 18px",
            borderRadius: 10, fontSize: 13, fontWeight: 600,
            color: "#e8e8f0", textDecoration: "none",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >← Back to Home</a>
      </div>
    </div>
  );
}

function ProtectedApp() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  if (isMobile) return <MobileBlock />;
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

function MobileGate({ children }) {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileBlock />;
  return children;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"      element={<LandingPage />} />
          <Route path="/login" element={<MobileGate><LoginPage /></MobileGate>} />
          <Route path="/app"   element={<ProtectedApp />} />
          <Route path="*"      element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
