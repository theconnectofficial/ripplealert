import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEffect, useState } from "react";
import raLogo from "../assets/ralogo.png";

const Logo = () => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
    <img src={raLogo} alt="RippleAlert" style={{ width: 34, height: 34, borderRadius: 9, objectFit: "contain" }} />
    <div style={{ fontFamily: "'Instrument Sans','Inter',sans-serif", fontSize: 19, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em" }}>
      RippleAlert
    </div>
  </div>
);

export default function LoginPage() {
  const {
    user,
    signInWithGitHub,
    signInWithEmail,
    signUpWithEmail,
    continueAsDemo,
    supabaseEnabled,
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode]     = useState("signin"); // "signin" | "signup"
  const [email, setEmail]   = useState("");
  const [password, setPwd]  = useState("");
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState("");
  const [info, setInfo]     = useState("");

  useEffect(() => { if (user) navigate("/app", { replace: true }); }, [user, navigate]);

  const handleGitHub = async () => {
    setErr(""); setInfo(""); setBusy(true);
    try {
      const r = await signInWithGitHub();
      if (r?.error) setErr(r.error.message || "GitHub sign-in failed.");
      if (r?.demo) navigate("/app", { replace: true });
    } catch (e) {
      setErr(e?.message || "GitHub sign-in failed.");
    } finally { setBusy(false); }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setErr(""); setInfo(""); setBusy(true);
    try {
      const fn = mode === "signup" ? signUpWithEmail : signInWithEmail;
      const r = await fn(email.trim(), password);
      if (r?.error) {
        setErr(r.error.message || "Authentication failed.");
      } else if (mode === "signup" && supabaseEnabled) {
        setInfo("Check your inbox to confirm your email, then sign in.");
      } else if (r?.demo) {
        navigate("/app", { replace: true });
      }
    } catch (e2) {
      setErr(e2?.message || "Authentication failed.");
    } finally { setBusy(false); }
  };

  const handleDemo = () => {
    continueAsDemo();
    navigate("/app", { replace: true });
  };

  const inputStyle = {
    width: "100%", padding: "11px 13px", borderRadius: 8,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "#fff", fontSize: 13.5, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle = {
    fontSize: 11, color: "#7d8099", marginBottom: 6, display: "block",
    letterSpacing: 0.4,
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#05060f", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Instrument Sans','Inter',sans-serif",
      position: "relative", overflow: "hidden",
      padding: "60px 16px 24px",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(240,62,62,0.12) 0%,transparent 60%)",
        pointerEvents: "none", filter: "blur(40px)",
      }} />
      <div style={{
        position: "absolute", bottom: "20%", left: "30%",
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(99,102,241,0.10) 0%,transparent 60%)",
        pointerEvents: "none", filter: "blur(40px)",
      }} />

      <div style={{
        position: "relative", zIndex: 1, width: "100%", maxWidth: 420,
        background: "rgba(15,16,30,0.7)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
        padding: "32px 24px", boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6)",
        boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <Logo />
        </div>

        <h1 style={{
          fontSize: 24, fontWeight: 600, textAlign: "center",
          letterSpacing: "-0.025em", margin: "0 0 6px",
        }}>
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p style={{ fontSize: 12.5, color: "#7d8099", textAlign: "center", margin: "0 0 22px", lineHeight: 1.55 }}>
          Map blast radii, draft patch issues, stay ahead of every CVE.
        </p>

        {/* GitHub */}
        <button
          onClick={handleGitHub}
          disabled={busy}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 10,
            background: "#fff", color: "#000", border: "none",
            fontSize: 13.5, fontWeight: 600, cursor: busy ? "default" : "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
            transition: "transform 0.12s, box-shadow 0.12s",
            fontFamily: "inherit", opacity: busy ? 0.7 : 1,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
          Continue with GitHub
        </button>

        {/* Divider */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          margin: "18px 0 14px", color: "#52536a", fontSize: 11,
        }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          OR
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} autoComplete="on">
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle} htmlFor="ra-email">Email</label>
            <input
              id="ra-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="ra-pwd">Password</label>
            <input
              id="ra-pwd"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {err && (
            <div style={{
              marginBottom: 12, padding: "9px 11px", borderRadius: 8,
              background: "rgba(240,62,62,0.10)", border: "1px solid rgba(240,62,62,0.30)",
              fontSize: 12, color: "#ff8a8a", lineHeight: 1.5,
            }}>{err}</div>
          )}
          {info && (
            <div style={{
              marginBottom: 12, padding: "9px 11px", borderRadius: 8,
              background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.30)",
              fontSize: 12, color: "#86efac", lineHeight: 1.5,
            }}>{info}</div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 10,
              background: "#f03e3e", color: "#fff", border: "none",
              fontSize: 13.5, fontWeight: 600, cursor: busy ? "default" : "pointer",
              fontFamily: "inherit", opacity: busy ? 0.7 : 1,
              boxShadow: "0 8px 24px -10px rgba(240,62,62,0.6)",
            }}
          >
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in with email"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "#7d8099" }}>
          {mode === "signup" ? "Already have an account?" : "New to RippleAlert?"}{" "}
          <button
            type="button"
            onClick={() => { setErr(""); setInfo(""); setMode(mode === "signup" ? "signin" : "signup"); }}
            style={{
              background: "transparent", border: "none", color: "#a0a2bb",
              cursor: "pointer", padding: 0, fontSize: 12, textDecoration: "underline",
              fontFamily: "inherit",
            }}
          >
            {mode === "signup" ? "Sign in" : "Create one"}
          </button>
        </div>

        {/* Direct demo login */}
        <button
          type="button"
          onClick={handleDemo}
          style={{
            width: "100%", marginTop: 14, padding: "11px 16px", borderRadius: 10,
            background: "transparent", color: "#e8e8f0",
            border: "1px solid rgba(99,102,241,0.45)",
            fontSize: 12.5, fontWeight: 500, cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Continue without sign-in (Demo) →
        </button>

        {!supabaseEnabled && (
          <div style={{
            marginTop: 14, padding: "9px 11px", borderRadius: 8,
            background: "rgba(240,180,62,0.08)", border: "1px solid rgba(240,180,62,0.25)",
            fontSize: 11, color: "#f0b43e", lineHeight: 1.5,
          }}>
            <strong>Supabase not configured.</strong> Logins will use a local demo account. Add{" "}
            <code style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10 }}>VITE_SUPABASE_URL</code> and{" "}
            <code style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10 }}>VITE_SUPABASE_ANON_KEY</code> to{" "}
            <code style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10 }}>.env</code> for real auth.
          </div>
        )}

        <div style={{
          marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: 11, color: "#5a5d72", textAlign: "center", lineHeight: 1.6,
        }}>
          By continuing you agree to RippleAlert's terms.
        </div>
      </div>

      <a href="/" style={{
        position: "absolute", top: 18, left: 18, zIndex: 2,
        fontSize: 12, color: "#7d8099", textDecoration: "none",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}>← Back to home</a>
    </div>
  );
}
