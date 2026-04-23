import { useState } from "react";
import { Card, CardHead, Btn, PageWrap, PageHeader, Input, useToast, Spinner } from "./ui";
import { pingGemini } from "../utils/geminiApi";

function Row({ label, desc, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--border)", gap: 14 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>{desc}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 38, height: 22,
        background: value ? "var(--accent)" : "var(--bg4)",
        border: `1px solid ${value ? "var(--accent)" : "var(--brd2)"}`,
        borderRadius: 20, cursor: "pointer", position: "relative",
        transition: "all 0.2s", flexShrink: 0, padding: 0,
      }}
    >
      <div style={{
        width: 14, height: 14, background: "#fff", borderRadius: "50%",
        position: "absolute", top: 3, left: value ? 20 : 3,
        transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
      }} />
    </button>
  );
}

export default function Settings({ settings, onChange, defaultSettings }) {
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const { push } = useToast();
  const set = (k, v) => onChange(p => ({ ...p, [k]: v }));

  const testKey = async () => {
    if (!settings.geminiKey) { push({ type: "warn", message: "Enter an API key first" }); return; }
    setTesting(true);
    try {
      await pingGemini(settings.geminiKey);
      push({ type: "success", title: "API key valid", message: "Gemini connection successful" });
    } catch (err) {
      push({ type: "error", title: "API key rejected", message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const resetAll = () => {
    onChange(defaultSettings);
    push({ type: "info", message: "Settings reset to defaults" });
  };

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ripplealert-settings.json"; a.click();
    URL.revokeObjectURL(url);
    push({ type: "success", message: "Settings exported" });
  };

  return (
    <PageWrap>
      <PageHeader icon="⚙" title="Settings" sub="API keys · Scan preferences · Ecosystems · Persistence"
        right={<>
          <Btn onClick={exportSettings}>Export</Btn>
          <Btn variant="danger" onClick={resetAll}>Reset defaults</Btn>
        </>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <Card style={{ marginBottom: 14 }}>
            <CardHead title="API Configuration" icon="⚙" />
            <Row
              label="Gemini API Key"
              desc="AI patch issue generation · gemini-2.0-flash · stored locally in browser"
              right={
                <div style={{ width: 260, display: "flex", flexDirection: "column", gap: 6 }}>
                  <Input
                    type={showKey ? "text" : "password"}
                    value={settings.geminiKey}
                    onChange={e => set("geminiKey", e.target.value)}
                    placeholder="AIza..."
                    style={{ fontSize: 11, padding: "7px 11px" }}
                    right={<button onClick={() => setShowKey(s => !s)} style={{ background: "transparent", border: "none", fontSize: 11, color: "var(--muted)", padding: 4 }}>{showKey ? "hide" : "show"}</button>}
                  />
                  <Btn size="sm" variant="accent" onClick={testKey} disabled={testing}>
                    {testing ? <><Spinner /> Testing…</> : "Test connection"}
                  </Btn>
                </div>
              }
            />
            <Row
              label="NVD API Endpoint"
              desc="National Vulnerability Database · override for enterprise mirrors"
              right={<Input value={settings.nvdUrl} onChange={e => set("nvdUrl", e.target.value)} containerStyle={{ width: 260 }} style={{ fontSize: 10.5, padding: "7px 11px" }} />}
            />
            <Row
              label="Traversal Depth"
              desc={`Max hops from vulnerable root · currently ${settings.maxDepth} hop${settings.maxDepth === 1 ? "" : "s"}`}
              right={
                <div style={{ display: "flex", alignItems: "center", gap: 10, width: 160 }}>
                  <input type="range" min={1} max={5} value={settings.maxDepth} onChange={e => set("maxDepth", +e.target.value)} style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, color: "#fff", minWidth: 14, textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{settings.maxDepth}</span>
                </div>
              }
            />
          </Card>

          <Card>
            <CardHead title="Scan Preferences" icon="⌖" />
            <Row label="Include devDependencies" desc="Include dev-only packages in the scan" right={<Toggle value={settings.includeDevDeps} onChange={v => set("includeDevDeps", v)} />} />
            <Row label="Auto-generate issues"   desc="Draft patch issues after every successful scan" right={<Toggle value={settings.autoGenerateIssues} onChange={v => set("autoGenerateIssues", v)} />} />
            <Row label="Watchlist auto-refresh" desc="Re-scan tracked CVEs in the background" right={<Toggle value={settings.watchlistRefresh} onChange={v => set("watchlistRefresh", v)} />} />
          </Card>
        </div>

        <div>
          <Card style={{ marginBottom: 14 }}>
            <CardHead title="Ecosystem Support" icon="▤" />
            <Row label="npm (Node.js)"   desc="registry.npmjs.org" right={<Toggle value={settings.ecosystems?.npm}   onChange={v => set("ecosystems", { ...settings.ecosystems, npm: v })} />} />
            <Row label="PyPI (Python)"   desc="pypi.org/pypi/{pkg}/json" right={<Toggle value={settings.ecosystems?.pypi}  onChange={v => set("ecosystems", { ...settings.ecosystems, pypi: v })} />} />
            <Row label="Maven (Java)"    desc="search.maven.org" right={<Toggle value={settings.ecosystems?.maven} onChange={v => set("ecosystems", { ...settings.ecosystems, maven: v })} />} />
          </Card>
        </div>
      </div>
    </PageWrap>
  );
}
