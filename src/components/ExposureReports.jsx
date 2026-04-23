import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Card, CardHead, Badge, Btn, PageWrap, PageHeader, Stat, Table, Td, Tag, downloadCSV, downloadFile, useToast } from "./ui";

const SEV_COLORS = { CRITICAL: "var(--red)", HIGH: "var(--orange)", MEDIUM: "var(--blue)", LOW: "var(--green)" };

export default function ExposureReports({ cveCache, scanHistory }) {
  const cves = Object.values(cveCache);
  const chartData = cves.map(c => ({ id: c.id.slice(-5), pkgs: c.nodes?.length || 0, sev: c.severity }));
  const { push } = useToast();

  const exportCSV = () => {
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

  const exportJSON = () => {
    downloadFile("ripplealert-exposure.json", JSON.stringify({ cves, scanHistory }, null, 2), "application/json");
    push({ type: "success", message: "Exposure report exported as JSON" });
  };

  return (
    <PageWrap>
      <PageHeader icon="◈" title="Exposure Reports" sub="Full vulnerability exposure across every scan"
        right={<>
          <Btn onClick={exportJSON}>Export JSON</Btn>
          <Btn variant="primary" onClick={exportCSV}>Export CSV ↗</Btn>
        </>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
        <Stat icon="▲" label="Critical CVEs"   value={cves.filter(c => c.severity === "CRITICAL").length} accent="var(--red)" />
        <Stat icon="◆" label="High CVEs"       value={cves.filter(c => c.severity === "HIGH").length} accent="var(--orange)" />
        <Stat icon="◷" label="Total Scans"     value={scanHistory.length} accent="var(--accent)" />
        <Stat icon="◈" label="Total Packages"  value={cves.reduce((a, c) => a + (c.nodes?.length || 0), 0)} accent="var(--purple)" />
      </div>

      <Card style={{ marginBottom: 14 }}>
        <CardHead title="Packages Affected per CVE" />
        <ResponsiveContainer width="100%" height={190}>
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

      <Card>
        <CardHead title="Full Exposure Report" sub={`${cves.length} CVEs`} />
        <Table heads={["CVE", "Root Package", "CVSS", "Affected Pkgs", "Ecosystem", "Severity", "Published"]}
          rows={cves.map((c, i) => (
            <tr key={i}>
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
    </PageWrap>
  );
}
