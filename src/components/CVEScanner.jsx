import { useState } from "react";
import { Card, CardHead, Btn, Badge, PageWrap, PageHeader, Spinner, Table, Td, Tag, Input, useToast, EmptyState } from "./ui";
import { runCveScan, runRepoScan } from "../utils/scanRunner";

const QUICK = ["CVE-2021-44228", "CVE-2022-22965"];

const TABS = [
  { id: "cve",      label: "CVE ID",         icon: "🛡" },
  { id: "repo",     label: "Repository URL", icon: "🔗" },
  { id: "combined", label: "Combined",       icon: "⊕" },
];

export default function CVEScanner({ cveCache, onScanComplete, onAddWatchlist }) {
  const [mode, setMode]       = useState("cve");
  const [cveInput, setCveInput] = useState("");
  const [repoInput, setRepoInput] = useState("");
  const [manifest, setManifest] = useState("Auto-detect");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [result, setResult]   = useState(null);
  const [repoResult, setRepoResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const { push } = useToast();

  // Animate the progress bar smoothly while a real fetch is in flight.
  const startProgress = () => {
    setProgress(5);
    let p = 5;
    const t = setInterval(() => {
      p = Math.min(p + Math.random() * 8, 92);
      setProgress(Math.round(p));
    }, 220);
    return () => { clearInterval(t); setProgress(100); };
  };

  // Try the live API; fall back to the cache so the demo never breaks.
  async function safeRunCve(id) {
    try {
      setStage("Fetching NVD metadata…");
      const live = await runCveScan(id);
      return { data: live, source: "live" };
    } catch (err) {
      // Cache fallback only for "network" or "not found" — surface bad input
      if (err.code === "BAD_INPUT") throw err;
      const cached = cveCache[id.toUpperCase()];
      if (cached) {
        push({ type: "warn", message: `Live NVD lookup failed (${err.message}). Using cached copy.` });
        return { data: cached, source: "cache" };
      }
      throw err;
    }
  }

  const runScan = async (overrideId) => {
    setLoading(true); setError(""); setErrorCode(""); setResult(null); setRepoResult(null);
    const stop = startProgress();

    try {
      if (mode === "cve" || (mode === "combined" && cveInput.trim() && !repoInput.trim())) {
        const id = (overrideId || cveInput).trim().toUpperCase();
        if (!id) throw Object.assign(new Error("Enter a CVE id."), { code: "BAD_INPUT" });
        const { data, source } = await safeRunCve(id);
        setResult(data);
        setRepoResult(null);
        push({ type: "success", title: `Analysis ready (${source})`, message: `${data.id} · ${data.nodes?.length || 0} packages` });
      }
      else if (mode === "repo") {
        const url = (overrideId || repoInput).trim();
        if (!url) throw Object.assign(new Error("Enter a repository URL."), { code: "BAD_INPUT" });
        setStage("Fetching repository manifest…");
        const knownCves = Object.values(cveCache);
        const repo = await runRepoScan(url, knownCves);
        setResult(repo);
        setRepoResult(repo);
        push({ type: "success", title: "Repo scan complete", message: `${repo.repoCounts?.total || 0} deps · ${repo.repoFindings?.length || 0} findings` });
      }
      else if (mode === "combined") {
        const id  = cveInput.trim().toUpperCase();
        const url = repoInput.trim();
        if (!id && !url) throw Object.assign(new Error("Enter a CVE id and/or repo URL."), { code: "BAD_INPUT" });
        const [cveRes, repoRes] = await Promise.allSettled([
          id  ? safeRunCve(id)                            : Promise.resolve(null),
          url ? runRepoScan(url, Object.values(cveCache)) : Promise.resolve(null),
        ]);
        const cveOk  = cveRes.status  === "fulfilled" ? cveRes.value?.data : null;
        const repoOk = repoRes.status === "fulfilled" ? repoRes.value      : null;
        if (!cveOk && !repoOk) throw new Error("Both CVE and repo lookups failed.");
        setResult(cveOk || repoOk);
        setRepoResult(repoOk || cveOk);
        push({ type: "success", title: "Combined analysis ready", message: `${cveOk ? cveOk.id : ""}${cveOk && repoOk ? " · " : ""}${repoOk ? "repo match" : ""}` });
      }
    } catch (err) {
      setError(err.message || "Scan failed.");
      setErrorCode(err.code || "");
    } finally {
      stop(); setStage(""); setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") runScan(); };

  const cveInputBlock = (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <Input
            icon="⌕"
            value={cveInput}
            onChange={e => setCveInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="CVE-2021-44228"
            style={{ fontFamily: "var(--font-mono)" }}
          />
        </div>
        {mode !== "combined" && (
          <Btn onClick={() => runScan()} variant="primary" size="lg" disabled={loading}>
            {loading ? <><Spinner color="#fff" /> Analyzing…</> : <>Analyze <span>→</span></>}
          </Btn>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>Quick load:</span>
        {QUICK.map(id => (
          <button
            key={id}
            onClick={() => { setCveInput(id); if (mode !== "combined") runScan(id); }}
            style={{
              fontSize: 10.5, padding: "4px 11px", borderRadius: 20,
              background: "var(--rdglow)", color: "var(--red)",
              border: "1px solid rgba(239,68,68,0.3)",
              fontFamily: "var(--font-mono)", fontWeight: 500, cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.2)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--rdglow)"}
          >{id}</button>
        ))}
      </div>
    </>
  );

  const repoInputBlock = (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <Input
            icon="🔗"
            value={repoInput}
            onChange={e => setRepoInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="https://github.com/elastic/elasticsearch"
          />
        </div>
        <select value={manifest} onChange={e => setManifest(e.target.value)} style={{ padding: "9px 32px 9px 12px", fontSize: 12, borderRadius: 6 }}>
          <option>Auto-detect</option>
          <option>package.json (npm)</option>
          <option>requirements.txt (PyPI)</option>
          <option>pom.xml (Maven)</option>
        </select>
        {mode !== "combined" && (
          <Btn onClick={() => runScan()} variant="primary" size="lg" disabled={loading}>
            {loading ? <><Spinner color="#fff" /> Scanning…</> : <>Scan Repo →</>}
          </Btn>
        )}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--muted)" }}>
        Supports <Tag>github.com</Tag> · Fetches manifest → checks NVD → builds propagation map
      </div>
    </>
  );

  return (
    <PageWrap>
      <PageHeader icon="⌖" title="Vulnerability Scanner" sub="Analyze CVEs, repositories, or both at once against the NVD corpus"
        right={result && <Btn onClick={() => onScanComplete(result, mode === "cve" ? "CVE" : mode === "repo" ? "Repo" : "Combined")} variant="primary">View Graph →</Btn>}
      />

      {/* Mode tabs */}
      <div style={{
        display: "inline-flex", gap: 2, padding: 3,
        background: "var(--bg2)", borderRadius: 10, border: "1px solid var(--border)",
        marginBottom: 16,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setMode(tab.id); setResult(null); setRepoResult(null); setError(""); }}
            style={{
              padding: "8px 18px", borderRadius: 7, fontSize: 12, fontWeight: 500,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
              color: mode === tab.id ? "#fff" : "var(--muted)",
              background: mode === tab.id ? "var(--bg3)" : "transparent",
              border: `1px solid ${mode === tab.id ? "var(--brd3)" : "transparent"}`,
              transition: "all 0.15s",
              boxShadow: mode === tab.id ? "var(--shadow-sm)" : "none",
            }}
          >
            <span style={{ fontSize: 12 }}>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <Card style={{ marginBottom: 14 }}>
        {mode === "combined" ? (
          <>
            <CardHead title="Combined Analysis" sub="Provide a CVE ID, a repository URL, or both — results stack below" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, marginBottom: 7 }}>CVE Identifier</div>
                {cveInputBlock}
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, marginBottom: 7 }}>Repository URL</div>
                {repoInputBlock}
              </div>
            </div>
            <Btn onClick={() => runScan()} variant="primary" size="lg" disabled={loading} style={{ width: "100%" }}>
              {loading ? <><Spinner color="#fff" /> Running combined analysis…</> : <>Run Combined Scan →</>}
            </Btn>
          </>
        ) : (
          <>
            <CardHead title={mode === "cve" ? "Enter CVE Identifier" : "Enter Repository URL"} sub={mode === "cve" ? "Format: CVE-YYYY-NNNNN" : "Supports GitHub repositories"} />
            {mode === "cve" ? cveInputBlock : repoInputBlock}
          </>
        )}

        {loading && (
          <div style={{ marginTop: 14, fontSize: 11, color: "var(--muted)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span>{stage || (progress < 40 ? "Fetching NVD metadata…" : progress < 80 ? "Traversing dependency tree…" : "Computing blast radius…")}</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>{progress}%</span>
            </div>
            <div style={{ height: 4, background: "var(--bg3)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,var(--accent),var(--accent2))", transition: "width 0.2s" }} />
            </div>
          </div>
        )}
      </Card>

      {error && (
        <div style={{
          padding: "11px 14px", background: "var(--rdglow)",
          border: "1px solid rgba(239,68,68,0.28)", borderRadius: 9,
          fontSize: 12, color: "var(--red)", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between",
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14 }}>✕</span>
            <span>{error}{errorCode ? ` (${errorCode})` : ""}</span>
          </span>
          <Btn onClick={() => runScan()} size="sm" variant="subtle">Retry</Btn>
        </div>
      )}

      {!result && !loading && !error && (
        <Card>
          <EmptyState
            icon="⌖"
            title="No active analysis"
            hint={mode === "combined"
              ? "Enter a CVE id and/or a repository URL above and run a combined scan."
              : "Enter a CVE identifier or paste a repository URL above. Try the quick-load chips to see the Log4Shell or Spring4Shell blast radius."}
          />
        </Card>
      )}

      {result && (
        <div className="fade-up">
          {/* CVE Banner */}
          <div style={{
            display: "flex", alignItems: "center", gap: 18,
            padding: "16px 20px", borderRadius: 12,
            background: "linear-gradient(135deg, var(--rdglow) 0%, rgba(239,68,68,0.05) 100%)",
            border: "1px solid rgba(239,68,68,0.25)", marginBottom: 14,
            boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              width: 72, height: 72, borderRadius: 14,
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.28)",
            }}>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 700, color: "var(--red)", lineHeight: 1 }}>{result.cvssScore || "—"}</div>
              <div style={{ fontSize: 8.5, color: "var(--muted)", letterSpacing: "0.12em", marginTop: 4 }}>CVSS</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", fontFamily: "var(--font-mono)" }}>{result.id}</div>
                <Badge sev={result.severity} />
                <Tag>{result.ecosystem}</Tag>
                <Tag>{result.affectedPackage}</Tag>
                {result.attackVector && <Tag>vector: {result.attackVector}</Tag>}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text2)", lineHeight: 1.55 }}>{result.description?.slice(0, 220)}{result.description?.length > 220 ? "…" : ""}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              <Btn onClick={() => onAddWatchlist(result.id)} variant="accent" size="sm">+ Watchlist</Btn>
              <Btn onClick={() => window.open(result.nvdUrl || `https://nvd.nist.gov/vuln/detail/${result.id}`, "_blank")} variant="subtle" size="sm">View on NVD ↗</Btn>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Card>
              <CardHead title="CVE Intelligence" sub="NVD metadata" />
              <Table heads={["Field", "Value"]} rows={[
                <tr key="id"><Td style={{color:"var(--muted)",fontSize:10,width:120}}>CVE ID</Td><Td mono accent="var(--accent2)">{result.id}</Td></tr>,
                <tr key="pkg"><Td style={{color:"var(--muted)",fontSize:10}}>Package</Td><Td mono accent="#fff">{result.affectedPackage}</Td></tr>,
                <tr key="eco"><Td style={{color:"var(--muted)",fontSize:10}}>Ecosystem</Td><Td><Tag>{result.ecosystem}</Tag></Td></tr>,
                <tr key="cvss"><Td style={{color:"var(--muted)",fontSize:10}}>CVSS Score</Td><Td mono accent="var(--red)" style={{fontWeight:700}}>{result.cvssScore} / 10</Td></tr>,
                <tr key="sev"><Td style={{color:"var(--muted)",fontSize:10}}>Severity</Td><Td><Badge sev={result.severity} /></Td></tr>,
                <tr key="ver"><Td style={{color:"var(--muted)",fontSize:10}}>Affected</Td><Td mono style={{fontSize:11,color:"var(--red)"}}>{result.affectedVersionRange}</Td></tr>,
                <tr key="fix"><Td style={{color:"var(--muted)",fontSize:10}}>Fixed</Td><Td mono style={{fontSize:11,color:"var(--green)"}}>{result.fixedVersion || "—"}</Td></tr>,
                <tr key="date"><Td style={{color:"var(--muted)",fontSize:10}}>Published</Td><Td>{result.publishedDate}</Td></tr>,
              ]} />
            </Card>

            <Card>
              <CardHead title="Exposure Summary" sub="blast radius overview" />
              <div style={{
                padding: "16px 18px",
                background: "var(--rdglow)", border: "1px solid rgba(239,68,68,0.18)",
                borderRadius: 10, marginBottom: 12,
                display: "flex", alignItems: "flex-end", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 32, fontWeight: 700, color: "var(--red)", lineHeight: 1 }}>{result.nodes?.length || 0}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Total packages in blast radius</div>
                </div>
                <Badge sev={result.severity} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Direct (L1)", color: "var(--red)",    count: result.nodes?.filter(n => n.level === 1).length || 0 },
                  { label: "1 Hop (L2)",  color: "var(--orange)", count: result.nodes?.filter(n => n.level === 2).length || 0 },
                  { label: "2 Hops (L3)", color: "var(--blue)",   count: result.nodes?.filter(n => n.level === 3).length || 0 },
                ].map((s, i) => (
                  <div key={i} style={{ padding: "12px 10px", background: "var(--bg3)", borderRadius: 9, border: "1px solid var(--border)", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 700, color: s.color }}>{s.count}</div>
                    <div style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 3, letterSpacing: "0.06em" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <Btn onClick={() => onScanComplete(result, mode === "cve" ? "CVE" : mode === "repo" ? "Repo" : "Combined")} variant="primary" style={{ width: "100%", padding: "10px" }}>
                View Propagation Graph →
              </Btn>
            </Card>
          </div>

          {result.affectedProjects?.length > 0 && (
            <Card style={{ marginTop: 14 }}>
              <CardHead title="Affected Downstream Projects" sub={`${result.affectedProjects.length} packages`} />
              <Table
                heads={["Package", "Repository", "Version", "Type", "Severity"]}
                rows={result.affectedProjects.map((p, i) => (
                  <tr key={i}>
                    <Td mono accent="#fff">{p.name}</Td>
                    <Td>
                      <a href={`https://github.com/${p.repo}`} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, color: "var(--blue)", textDecoration: "none" }}
                      >{p.repo} ↗</a>
                    </Td>
                    <Td mono style={{ fontSize: 11 }}>v{p.version}</Td>
                    <Td>
                      <Tag
                        bg={p.dependencyType === "direct" ? "var(--rdglow)" : "var(--bg3)"}
                        color={p.dependencyType === "direct" ? "var(--red)" : "var(--muted)"}
                        border={p.dependencyType === "direct" ? "rgba(239,68,68,0.3)" : "var(--brd2)"}
                      >{p.dependencyType}</Tag>
                    </Td>
                    <Td><Badge sev={p.severity} /></Td>
                  </tr>
                ))}
              />
            </Card>
          )}

          {/* Repo result section — shows whenever repoResult is set */}
          {repoResult && (
            <Card style={{ marginTop: 14 }}>
              <CardHead
                title="Repository URL Scan Result"
                sub={repoResult.manifestFile ? `Parsed ${repoResult.manifestFile} from ${repoResult.repoUrl || "—"}` : "auto-derived from CVE affected projects"}
                right={<Tag bg="var(--acglow)" color="var(--accent2)" border="var(--acline)">🔗 repo scan</Tag>}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
                {[
                  { label: "Total deps",      val: repoResult.repoCounts?.total ?? new Set((repoResult.affectedProjects || []).map(p => p.repo)).size, color: "var(--text)" },
                  { label: "Critical/High",   val: (repoResult.repoCounts?.critical || 0) + (repoResult.repoCounts?.high || 0), color: "var(--red)" },
                  { label: "Findings",        val: repoResult.repoFindings?.length ?? (repoResult.affectedProjects || []).length, color: "var(--orange)" },
                  { label: "Suggested fix",   val: repoResult.fixedVersion || "—", color: "var(--green)", mono: true },
                ].map((s, i) => (
                  <div key={i} style={{ padding: "12px 12px", background: "var(--bg3)", borderRadius: 9, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 9.5, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color, marginTop: 4, fontFamily: s.mono ? "var(--font-mono)" : "var(--font-sans)" }}>{s.val}</div>
                  </div>
                ))}
              </div>
              {repoResult.repoFindings?.length > 0 ? (
                <Table
                  heads={["Dependency", "Installed", "Safe version", "CVE", "Severity"]}
                  rows={repoResult.repoFindings.map((f, i) => (
                    <tr key={i}>
                      <Td mono accent="#fff">{f.name}</Td>
                      <Td mono style={{ fontSize: 11, color: "var(--red)" }}>v{f.installedVersion}</Td>
                      <Td mono style={{ fontSize: 11, color: "var(--green)" }}>{f.safeVersion || "—"}</Td>
                      <Td mono style={{ fontSize: 11 }}>{f.cveId}</Td>
                      <Td><Badge sev={f.severity} /></Td>
                    </tr>
                  ))}
                />
              ) : repoResult.affectedProjects?.length > 0 ? (
                <Table
                  heads={["Repository", "Detected dependency", "Pinned version", "Action"]}
                  rows={repoResult.affectedProjects.map((p, i) => (
                    <tr key={i}>
                      <Td>
                        <a href={`https://github.com/${p.repo}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, color: "var(--blue)", textDecoration: "none", fontFamily: "var(--font-mono)" }}
                        >github.com/{p.repo} ↗</a>
                      </Td>
                      <Td mono accent="#fff">{p.name}</Td>
                      <Td mono style={{ fontSize: 11, color: "var(--red)" }}>v{p.version}</Td>
                      <Td><Tag bg="var(--acglow)" color="var(--accent2)" border="var(--acline)">upgrade → {repoResult.fixedVersion || "?"}</Tag></Td>
                    </tr>
                  ))}
                />
              ) : (
                <EmptyState icon="✓" title="No vulnerable dependencies found" hint="None of the loaded CVEs apply to this manifest." />
              )}
            </Card>
          )}
        </div>
      )}
    </PageWrap>
  );
}
