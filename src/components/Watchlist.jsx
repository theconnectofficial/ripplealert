import { useState } from "react";
import { Card, CardHead, Badge, Btn, PageWrap, PageHeader, Tag, Modal, Input, useToast, EmptyState } from "./ui";

export default function Watchlist({ watchlist, cveCache, watchlistData = {}, onRemove, onScanSelect, onAdd }) {
  const [addOpen, setAddOpen] = useState(false);
  const [newId, setNewId] = useState("");
  const { push } = useToast();

  const submitAdd = () => {
    const id = newId.trim().toUpperCase();
    if (!/^CVE-\d{4}-\d{3,}$/.test(id)) { push({ type: "warn", message: "Enter a valid CVE identifier (CVE-YYYY-NNNNN)" }); return; }
    onAdd(id);
    setNewId(""); setAddOpen(false);
  };

  const hasCritical = watchlist.some(id => cveCache[id]?.severity === "CRITICAL");

  return (
    <PageWrap>
      <PageHeader icon="◎" title="Watchlist" sub={`${watchlist.length} tracked CVEs · auto-refresh enabled`}
        right={<Btn variant="primary" onClick={() => setAddOpen(true)}>+ Add CVE</Btn>}
      />

      {hasCritical && (
        <div style={{
          display: "flex", alignItems: "center", gap: 11,
          padding: "12px 16px", background: "var(--rdglow)",
          border: "1px solid rgba(239,68,68,0.28)", borderRadius: 10,
          marginBottom: 14, fontSize: 12.5, color: "var(--red)",
        }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <div>
            <strong>Critical CVE on watchlist</strong>
            <span style={{ color: "var(--text2)", marginLeft: 8 }}>New downstream packages may have been affected since last scan</span>
          </div>
          <Btn variant="danger" size="sm" style={{ marginLeft: "auto" }} onClick={() => push({ type: "info", message: "Refreshing all tracked CVEs…" })}>Rescan All</Btn>
        </div>
      )}

      {watchlist.length === 0 ? (
        <Card>
          <EmptyState
            icon="◎"
            title="Watchlist is empty"
            hint="Add CVEs you want to track for downstream impact. Watchlist entries can auto-refresh in the background."
            action={<Btn variant="primary" onClick={() => setAddOpen(true)}>+ Add your first CVE</Btn>}
          />
        </Card>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}>
          {watchlist.map(id => {
            const live = watchlistData[id];
            const c = live ? { ...(cveCache[id] || {}), ...live } : cveCache[id];
            const sev = c?.severity || "UNKNOWN";
            const sevColor = sev === "CRITICAL" ? "var(--red)" : sev === "HIGH" ? "var(--orange)" : sev === "MEDIUM" ? "var(--blue)" : "var(--muted)";
            const newDeps  = live?.newDeps?.length ?? 0;
            const lastCheckedLabel = live?.lastChecked
              ? `last checked · ${Math.max(1, Math.round((Date.now() - live.lastChecked) / 60000))} min ago`
              : "awaiting first check…";

            if (!c) {
              return (
                <Card key={id} style={{ borderColor: "var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--accent2)" }}>{id}</div>
                    <Tag>not cached</Tag>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5, flex: 1 }}>
                    Run the fetch script to backfill metadata for this CVE.
                  </div>
                  <Btn onClick={() => onRemove(id)} variant="danger" size="sm">Remove</Btn>
                </Card>
              );
            }

            return (
              <div
                key={id}
                onClick={() => onScanSelect(id)}
                className="hover-raise"
                style={{
                  position: "relative",
                  background: "var(--bg2)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 14,
                  cursor: "pointer",
                  display: "flex", flexDirection: "column", gap: 11,
                  transition: "all 0.15s",
                }}
              >
                {/* Top accent bar */}
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                  background: sevColor, borderRadius: "12px 0 0 12px",
                  boxShadow: `0 0 10px ${sevColor}`,
                }} />

                {/* Header: CVE id + severity */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--accent2)" }}>{c.id}</div>
                    <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 3, fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.affectedPackage}
                    </div>
                  </div>
                  <Badge sev={sev} size="sm" />
                </div>

                {/* CVSS + ecosystem */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 10,
                    background: "var(--bg3)", border: `1px solid ${sevColor}33`,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: sevColor, lineHeight: 1, fontFamily: "var(--font-sans)" }}>{c.cvssScore}</div>
                    <div style={{ fontSize: 7.5, color: "var(--muted)", letterSpacing: "0.1em", marginTop: 2 }}>CVSS</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Tag>{c.ecosystem}</Tag>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>{lastCheckedLabel}</div>
                  </div>
                </div>

                {/* New deps signal */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 10px", borderRadius: 8,
                  background: newDeps > 0 ? "var(--rdglow)" : "var(--bg3)",
                  border: `1px solid ${newDeps > 0 ? "rgba(239,68,68,0.2)" : "var(--border)"}`,
                }}>
                  <span style={{ fontSize: 10.5, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>New downstream deps</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: newDeps > 0 ? "var(--red)" : "var(--muted)", fontFamily: "var(--font-mono)" }}>{newDeps > 0 ? `+${newDeps}` : "0"}</span>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
                  <Btn size="sm" variant="ghost" onClick={e => { e.stopPropagation(); onScanSelect(id); }} style={{ flex: 1 }}>View graph →</Btn>
                  <Btn size="sm" variant="danger" onClick={e => { e.stopPropagation(); onRemove(id); }}>Remove</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add CVE to Watchlist"
        sub="Track a CVE identifier for continuous downstream impact monitoring"
        footer={<>
          <Btn onClick={() => setAddOpen(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={submitAdd}>Add to Watchlist</Btn>
        </>}
      >
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 7 }}>CVE Identifier</div>
        <Input
          icon="⌕"
          value={newId}
          onChange={e => setNewId(e.target.value)}
          placeholder="CVE-2024-00001"
          onKeyDown={e => { if (e.key === "Enter") submitAdd(); }}
          style={{ fontFamily: "var(--font-mono)" }}
        />
        <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
          The CVE will be tracked and auto-refreshed hourly (if enabled). CVEs outside the local cache can still be added; run the <code>npm run cache</code> script to backfill their dependency data.
        </div>
      </Modal>
    </PageWrap>
  );
}
