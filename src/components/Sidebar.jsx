import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import raLogo from "../assets/ralogo.png";

const NAV = [
  { id: "dashboard",   label: "Dashboard",        icon: "⊞", group: "Core" },
  { id: "scanner",     label: "Scanner",          icon: "⌖", group: "Core" },
  { id: "graph",       label: "Propagation Graph",icon: "⬡", group: "Core" },
  { id: "remediation", label: "AI Remediation",   icon: "✦", group: "Core", badge: "AI" },
  { id: "packages",    label: "Package Explorer", icon: "▤", group: "Intelligence" },
  { id: "watchlist",   label: "Watchlist",        icon: "◎", group: "Intelligence", badgeKey: "watchlist" },
  { id: "history",     label: "Scan History",     icon: "◷", group: "System" },
  { id: "settings",    label: "Settings",         icon: "⚙", group: "System" },
];
const GROUPS = ["Core", "Intelligence", "System"];

export default function Sidebar({ active, onNavigate, watchlistCount, activeCVE }) {
  const { user, signOut } = useAuth() || {};
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const meta = user?.user_metadata || {};
  const displayName = meta.full_name || meta.name || user?.email?.split("@")[0] || "Guest";
  const handle      = meta.user_name ? `@${meta.user_name}` : (user?.email || "Runtime Hackers · 2026");
  const avatarUrl   = meta.avatar_url;
  const initials    = (displayName || "U").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const handleLogout = async () => {
    await signOut?.();
    navigate("/", { replace: true });
  };

  return (
    <aside style={{
      width: 244, minWidth: 244,
      background: "linear-gradient(180deg,var(--bg1) 0%,#080918 100%)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Brand */}
      <div style={{ padding: "18px 16px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            overflow: "hidden",
            flexShrink: 0,
          }}>
            <img src={raLogo} alt="RippleAlert" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
              RippleAlert
            </div>
            <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em", fontWeight: 600, textTransform: "uppercase" }}>
              CVE Propagation Intel
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
        {GROUPS.map(group => (
          <div key={group} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: "var(--muted)",
              letterSpacing: "0.14em", textTransform: "uppercase",
              padding: "0 10px", marginBottom: 6,
            }}>{group}</div>
            {NAV.filter(n => n.group === group).map(item => {
              const isActive = active === item.id;
              const badgeValue = item.badgeKey === "watchlist" ? watchlistCount : item.badge;
              return (
                <div
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  style={{
                    position: "relative",
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 8,
                    cursor: "pointer", fontSize: 12.5, marginBottom: 2,
                    background: isActive ? "var(--acglow)" : "transparent",
                    border: `1px solid ${isActive ? "var(--acline)" : "transparent"}`,
                    color: isActive ? "#fff" : "var(--text2)",
                    fontWeight: isActive ? 600 : 500,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    if (!isActive) { e.currentTarget.style.background = "var(--bg2)"; e.currentTarget.style.color = "#fff"; }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text2)"; }
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: "absolute", left: -10, top: 8, bottom: 8, width: 2,
                      background: "var(--accent)", borderRadius: "0 2px 2px 0",
                    }} />
                  )}
                  <span style={{ fontSize: 13, width: 16, textAlign: "center", color: isActive ? "var(--accent2)" : "var(--muted)" }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {badgeValue != null && badgeValue !== false && badgeValue !== "" && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                      background: item.badgeKey ? "var(--acglow)" : "var(--rdglow)",
                      color: item.badgeKey ? "var(--accent2)" : "var(--red)",
                      border: `1px solid ${item.badgeKey ? "var(--acline)" : "rgba(239,68,68,0.3)"}`,
                      letterSpacing: "0.06em",
                    }}>{badgeValue}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Active scan pill */}
      {activeCVE && (
        <div style={{ padding: "0 12px 10px" }}>
          <div style={{
            padding: "9px 11px", borderRadius: 9,
            background: "var(--rdglow)", border: "1px solid rgba(239,68,68,0.22)",
            fontSize: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)", boxShadow: "0 0 6px var(--red)", animation: "pulse 2s infinite" }} />
              <span style={{ color: "var(--muted)", letterSpacing: "0.08em", fontWeight: 600, textTransform: "uppercase" }}>Active Scan</span>
            </div>
            <div style={{ color: "var(--red)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{activeCVE.id}</div>
            <div style={{ color: "var(--text2)", marginTop: 2, fontFamily: "var(--font-mono)" }}>{activeCVE.affectedPackage}</div>
          </div>
        </div>
      )}

      {/* Profile */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", position: "relative" }}>
        {menuOpen && (
          <div
            onMouseLeave={() => setMenuOpen(false)}
            style={{
              position: "absolute", left: 14, right: 14, bottom: 70,
              background: "var(--bg2)", border: "1px solid var(--brd2)",
              borderRadius: 9, padding: 5, boxShadow: "var(--shadow-md)", zIndex: 10,
            }}
          >
            {meta.html_url || meta.user_name ? (
              <a
                href={meta.html_url || `https://github.com/${meta.user_name}`}
                target="_blank" rel="noreferrer"
                style={{
                  display: "block", padding: "7px 10px", borderRadius: 6,
                  fontSize: 11.5, color: "var(--text2)", textDecoration: "none",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >View GitHub profile ↗</a>
            ) : null}
            <button
              onClick={handleLogout}
              style={{
                width: "100%", padding: "7px 10px", borderRadius: 6,
                fontSize: 11.5, color: "var(--red)", background: "transparent",
                border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--rdglow)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >Sign out</button>
          </div>
        )}
        <div
          onClick={() => setMenuOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 10px", borderRadius: 9,
            background: "var(--bg2)", border: "1px solid var(--border)",
            cursor: "pointer", transition: "border-color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "var(--brd2)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
          title={menuOpen ? "Close menu" : "Open account menu"}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl} alt={displayName}
              style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                objectFit: "cover",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            />
          ) : (
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: "linear-gradient(135deg,var(--accent) 0%,var(--purple) 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
            }}>{initials}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{handle}</div>
          </div>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>{menuOpen ? "▾" : "▴"}</span>
        </div>
      </div>
    </aside>
  );
}
