import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Card, CardHead, Badge, Btn, PageWrap, PageHeader, Stat, Table, Td, Tag, Input, EmptyState, downloadCSV, downloadFile, useToast } from "./ui";

const ECOS = ["all", "npm", "pypi", "maven"];
const SEV_COLORS = { CRITICAL: "var(--red)", HIGH: "var(--orange)", MEDIUM: "var(--blue)", LOW: "var(--green)" };

// Build an SBOM in CycloneDX 1.5 minimal JSON format
function buildSBOM(pkgs) {
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ vendor: "RippleAlert", name: "package-explorer", version: "1.0.0" }],
    },
    components: pkgs.map(p => ({
      type: "library",
      name: p.name,
      version: p.version,
      purl: `pkg:${(p.ecosystem || "npm").toLowerCase()}/${p.name}@${p.version}`,
      vulnerabilities: [{ id: p.cve, ratings: [{ severity: p.severity, score: p.cvss }] }],
    })),
  };
}

export default function PackageExplorer({ cveCache, scanHistory = [], onScanSelect }) {
  const [view, setView]   = useState("packages"); // packages | exposure
  const [query, setQuery] = useState("");
  const [eco, setEco]     = useState("all");
  const [sort, setSort]   = useState({ key: "cvss", dir: "desc" });
  const { push } = useToast();

  const cves = useMemo(() => Object.values(cveCache), [cveCache]);

  const pkgs = useMemo(() => cves.flatMap(cve =>
    (cve.affectedProjects || []).map(p => ({
      ...p,
      cve: cve.id,
      cvss: cve.cvssScore,
      ecosystem: cve.ecosystem,
      fixedVersion: cve.fixedVersion,
      fixAvailable: !!cve.fixedVersion,
    }))
  ), [cves]);

  const filtered = useMemo(() => {
    const list = pkgs.filter(p =>
      (!query || p.name.toLowerCase().includes(query.toLowerCase()) || p.repo?.toLowerCase().includes(query.toLowerCase())) &&
      (eco === "all" || p.ecosystem?.toLowerCase() === eco)
    );
    list.sort((a, b) => {
      const va = a[sort.key]; const vb = b[sort.key];
      if (va == null) return 1; if (vb == null) return -1;
      if (typeof va === "number" || typeof va === "boolean") {
        const na = +va, nb = +vb;
        return sort.dir === "asc" ? na - nb : nb - na;
      }
      return sort.dir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return list;
  }, [pkgs, query, eco, sort]);

  const setSortKey = (key) => setSort(s => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));

  const sortable = (label, key) => (
    <button onClick={() => setSortKey(key)} style={{
      background: "transparent", border: "none", padding: 0, color: "inherit",
      font: "inherit", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase",
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {label} {sort.key === key && <span style={{ color: "var(--accent2)" }}>{sort.dir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );

  const exportCSV = () => {
    if (!filtered.length) return;
    downloadCSV("ripplealert-packages.csv",
      ["Package", "Ecosystem", "Version", "CVE", "CVSS", "Severity", "Fix Available", "Fixed Version", "Repo"],
      filtered.map(p => [p.name, p.ecosystem, p.version, p.cve, p.cvss, p.severity, p.fixAvailable ? "yes" : "no", p.fixedVersion || "", p.repo])
    );
    push({ type: "success", message: `Exported ${filtered.length} packages to CSV` });
  };

  const exportSBOM = () => {
    if (!filtered.length) { push({ type: "warn", message: "No packages to export" }); return; }
    const sbom = buildSBOM(filtered);
    downloadFile("ripplealert-sbom.cdx.json", JSON.stringify(sbom, null, 2), "application/json");
    push({ type: "success", title: "SBOM generated", message: `${filtered.length} components · CycloneDX 1.5` });
  };

  const exportExposure = () => {
    downloadCSV("ripplealert-exposure-report.csv",
      ["CVE", "Package", "Ecosystem", "CVSS", "Severity", "Affected Versions", "Fixed Version", "Pkgs In Blast Radius", "Direct Projects", "Published"],
      cves.map(c => [
        c.id, c.affectedPackage, c.ecosystem, c.cvssScore, c.severity,
        c.affectedVersionRange, c.fixedVersion,
        c.nodes?.length || 0, c.affectedProjects?.length || 0, c.publishedDate,
      ])
    );
    push({ type: "success", message: `Exported ${cves.length} CVEs to CSV` });
  };

  const chartData = cves.map(c => ({ id: c.id.slice(-5), pkgs: c.nodes?.length || 0, sev: c.severity }));

  return (
    <PageWrap>
      <PageHeader icon="▤" title="Package Explorer & Exposure" sub="Every affected package and CVE across scans — one consolidated view"
        right={<>
          <Btn variant="ghost" onClick={exportCSV}>Export CSV ↗</Btn>
          <Btn variant="ghost" onClick={exportSBOM}>SBOM ⬇</Btn>
          <Btn variant="primary" onClick={exportExposure}>Exposure Report ↗</Btn>
        </>}
      />

      {/* Exposure summary stats (from former Exposure Reports) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
        <Stat icon="▲" label="Critical CVEs"   value={cves.filter(c => c.severity === "CRITICAL").length} accent="var(--red)" />
        <Stat icon="◆" label="High CVEs"       value={cves.filter(c => c.severity === "HIGH").length} accent="var(--orange)" />
        <Stat icon="◷" label="Total Scans"     value={scanHistory.length} accent="var(--accent)" />
        <Stat icon="◈" label="Total Packages"  value={cves.reduce((a, c) => a + (c.nodes?.length || 0), 0)} accent="var(--purple)" />
      </div>

      {/* Bar chart from Exposure Reports */}
      <Card style={{ marginBottom: 14 }}>
        <CardHead title="Packages Affected per CVE" sub="exposure overview" />
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="id" tick={{ fill: "var(--muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--bg3)", border: "1px solid var(--brd2)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 11 }} />
            <Bar dataKey="pkgs" name="Packages" radius={[5, 5, 0, 0]}>
              {chartData.map((d, i) => <Cell key={i} fill={SEV_COLORS[d.sev] || "var(--accent)"} fillOpacity={0.88} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* View toggle: Packages vs Exposure CVE table */}
      <div style={{
        display: "inline-flex", gap: 2, padding: 3,
        background: "var(--bg2)", borderRadius: 10, border: "1px solid var(--border)",
        marginBottom: 12,
      }}>
        {[
          { id: "packages", label: "All Packages", icon: "▤" },
          { id: "exposure", label: "Full Exposure (CVE)", icon: "◈" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            style={{
              padding: "7px 16px", borderRadius: 7, fontSize: 11.5, fontWeight: 500,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
              color: view === t.id ? "#fff" : "var(--muted)",
              background: view === t.id ? "var(--bg3)" : "transparent",
              border: `1px solid ${view === t.id ? "var(--brd3)" : "transparent"}`,
            }}
          >
            <span style={{ fontSize: 12 }}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {view === "packages" ? (
        <>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 280px" }}>
                <Input icon="⌕" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by package name or repository…" />
              </div>
              <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--brd2)" }}>
                {ECOS.map(e => (
                  <button key={e} onClick={() => setEco(e)} style={{
                    padding: "6px 13px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                    background: eco === e ? "var(--bg4)" : "transparent",
                    border: "none", cursor: "pointer",
                    color: eco === e ? "#fff" : "var(--muted)",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>{e}</button>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHead title="All Scanned Packages" sub={`${filtered.length} of ${pkgs.length} packages`} right={<Btn size="sm" variant="ghost" onClick={exportSBOM}>Export SBOM ⬇</Btn>} />
            {filtered.length === 0 ? (
              <EmptyState icon="▤" title="No matching packages" hint="Try a different query or switch to 'All' ecosystems." />
            ) : (
              <Table
                heads={[
                  sortable("Package", "name"),
                  sortable("Ecosystem", "ecosystem"),
                  "Version",
                  sortable("CVE", "cve"),
                  sortable("CVSS", "cvss"),
                  "Severity",
                  sortable("Fix Available", "fixAvailable"),
                ]}
                rows={filtered.map((p, i) => (
                  <tr key={i} style={{ cursor: "pointer" }} onClick={() => onScanSelect(p.cve)}>
                    <Td mono accent="#fff">{p.name}</Td>
                    <Td><Tag>{p.ecosystem || "npm"}</Tag></Td>
                    <Td mono style={{ fontSize: 11 }}>v{p.version}</Td>
                    <Td mono accent="var(--accent2)" style={{ fontSize: 11 }}>{p.cve}</Td>
                    <Td mono accent={p.cvss >= 9 ? "var(--red)" : p.cvss >= 7 ? "var(--orange)" : "var(--yellow)"} style={{ fontWeight: 700 }}>{p.cvss}</Td>
                    <Td><Badge sev={p.severity} /></Td>
                    <Td>
                      {p.fixAvailable ? (
                        <Tag bg="rgba(34,197,94,0.12)" color="var(--green)" border="rgba(34,197,94,0.3)">✓ {p.fixedVersion}</Tag>
                      ) : (
                        <Tag bg="var(--rdglow)" color="var(--red)" border="rgba(239,68,68,0.3)">✕ none</Tag>
                      )}
                    </Td>
                  </tr>
                ))}
              />
            )}
          </Card>
        </>
      ) : (
        <Card>
          <CardHead title="Full Exposure Report" sub={`${cves.length} CVEs`} />
          <Table heads={["CVE", "Root Package", "CVSS", "Affected Pkgs", "Ecosystem", "Severity", "Published"]}
            rows={cves.map((c, i) => (
              <tr key={i} style={{ cursor: "pointer" }} onClick={() => onScanSelect(c.id)}>
                <Td mono accent="var(--accent2)">{c.id}</Td>
                <Td mono accent="#fff">{c.affectedPackage}</Td>
                <Td mono accent={c.cvssScore >= 9 ? "var(--red)" : "var(--orange)"} style={{ fontWeight: 700 }}>{c.cvssScore}</Td>
                <Td>{c.nodes?.length || 0} pkgs</Td>
                <Td><Tag>{c.ecosystem}</Tag></Td>
                <Td><Badge sev={c.severity} /></Td>
                <Td style={{ fontSize: 11 }}>{c.publishedDate}</Td>
              </tr>
            ))}
          />
        </Card>
      )}
    </PageWrap>
  );
}
