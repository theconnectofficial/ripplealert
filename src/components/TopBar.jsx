import { useEffect, useMemo, useRef, useState } from "react";
import { IconBtn, StatusDot, Badge } from "./ui";

const LABELS = {
  dashboard: "Dashboard",
  scanner: "Scanner",
  graph: "Propagation Graph",
  remediation: "AI Remediation",
  packages: "Package Explorer",
  reports: "Exposure Reports",
  watchlist: "Watchlist",
  history: "Scan History",
  settings: "Settings",
};

export default function TopBar({ active, onNavigate, activeCVE, cveCache, scanHistory = [], onScanSelect }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Global search across CVEs, affected packages, and prior scan runs.
  const groups = useMemo(() => {
    if (!q.trim()) return { cves: [], packages: [], history: [] };
    const needle = q.toLowerCase();

    const cves = Object.values(cveCache || {}).filter(c =>
      c.id.toLowerCase().includes(needle) ||
      c.description?.toLowerCase().includes(needle)
    ).slice(0, 6);

    const pkgMap = new Map();
    for (const c of Object.values(cveCache || {})) {
      for (const p of (c.affectedProjects || [])) {
        const name = p.name || "";
        if (!name.toLowerCase().includes(needle) && !c.affectedPackage?.toLowerCase().includes(needle)) continue;
        if (!pkgMap.has(name)) pkgMap.set(name, { name, repo: p.repo, cve: c.id, severity: p.severity });
      }
    }
    const packages = Array.from(pkgMap.values()).slice(0, 6);

    const history = (scanHistory || []).filter(h =>
      (h.target || h.cveId || h.id || "").toLowerCase().includes(needle)
    ).slice(0, 5);

    return { cves, packages, history };
  }, [q, cveCache, scanHistory]);

  const totalResults = groups.cves.length + groups.packages.length + groups.history.length;

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

  return (
    <div style={{
      height: 52, flexShrink: 0,
      borderBottom: "1px solid var(--border)",
      background: "rgba(10,11,24,0.78)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", gap: 14, padding: "0 22px",
      position: "relative", zIndex: 5,
    }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
        <span style={{ color: "var(--muted)" }}>RippleAlert</span>
        <span style={{ color: "var(--muted2)" }}>/</span>
        <span style={{ color: "var(--text)", fontWeight: 500 }}>{LABELS[active] || "Dashboard"}</span>
        {activeCVE && active === "graph" && (
          <>
            <span style={{ color: "var(--muted2)" }}>/</span>
            <span style={{ color: "var(--accent2)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{activeCVE.id}</span>
          </>
        )}
      </div>

      {/* Search */}
      <div ref={ref} style={{ flex: 1, maxWidth: 460, marginLeft: "auto", position: "relative" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 13 }}>⌕</span>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search CVE ID, package, or description..."
            style={{
              width: "100%", padding: "7px 82px 7px 34px", fontSize: 12,
              background: "var(--bg2)", borderRadius: 8,
            }}
          />
          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 4 }}>
            <kbd>{isMac ? "⌘" : "Ctrl"}</kbd><kbd>K</kbd>
          </span>
        </div>
        {open && totalResults > 0 && (
          <div className="scale-in" style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
            background: "var(--bg2)", border: "1px solid var(--brd2)",
            borderRadius: 10, boxShadow: "var(--shadow-lg)", overflow: "hidden", zIndex: 20,
            maxHeight: 460, overflowY: "auto",
          }}>
            {groups.cves.length > 0 && (
              <>
                <div style={{ padding: "6px 10px", fontSize: 9.5, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>CVEs · {groups.cves.length}</div>
                {groups.cves.map(c => (
                  <div key={c.id}
                    onClick={() => { onScanSelect(c.id); setOpen(false); setQ(""); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#fff", fontFamily: "var(--font-mono)", fontWeight: 500 }}>{c.id}</div>
                      <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.affectedPackage} · {c.ecosystem}</div>
                    </div>
                    <Badge sev={c.severity} size="sm" />
                  </div>
                ))}
              </>
            )}

            {groups.packages.length > 0 && (
              <>
                <div style={{ padding: "6px 10px", fontSize: 9.5, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>Packages · {groups.packages.length}</div>
                {groups.packages.map(p => (
                  <div key={p.name}
                    onClick={() => { onScanSelect(p.cve); setOpen(false); setQ(""); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#fff", fontFamily: "var(--font-mono)", fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{p.repo} · via {p.cve}</div>
                    </div>
                    <Badge sev={p.severity} size="sm" />
                  </div>
                ))}
              </>
            )}

            {groups.history.length > 0 && (
              <>
                <div style={{ padding: "6px 10px", fontSize: 9.5, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>Recent scans · {groups.history.length}</div>
                {groups.history.map((h, i) => (
                  <div key={h.id || i}
                    onClick={() => { onScanSelect(h.cveId || h.target || h.id); setOpen(false); setQ(""); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#fff", fontFamily: "var(--font-mono)", fontWeight: 500 }}>{h.target || h.cveId || h.id}</div>
                      <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{h.type} · {h.packagesFound} pkgs · {h.duration}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "5px 10px", borderRadius: 20,
          background: "var(--bg2)", border: "1px solid var(--border)",
        }}>
          <StatusDot live />
          <span style={{ fontSize: 10.5, color: "var(--text2)", fontWeight: 500 }}>NVD live</span>
        </div>
        <IconBtn title="Scanner (Ctrl+K)" onClick={() => onNavigate("scanner")}>⌖</IconBtn>
        <IconBtn title="Settings" onClick={() => onNavigate("settings")}>⚙</IconBtn>
      </div>
    </div>
  );
}
