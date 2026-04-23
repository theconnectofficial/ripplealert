import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEffect } from "react";
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
  const { user, signInWithGitHub, supabaseEnabled } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate("/app", { replace: true }); }, [user, navigate]);

  const handleLogin = async () => {
    const r = await signInWithGitHub();
    if (r?.error) alert(r.error.message);
    if (r?.demo) navigate("/app", { replace: true });
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#05060f", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Instrument Sans','Inter',sans-serif",
      position: "relative", overflow: "hidden", padding: 20,
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
        padding: "40px 36px", boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <Logo />
        </div>

        <h1 style={{
          fontSize: 26, fontWeight: 600, textAlign: "center",
          letterSpacing: "-0.025em", margin: "0 0 8px",
        }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 13, color: "#7d8099", textAlign: "center", margin: "0 0 32px", lineHeight: 1.55 }}>
          Sign in to map blast radii, draft patch issues, and<br />stay ahead of every CVE.
        </p>

        <button
          onClick={handleLogin}
          style={{
            width: "100%", padding: "13px 16px", borderRadius: 10,
            background: "#fff", color: "#000", border: "none",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
            transition: "transform 0.12s, box-shadow 0.12s",
            fontFamily: "inherit",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 10px 30px -8px rgba(255,255,255,0.25)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
          Continue with GitHub →
        </button>

        {!supabaseEnabled && (
          <div style={{
            marginTop: 16, padding: "10px 12px", borderRadius: 8,
            background: "rgba(240,180,62,0.08)", border: "1px solid rgba(240,180,62,0.25)",
            fontSize: 11, color: "#f0b43e", lineHeight: 1.5,
          }}>
            <strong>Supabase not configured.</strong> Login will use a demo account. Add <code style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10 }}>VITE_SUPABASE_URL</code> and <code style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10 }}>VITE_SUPABASE_ANON_KEY</code> to <code style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10 }}>.env</code> for real GitHub OAuth.
          </div>
        )}

        <div style={{
          marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: 11, color: "#5a5d72", textAlign: "center", lineHeight: 1.6,
        }}>
          By continuing you agree to RippleAlert's terms.<br />
          We only request your public profile and email.
        </div>
      </div>

      <a href="/" style={{
        position: "absolute", top: 24, left: 24, zIndex: 2,
        fontSize: 12, color: "#7d8099", textDecoration: "none",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}>← Back to home</a>
    </div>
  );
}
