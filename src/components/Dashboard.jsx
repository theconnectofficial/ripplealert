import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Stat, Card, CardHead, Btn, Badge, PageWrap, PageHeader, Tag, sevColor } from "./ui";

const SEV_COLORS = { CRITICAL: "var(--red)", HIGH: "var(--orange)", MEDIUM: "var(--blue)", LOW: "var(--green)" };

const WEEKLY_DATA = [
  { week: "W1", scans: 2, pkgs: 12 }, { week: "W2", scans: 3, pkgs: 28 }, { week: "W3", scans: 1, pkgs: 8 },
  { week: "W4", scans: 5, pkgs: 64 }, { week: "W5", scans: 4, pkgs: 41 }, { week: "W6", scans: 6, pkgs: 89 },
  { week: "W7", scans: 3, pkgs: 37 }, { week: "W8", scans: 7, pkgs: 112 }, { week: "W9", scans: 5, pkgs: 68 },
  { week: "W10", scans: 8, pkgs: 145 }, { week: "W11", scans: 6, pkgs: 94 }, { week: "W12", scans: 9, pkgs: 178 },
];

const ACTIVITY = [
  { time: "2 min ago",  msg: "CVE-2021-44228 scan — 15 packages in blast radius", color: "var(--red)" },
  { time: "18 min ago", msg: "Gemini drafted 7 patch-request issues for log4j chain", color: "var(--accent2)" },
  { time: "1 hr ago",   msg: "CVE-2022-22965 Spring4Shell added to watchlist", color: "var(--yellow)" },
  { time: "3 hr ago",   msg: "Maven traversal: log4j-core 2.14.1 — Critical exposure", color: "var(--orange)" },
  { time: "Yesterday",  msg: "NVD batch ingested — 2 new CVE entries", color: "var(--muted)" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg3)", border: "1px solid var(--brd2)", borderRadius: 8, padding: "9px 12px", fontSize: 11, boxShadow: "var(--shadow-md)" }}>
      <div style={{ color: "var(--muted)", marginBottom: 5, fontFamily: "var(--font-mono)" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          {p.name}: <strong style={{ color: "#fff", marginLeft: "auto" }}>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard({ cveCache, scanHistory, onNavigate, onScanSelect }) {
  const cves = Object.values(cveCache);
  const totalPkgs = cves.reduce((a, c) => a + (c.nodes?.length || 0), 0);
  const maxCVSS = Math.max(0, ...cves.map(c => c.cvssScore || 0));
  const totalIssues = scanHistory.reduce((a, h) => a + (h.issues || 0), 0);
  const sevCounts = cves.reduce((a, c) => { a[c.severity] = (a[c.severity] || 0) + 1; return a; }, {});
  const pieData = Object.entries(sevCounts).map(([name, value]) => ({ name, value }));

  return (
    <PageWrap>
      <PageHeader
        icon="⊞"
        title="Dashboard"
        sub={`Live overview · ${cves.length} CVEs cached · ${scanHistory.length} scan runs`}
        right={<>
          <Btn onClick={() => onNavigate("packages")}>Export ↗</Btn>
          <Btn onClick={() => onNavigate("scanner")} variant="primary">+ New Scan</Btn>
        </>}
      />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginBottom: 18 }}>
        <Stat icon="◈" label="Packages Affected" value={totalPkgs} delta="across all CVEs" accent="var(--red)" />
        <Stat icon="⌖" label="CVEs Scanned"      value={cves.length} delta={`${scanHistory.length} scan runs`} accent="var(--accent)" />
        <Stat icon="▲" label="Max CVSS Active"   value={maxCVSS.toFixed(1)} delta="Critical severity" accent="var(--orange)" />
        <Stat icon="✦" label="Issues Drafted"    value={totalIssues} delta="Gemini-generated" accent="var(--purple)" />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <Card>
          <CardHead title="Scan Activity" sub="last 12 weeks" right={<Tag>trending ↑</Tag>} />
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={WEEKLY_DATA} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPkgs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="week" tick={{ fill: "var(--muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="pkgs" name="Packages" stroke="#6366f1" fill="url(#gradPkgs)" strokeWidth={2.2} dot={false} />
              <Area type="monotone" dataKey="scans" name="Scans" stroke="var(--red)" fill="none" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
            <LegendDot color="var(--accent)" label="Packages affected" />
            <LegendDot color="var(--red)" label="Scans run" dashed />
          </div>
        </Card>

        <Card>
          <CardHead title="Affected Packages per CVE" sub="ranked by blast radius" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...cves]
              .sort((a, b) => (b.nodes?.length || 0) - (a.nodes?.length || 0))
              .slice(0, 6)
              .map((c, i) => {
                const count = c.nodes?.length || 0;
                const max = Math.max(1, ...cves.map(x => x.nodes?.length || 0));
                const pct = (count / max) * 100;
                return (
                  <div
                    key={c.id}
                    onClick={() => onScanSelect(c.id)}
                    className="hover-raise"
                    style={{
                      display: "grid", gridTemplateColumns: "18px 1fr auto", alignItems: "center",
                      gap: 10, padding: "8px 10px", borderRadius: 8,
                      background: "var(--bg3)", border: "1px solid var(--border)", cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>#{i + 1}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent2)", fontWeight: 600 }}>{c.id}</span>
                        <Badge sev={c.severity} size="sm" />
                      </div>
                      <div style={{ height: 4, background: "var(--bg4)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: SEV_COLORS[c.severity] || "var(--accent)", borderRadius: 99 }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "var(--font-mono)", minWidth: 32, textAlign: "right" }}>{count}</span>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Card>
          <CardHead title="Severity Distribution" />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 128, height: 128, position: "relative", flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={SEV_COLORS[entry.name] || "#888"} stroke="var(--bg2)" strokeWidth={2} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", pointerEvents: "none" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{cves.length}</div>
                <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em" }}>TOTAL</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {pieData.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7, fontSize: 11 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: SEV_COLORS[d.name] || "#888", flexShrink: 0 }} />
                  <span style={{ color: "var(--text2)", flex: 1, fontWeight: 500 }}>{d.name}</span>
                  <span style={{ color: "#fff", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="Quick Scan" sub="cached CVEs" right={<Btn size="sm" onClick={() => onNavigate("scanner")}>+ New</Btn>} />
          {cves.map(cve => (
            <div
              key={cve.id}
              onClick={() => onScanSelect(cve.id)}
              className="hover-raise"
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "9px 11px", marginBottom: 7,
                background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "var(--accent2)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{cve.id}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{cve.affectedPackage} · {cve.ecosystem}</div>
              </div>
              <Badge sev={cve.severity} size="sm" />
            </div>
          ))}
        </Card>

        <Card>
          <CardHead title="Activity Feed" right={
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--muted)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 6px var(--green)", animation: "pulse 2s infinite" }} /> live
            </div>
          } />
          <div style={{ borderLeft: "1px solid var(--brd2)", paddingLeft: 14 }}>
            {ACTIVITY.map((a, i) => (
              <div key={i} style={{ position: "relative", marginBottom: 12 }}>
                <div style={{ position: "absolute", left: -18, top: 4, width: 7, height: 7, borderRadius: "50%", background: a.color, border: "1.5px solid var(--bg2)", boxShadow: `0 0 6px ${a.color}` }} />
                <div style={{ fontSize: 9.5, color: "var(--muted)", marginBottom: 3, letterSpacing: "0.04em" }}>{a.time}</div>
                <div style={{ fontSize: 11.5, color: "var(--text)", lineHeight: 1.45 }}>{a.msg}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageWrap>
  );
}

function LegendDot({ color, label, dashed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--muted)" }}>
      <div style={{
        width: 14, height: 2, background: color, borderRadius: 1,
        ...(dashed ? { background: "transparent", borderTop: `2px dashed ${color}` } : {}),
      }} />
      {label}
    </div>
  );
}
