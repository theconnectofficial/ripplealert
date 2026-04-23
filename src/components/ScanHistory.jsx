import { useMemo, useState } from "react";
import { Card, CardHead, Badge, Btn, PageWrap, PageHeader, Table, Td, Tag, Input, EmptyState, Modal, downloadCSV, useToast } from "./ui";

export default function ScanHistory({ history, onSelect, onClear }) {
  const [query, setQuery] = useState("");
  const [mode, setMode]   = useState("all");
  const [confirmClear, setConfirmClear] = useState(false);
  const { push } = useToast();

  const filtered = useMemo(() => history.filter(h =>
    (!query || (h.target || h.cveId || h.id || "").toLowerCase().includes(query.toLowerCase())) &&
    (mode === "all" || (h.type || "").toLowerCase() === mode)
  ), [history, query, mode]);

  const fmtTs = (ts) => {
    const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
    return isNaN(d.getTime()) ? String(ts) : d.toLocaleString("en-IN", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const exportCSV = () => {
    if (!filtered.length) return;
    downloadCSV("ripplealert-scan-history.csv",
      ["Target", "Type", "Timestamp", "Packages Found", "Issues Drafted", "Duration", "Status"],
      filtered.map(h => [h.target || h.cveId || h.id, h.type, fmtTs(h.timestamp), h.packagesFound, h.issuesDrafted, h.duration, h.status])
    );
    push({ type: "success", message: `Exported ${filtered.length} runs to CSV` });
  };

  return (
    <PageWrap>
      <PageHeader icon="◷" title="Scan History" sub={`${history.length} scan runs · persisted across sessions`}
        right={<>
          <Btn onClick={exportCSV} disabled={!filtered.length}>Export CSV</Btn>
          <Btn variant="danger" disabled={!history.length} onClick={() => setConfirmClear(true)}>Clear All</Btn>
        </>}
      />

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px" }}>
            <Input icon="⌕" value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter by CVE ID…" />
          </div>
          <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--brd2)" }}>
            {["all", "cve", "repo"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: "6px 13px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                background: mode === m ? "var(--bg4)" : "transparent",
                border: "none", cursor: "pointer",
                color: mode === m ? "#fff" : "var(--muted)",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>{m}</button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHead title="Scan Runs" sub={`${filtered.length} of ${history.length}`} />
        {filtered.length === 0 ? (
          <EmptyState icon="◷" title="No scan runs yet" hint="Every CVE or repository scan is logged here automatically with timing metrics." />
        ) : (
          <Table heads={["Target", "Type", "Timestamp", "Pkgs Found", "Issues Drafted", "Duration", "Status"]}
            rows={filtered.map((h, i) => (
              <tr key={h.id || i} style={{ cursor: "pointer" }} onClick={() => onSelect(h.cveId || h.target || h.id)}>
                <Td mono accent="var(--accent2)">{h.target || h.cveId || h.id}</Td>
                <Td>
                  <Tag
                    bg={h.type === "Repo" ? "var(--acglow)" : "var(--bg3)"}
                    color={h.type === "Repo" ? "var(--accent2)" : "var(--muted)"}
                    border={h.type === "Repo" ? "var(--acline)" : "var(--brd2)"}
                  >{h.type || "CVE"}</Tag>
                </Td>
                <Td style={{ fontSize: 11 }}>{fmtTs(h.timestamp)}</Td>
                <Td style={{ fontWeight: 600, color: h.packagesFound > 100 ? "var(--red)" : "var(--text)" }}>{h.packagesFound}</Td>
                <Td>{h.issuesDrafted}</Td>
                <Td mono style={{ fontSize: 11 }}>{h.duration}</Td>
                <Td>
                  <Tag bg="var(--ggglow)" color="var(--green)" border="rgba(34,197,94,0.3)">{h.status}</Tag>
                </Td>
              </tr>
            ))}
          />
        )}
      </Card>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear scan history?"
        sub="This removes all recorded scan runs from local storage. It cannot be undone."
        footer={<>
          <Btn onClick={() => setConfirmClear(false)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => { onClear(); setConfirmClear(false); }}>Clear All</Btn>
        </>}
      >
        <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.6 }}>
          {history.length} scan {history.length === 1 ? "run" : "runs"} will be deleted. Cached CVE data, watchlist, and settings are not affected.
        </div>
      </Modal>
    </PageWrap>
  );
}
