import { useState, useEffect, useRef } from "react";
import { Card, CardHead, Btn, Badge, PageWrap, PageHeader, Spinner, useToast, EmptyState, downloadFile } from "./ui";
import { generatePatchIssue } from "../utils/geminiApi";

// Lightweight markdown → JSX (headings, bold, inline code, code blocks, lists)
function renderMarkdown(md) {
  if (!md) return null;
  const lines = md.split("\n");
  const out = [];
  let buf = [];
  let inCode = false;
  let listBuf = [];

  const flushList = () => {
    if (listBuf.length) {
      out.push(<ul key={`ul-${out.length}`} style={{ margin: "6px 0 10px 18px", padding: 0 }}>
        {listBuf.map((li, i) => <li key={i} style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, marginBottom: 3 }}>{inline(li)}</li>)}
      </ul>);
      listBuf = [];
    }
  };
  const inline = (s) => {
    const parts = [];
    let rest = s, k = 0;
    const push = (node) => parts.push(<span key={k++}>{node}</span>);
    while (rest.length) {
      const m = rest.match(/`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/);
      if (!m) { push(rest); break; }
      if (m.index > 0) push(rest.slice(0, m.index));
      if (m[1]) parts.push(<code key={k++} style={{ background: "var(--bg4)", padding: "1px 5px", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent2)" }}>{m[1]}</code>);
      else if (m[2]) parts.push(<strong key={k++} style={{ color: "#fff" }}>{m[2]}</strong>);
      else if (m[3]) parts.push(<a key={k++} href={m[4]} target="_blank" rel="noreferrer" style={{ color: "var(--blue)" }}>{m[3]}</a>);
      rest = rest.slice(m.index + m[0].length);
    }
    return parts;
  };

  lines.forEach((line, i) => {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        out.push(<pre key={`code-${i}`} style={{ background: "var(--bg4)", border: "1px solid var(--border)", borderRadius: 7, padding: "10px 12px", fontSize: 11, overflow: "auto", margin: "8px 0", fontFamily: "var(--font-mono)", color: "var(--text)" }}>{buf.join("\n")}</pre>);
        buf = []; inCode = false;
      } else { flushList(); inCode = true; }
      return;
    }
    if (inCode) { buf.push(line); return; }
    if (/^#{1,3}\s/.test(line)) {
      flushList();
      const level = line.match(/^(#+)/)[1].length;
      const size = level === 1 ? 17 : level === 2 ? 14.5 : 13;
      out.push(<div key={i} style={{ fontSize: size, fontWeight: 700, color: "#fff", marginTop: 12, marginBottom: 6 }}>{inline(line.replace(/^#+\s*/, ""))}</div>);
      return;
    }
    if (/^\s*[-*]\s+/.test(line)) { listBuf.push(line.replace(/^\s*[-*]\s+/, "")); return; }
    flushList();
    if (line.trim() === "") { out.push(<div key={i} style={{ height: 6 }} />); return; }
    out.push(<div key={i} style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, marginBottom: 4 }}>{inline(line)}</div>);
  });
  flushList();
  if (buf.length) out.push(<pre key="code-end" style={{ background: "var(--bg4)", padding: 10, fontSize: 11 }}>{buf.join("\n")}</pre>);
  return out;
}

export default function AIRemediation({ cveData, settings }) {
  const [generating, setGenerating] = useState({});
  const [issues, setIssues]         = useState({});
  const [copied, setCopied]         = useState(null);
  const [activeIssue, setActiveIssue] = useState(null);
  const [view, setView] = useState("preview"); // preview | markdown
  const [cliCopied, setCliCopied] = useState(null);
  const autoDraftedFor = useRef(null);
  const { push } = useToast();

  if (!cveData) return (
    <PageWrap>
      <PageHeader icon="✦" title="AI Remediation" sub="Gemini-powered patch issue generation" />
      <Card>
        <EmptyState icon="✦" title="No active scan" hint="Run a CVE analysis first. RippleAlert uses Gemini to draft professional, Markdown-formatted GitHub issues for every affected downstream maintainer." />
      </Card>
    </PageWrap>
  );

  const projects = cveData.affectedProjects || [];

  const handleGenerate = async (project) => {
    const key = settings.geminiKey;
    if (!key) { push({ type: "error", title: "Missing API key", message: "Add your Gemini API key in Settings first." }); return; }
    setGenerating(g => ({ ...g, [project.id]: true }));
    try {
      const text = await generatePatchIssue(key, cveData, project);
      setIssues(p => ({ ...p, [project.id]: text }));
      setActiveIssue(project.id);
      push({ type: "success", message: `Patch issue drafted for ${project.name}` });
    } catch (err) {
      push({ type: "error", title: "Gemini error", message: err.message });
    } finally {
      setGenerating(g => { const n = { ...g }; delete n[project.id]; return n; });
    }
  };

  // Auto-draft for the first project whenever a new CVE arrives, if the setting is on.
  useEffect(() => {
    if (!cveData?.id) return;
    if (autoDraftedFor.current === cveData.id) return;
    if (!settings?.autoGenerateIssues) return;
    if (!settings?.geminiKey) return;
    const first = (cveData.affectedProjects || [])[0];
    if (!first) return;
    autoDraftedFor.current = cveData.id;
    handleGenerate(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cveData?.id, settings?.autoGenerateIssues, settings?.geminiKey]);

  const draftAll = async () => {
    const todo = projects.filter(p => !issues[p.id]);
    if (!todo.length) { push({ type: "info", message: "All projects already drafted." }); return; }
    push({ type: "info", message: `Drafting ${todo.length} patch issues…` });
    for (const p of todo) {
      // eslint-disable-next-line no-await-in-loop
      await handleGenerate(p);
    }
  };

  const handleCopy = (id) => {
    navigator.clipboard.writeText(issues[id] || "");
    setCopied(id); setTimeout(() => setCopied(null), 1800);
    push({ type: "success", message: "Markdown copied to clipboard" });
  };

  const postToGitHub = (project) => {
    const body = issues[project.id];
    if (!body) return;
    const title = encodeURIComponent(`[Security] ${cveData.id} — upgrade ${cveData.affectedPackage} to ${cveData.fixedVersion}`);
    const encBody = encodeURIComponent(body);
    const url = `https://github.com/${project.repo}/issues/new?title=${title}&body=${encBody}&labels=security`;
    window.open(url, "_blank");
    push({ type: "info", message: "Opening GitHub new-issue page…" });
  };

  const downloadMd = (project) => {
    const body = issues[project.id]; if (!body) return;
    downloadFile(`${cveData.id}-${project.id}.md`, body, "text/markdown");
  };

  // Build a `gh issue create` command the user can paste straight into a terminal.
  const copyGhCli = (project) => {
    const body = issues[project.id]; if (!body) return;
    const repo  = project.repo || `${project.name}/${project.name}`;
    const title = `[Security] ${cveData.id} \u2014 upgrade ${cveData.affectedPackage} to ${cveData.fixedVersion || "safe version"}`;
    // Escape double-quotes for cmd/bash compatibility
    const esc = (s) => String(s).replace(/"/g, '\\"');
    const cmd = `gh issue create --repo ${repo} --title "${esc(title)}" --label security --body "${esc(body)}"`;
    navigator.clipboard.writeText(cmd);
    setCliCopied(project.id); setTimeout(() => setCliCopied(null), 1800);
    push({ type: "success", message: "GitHub CLI command copied" });
  };

  const activeProject = projects.find(p => p.id === activeIssue);

  return (
    <PageWrap>
      <PageHeader
        icon="✦"
        title="AI Remediation"
        sub={`${cveData.id} · Gemini 2.0 Flash · ${projects.length} downstream projects`}
        right={<>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "var(--muted)", padding: "5px 10px", borderRadius: 20, background: "var(--bg2)", border: "1px solid var(--border)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 6px var(--green)", animation: "pulse 2s infinite" }} />
            gemini-2.0-flash
          </div>
          <Btn variant="primary" onClick={draftAll} disabled={Object.keys(generating).length > 0}>
            {Object.keys(generating).length > 0 ? <><Spinner color="#fff" /> Drafting…</> : <>✦ Draft All</>}
          </Btn>
        </>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr)", gap: 14 }}>
        <Card>
          <CardHead title="Affected Projects" sub={`${projects.length} packages · ${Object.keys(issues).length} drafted`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {projects.map(project => {
              const isActive = activeIssue === project.id;
              const done = !!issues[project.id];
              const busy = !!generating[project.id];
              return (
                <div
                  key={project.id}
                  onClick={() => done && setActiveIssue(project.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 13px", borderRadius: 9,
                    background: isActive ? "var(--acglow)" : "var(--bg3)",
                    border: `1px solid ${isActive ? "var(--acline)" : "var(--border)"}`,
                    cursor: done ? "pointer" : "default",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: done ? "var(--ggglow)" : "var(--bg4)",
                    border: `1px solid ${done ? "rgba(34,197,94,0.3)" : "var(--brd2)"}`,
                    color: done ? "var(--green)" : "var(--muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13,
                  }}>{done ? "✓" : "✦"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: "#fff", fontWeight: 500, fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{project.repo} · v{project.version} · {project.dependencyType}</div>
                  </div>
                  <Badge sev={project.severity} size="sm" />
                  <Btn
                    onClick={e => { e.stopPropagation(); handleGenerate(project); }}
                    variant={done ? "ghost" : "accent"} size="sm"
                    disabled={busy}
                  >
                    {busy ? <><Spinner /> Drafting</> : done ? "↻ Redraft" : "✦ Draft"}
                  </Btn>
                </div>
              );
            })}
          </div>
        </Card>

        <div>
          {activeIssue && issues[activeIssue] && activeProject ? (
            <Card className="fade-up">
              <CardHead
                title="Generated Patch Issue"
                sub={`${activeProject.name} · ${activeProject.repo}`}
                right={<>
                  <div style={{ display: "flex", background: "var(--bg3)", border: "1px solid var(--brd2)", borderRadius: 7, padding: 2 }}>
                    {["preview", "markdown"].map(v => (
                      <button key={v} onClick={() => setView(v)} style={{
                        padding: "4px 10px", borderRadius: 5, fontSize: 10.5, fontWeight: 500,
                        background: view === v ? "var(--bg4)" : "transparent",
                        color: view === v ? "#fff" : "var(--muted)",
                        border: "none", cursor: "pointer", textTransform: "capitalize",
                      }}>{v}</button>
                    ))}
                  </div>
                  <Btn onClick={() => handleCopy(activeIssue)} size="sm">{copied === activeIssue ? "✓ Copied" : "Copy"}</Btn>
                  <Btn onClick={() => downloadMd(activeProject)} size="sm">.md</Btn>
                  <Btn onClick={() => copyGhCli(activeProject)} size="sm">{cliCopied === activeIssue ? "✓ CLI" : "Copy gh CLI"}</Btn>
                  <Btn onClick={() => postToGitHub(activeProject)} variant="primary" size="sm">Post to GitHub →</Btn>
                </>}
              />
              <div style={{ background: "var(--bg3)", border: "1px solid var(--brd2)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "10px 14px", borderBottom: "1px solid var(--border)",
                  background: "var(--bg4)", fontFamily: "var(--font-mono)", fontSize: 11.5,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 6px var(--green)" }} />
                  <span style={{ color: "var(--blue)", fontWeight: 500 }}>
                    [Security] {cveData.id} · {activeProject.name}
                  </span>
                  <span style={{ marginLeft: "auto", color: "var(--muted)" }}>Issue preview</span>
                </div>
                <div style={{ padding: "16px 18px", maxHeight: 440, overflowY: "auto" }}>
                  {view === "preview"
                    ? renderMarkdown(issues[activeIssue])
                    : <pre style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text2)", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{issues[activeIssue]}</pre>
                  }
                </div>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 10, display: "flex", justifyContent: "space-between" }}>
                <span>Generated by Gemini 2.0 Flash</span>
                <span>{issues[activeIssue].length} chars · ~{Math.ceil(issues[activeIssue].split(/\s+/).length)} words</span>
              </div>
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon="✦"
                title="No draft selected"
                hint='Click "Draft" on any project to generate a Gemini-authored GitHub issue, or "Draft All" to produce issues for every downstream maintainer.'
              />
            </Card>
          )}
        </div>
      </div>
    </PageWrap>
  );
}
