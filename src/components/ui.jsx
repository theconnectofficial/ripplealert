// ── Shared UI primitives ──────────────────────────────────────────────────────
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// ── Severity tokens ──────────────────────────────────────────────────────────
export const SEV = {
  CRITICAL: { color: "var(--red)",    bg: "var(--rdglow)", border: "rgba(239,68,68,0.28)"  },
  HIGH:     { color: "var(--orange)", bg: "var(--ogglow)", border: "rgba(249,115,22,0.28)" },
  MEDIUM:   { color: "var(--blue)",   bg: "var(--bglow)",  border: "rgba(56,189,248,0.28)" },
  LOW:      { color: "var(--green)",  bg: "var(--ggglow)", border: "rgba(34,197,94,0.28)"  },
};
export const sevColor = (sev) => SEV[sev]?.color || "var(--muted)";

export function Badge({ sev, size = "md", children }) {
  const s = SEV[sev] || SEV.LOW;
  const pad = size === "sm" ? "1px 7px" : "2px 9px";
  const fs  = size === "sm" ? 9.5 : 10;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: pad, borderRadius: 999, fontSize: fs, fontWeight: 600, letterSpacing: "0.04em",
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      textTransform: "uppercase",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
      {children || sev}
    </span>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = "", style = {}, pad = true, hover = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={className + (hover ? " hover-raise" : "")}
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        padding: pad ? "18px 20px" : 0,
        boxShadow: "var(--shadow-sm)",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardHead({ title, sub, right, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {icon && (
          <div style={{
            width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--accent2)", fontSize: 13,
            flexShrink: 0,
          }}>{icon}</div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>{title}</div>
          {sub && <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
      {right && <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

// ── Stat ─────────────────────────────────────────────────────────────────────
export function Stat({ label, value, delta, deltaColor, accent = "var(--accent)", icon }) {
  return (
    <div
      className="hover-raise"
      style={{
        position: "relative",
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        padding: "16px 18px",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent, opacity: 0.75 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 9.5, color: "var(--muted)", letterSpacing: "0.1em", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
        {icon && <div style={{ width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: `${accent}22`, color: accent, fontSize: 12 }}>{icon}</div>}
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      {delta && <div style={{ fontSize: 10.5, color: deltaColor || "var(--muted)", marginTop: 6, fontWeight: 500 }}>{delta}</div>}
    </div>
  );
}

// ── Button ───────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = "ghost", size = "md", style = {}, disabled = false, title, type = "button" }) {
  const base = {
    border: "1px solid", borderRadius: 7, fontFamily: "var(--font-sans)",
    cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s",
    opacity: disabled ? 0.55 : 1, display: "inline-flex", alignItems: "center", gap: 6,
    lineHeight: 1, whiteSpace: "nowrap", justifyContent: "center",
  };
  const sizes = {
    sm: { padding: "5px 10px", fontSize: 11 },
    md: { padding: "7px 13px", fontSize: 11.5 },
    lg: { padding: "9px 18px", fontSize: 12.5 },
  };
  const variants = {
    ghost:   { background: "var(--bg3)",    borderColor: "var(--brd2)",           color: "var(--text2)",  fontWeight: 500 },
    subtle:  { background: "transparent",   borderColor: "transparent",           color: "var(--muted)",  fontWeight: 500 },
    accent:  { background: "var(--acglow)", borderColor: "var(--acline)",         color: "var(--accent2)",fontWeight: 600 },
    danger:  { background: "var(--rdglow)", borderColor: "rgba(239,68,68,0.3)",   color: "var(--red)",    fontWeight: 600 },
    success: { background: "var(--ggglow)", borderColor: "rgba(34,197,94,0.3)",   color: "var(--green)",  fontWeight: 600 },
    primary: {
      background: "linear-gradient(135deg,var(--accent) 0%,#4f46e5 100%)",
      borderColor: "transparent", color: "#fff", fontWeight: 600,
      boxShadow: "0 4px 14px -4px rgba(99,102,241,0.55)",
    },
  };
  return (
    <button type={type} onClick={disabled ? undefined : onClick} title={title}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }} disabled={disabled}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = "brightness(1.15)"; }}
      onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
    >
      {children}
    </button>
  );
}

export function IconBtn({ children, onClick, title, active = false, disabled = false, style = {} }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
      style={{
        width: 30, height: 30, borderRadius: 7,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: active ? "var(--acglow)" : "var(--bg3)",
        border: `1px solid ${active ? "var(--acline)" : "var(--brd2)"}`,
        color: active ? "var(--accent2)" : "var(--text2)",
        fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s", padding: 0, ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = "var(--brd3)"; }}
      onMouseLeave={e => { if (!active && !disabled) e.currentTarget.style.borderColor = "var(--brd2)"; }}
    >
      {children}
    </button>
  );
}

// ── Page primitives ──────────────────────────────────────────────────────────
export function PageWrap({ children }) {
  return (
    <div className="flex-1 fade-in" style={{ padding: "22px 28px 32px", overflowY: "auto", minHeight: 0 }}>
      {children}
    </div>
  );
}

export function PageHeader({ title, sub, right, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {icon && (
          <div style={{
            width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--accent2)", fontSize: 17,
            boxShadow: "var(--shadow-sm)", flexShrink: 0,
          }}>{icon}</div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.1 }}>
            {title}
          </div>
          {sub && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
        </div>
      </div>
      {right && <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

// ── Table ────────────────────────────────────────────────────────────────────
export function Table({ heads, rows, empty }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
        {empty || "No results"}
      </div>
    );
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {heads.map((h, i) => (
              <th key={i} style={{
                textAlign: "left", fontSize: 9.5, fontWeight: 600, color: "var(--muted)",
                padding: "9px 12px", borderBottom: "1px solid var(--border)",
                letterSpacing: "0.08em", textTransform: "uppercase",
                background: "var(--bg2)",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, mono, accent, style = {}, ...rest }) {
  return (
    <td
      {...rest}
      style={{
        padding: "10px 12px",
        borderBottom: "1px solid var(--border)",
        color: accent || "var(--text2)",
        fontFamily: mono ? "var(--font-mono)" : undefined,
        verticalAlign: "middle",
        ...style,
      }}
    >
      {children}
    </td>
  );
}

export function Tag({ children, color = "var(--text2)", bg = "var(--bg3)", border = "var(--brd2)" }) {
  return (
    <span style={{
      fontSize: 10, padding: "2px 8px", borderRadius: 999,
      background: bg, color, border: `1px solid ${border}`,
      fontFamily: "var(--font-mono)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5,
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

// ── Status / Spinner ─────────────────────────────────────────────────────────
export function StatusDot({ live = true, color }) {
  const c = color || (live ? "var(--green)" : "var(--muted)");
  return (
    <span style={{
      width: 7, height: 7, borderRadius: "50%", background: c, display: "inline-block",
      boxShadow: live ? `0 0 8px ${c}` : undefined,
      animation: live ? "pulse 2s infinite" : undefined,
    }} />
  );
}

export function Spinner({ size = 12, color = "var(--accent2)" }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      border: "2px solid var(--brd2)", borderTopColor: color,
      borderRadius: "50%", animation: "spin 0.7s linear infinite",
    }} />
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({ icon = "◌", title, hint, action }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 20px", color: "var(--muted)" }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18, margin: "0 auto 18px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg2)", border: "1px solid var(--border)",
        fontSize: 26, color: "var(--accent2)", opacity: 0.85,
        boxShadow: "inset 0 0 0 1px var(--border)",
      }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{title}</div>
      {hint && <div style={{ fontSize: 12, color: "var(--muted)", maxWidth: 380, margin: "0 auto", lineHeight: 1.5 }}>{hint}</div>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

// ── Input wrapper ────────────────────────────────────────────────────────────
export function Input({ icon, right, style = {}, containerStyle = {}, ...props }) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", ...containerStyle }}>
      {icon && <span style={{ position: "absolute", left: 12, color: "var(--muted)", fontSize: 13, pointerEvents: "none", display: "flex", alignItems: "center" }}>{icon}</span>}
      <input
        {...props}
        style={{
          width: "100%", padding: `9px ${right ? 44 : 13}px 9px ${icon ? 34 : 13}px`,
          fontSize: 12.5, borderRadius: "var(--r-sm)",
          ...style,
        }}
      />
      {right && <span style={{ position: "absolute", right: 8, display: "flex", alignItems: "center" }}>{right}</span>}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, sub, children, width = 480, footer }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 0.15s ease", padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="scale-in"
        style={{
          width: "100%", maxWidth: width, background: "var(--bg2)",
          border: "1px solid var(--brd2)", borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow-lg)", overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{title}</div>
            {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{sub}</div>}
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", color: "var(--muted)",
            fontSize: 20, padding: 0, width: 26, height: 26, borderRadius: 6, lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ padding: "18px 20px" }}>{children}</div>
        {footer && <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", background: "var(--bg1)", display: "flex", justifyContent: "flex-end", gap: 8 }}>{footer}</div>}
      </div>
    </div>
  );
}

// ── Toast system ─────────────────────────────────────────────────────────────
const ToastCtx = createContext({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);
  const push = useCallback((t) => {
    const id = ++idRef.current;
    const toast = { id, type: "info", duration: 3600, ...(typeof t === "string" ? { message: t } : t) };
    setItems(p => [...p, toast]);
    if (toast.duration > 0) setTimeout(() => setItems(p => p.filter(x => x.id !== id)), toast.duration);
  }, []);
  const dismiss = (id) => setItems(p => p.filter(x => x.id !== id));

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div style={{ position: "fixed", bottom: 18, right: 18, zIndex: 200, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(t => {
          const c = t.type === "success" ? "var(--green)"
                 : t.type === "error"   ? "var(--red)"
                 : t.type === "warn"    ? "var(--orange)"
                                        : "var(--accent2)";
          const icon = t.type === "success" ? "✓" : t.type === "error" ? "✕" : t.type === "warn" ? "!" : "i";
          return (
            <div key={t.id} className="slide-in-r" style={{
              minWidth: 260, maxWidth: 380, background: "var(--bg2)",
              border: "1px solid var(--brd2)", borderLeft: `3px solid ${c}`,
              borderRadius: "var(--r-md)", padding: "11px 14px",
              boxShadow: "var(--shadow-md)",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%", display: "inline-flex",
                alignItems: "center", justifyContent: "center", background: `${c}22`,
                color: c, fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
              }}>{icon}</span>
              <div style={{ flex: 1, fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}>
                {t.title && <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.title}</div>}
                <div style={{ color: t.title ? "var(--muted)" : "var(--text)" }}>{t.message}</div>
              </div>
              <button onClick={() => dismiss(t.id)} style={{
                background: "transparent", border: "none", color: "var(--muted)",
                fontSize: 14, padding: 0, width: 16, height: 16, flexShrink: 0,
              }}>×</button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

// ── Downloads ────────────────────────────────────────────────────────────────
export function downloadCSV(filename, headers, rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(filename, blob);
}

export function downloadFile(filename, text, type = "text/plain") {
  triggerDownload(filename, new Blob([text], { type }));
}

function triggerDownload(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
