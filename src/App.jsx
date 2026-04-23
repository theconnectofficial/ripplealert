import { useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./components/Dashboard";
import CVEScanner from "./components/CVEScanner";
import DependencyGraph from "./components/DependencyGraph";
import AIRemediation from "./components/AIRemediation";
import PackageExplorer from "./components/PackageExplorer";
import Watchlist from "./components/Watchlist";
import ScanHistory from "./components/ScanHistory";
import Settings from "./components/Settings";
import { ToastProvider, useToast } from "./components/ui";
import cveCache from "./data/cve_cache.json";
import { runCveScan } from "./utils/scanRunner";

// ── LocalStorage helpers ────────────────────────────────────────────────────
const LS = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

const DEFAULT_SETTINGS = {
  geminiKey: import.meta.env.VITE_GEMINI_API_KEY || "",
  nvdUrl: "https://services.nvd.nist.gov/rest/json/cves/2.0",
  maxDepth: 2,
  includeDevDeps: false,
  autoGenerateIssues: true,
  watchlistRefresh: true,
  ecosystems: { npm: true, pypi: true, maven: false },
};

const DEFAULT_HISTORY = [
  { id: "CVE-2021-44228", type: "CVE", target: "CVE-2021-44228", timestamp: Date.now() - 1000*60*60*5, packagesFound: 15, issuesDrafted: 7, duration: "1.2s", status: "Complete" },
  { id: "CVE-2022-22965", type: "CVE", target: "CVE-2022-22965", timestamp: Date.now() - 1000*60*60*7, packagesFound: 5,  issuesDrafted: 3, duration: "0.8s", status: "Complete" },
];

function Shell() {
  const [active, setActive]       = useState("dashboard");
  const [activeCVE, setActiveCVE] = useState(null);
  const [watchlist, setWatchlist] = useState(() => LS.get("ra:watchlist", ["CVE-2021-44228", "CVE-2022-22965"]));
  const [scanHistory, setScanHistory] = useState(() => LS.get("ra:history", DEFAULT_HISTORY));
  const [settings, setSettings]   = useState(() => ({ ...DEFAULT_SETTINGS, ...LS.get("ra:settings", {}) }));
  const { push } = useToast();

  useEffect(() => { LS.set("ra:watchlist", watchlist); }, [watchlist]);
  useEffect(() => { LS.set("ra:history", scanHistory); }, [scanHistory]);
  useEffect(() => { LS.set("ra:settings", settings); }, [settings]);

  // Command palette / global shortcuts
  useEffect(() => {
    const h = (e) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "k") { e.preventDefault(); setActive("scanner"); }
      if ((e.metaKey || e.ctrlKey) && k === "b") { e.preventDefault(); setActive("dashboard"); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const addToHistory = (entry) => setScanHistory(p => [entry, ...p].slice(0, 50));

  const handleScanComplete = (cveData, mode = "CVE") => {
    setActiveCVE(cveData);
    addToHistory({
      id:             `${cveData.id}-${Date.now()}`,
      type:           mode,
      target:         cveData.repoUrl || cveData.id,
      timestamp:      Date.now(),
      packagesFound:  cveData.nodes?.length || cveData.repoCounts?.total || 0,
      issuesDrafted:  cveData.affectedProjects?.length || cveData.repoFindings?.length || 0,
      duration:       cveData.scanDurationMs ? `${(cveData.scanDurationMs/1000).toFixed(1)}s` : "—",
      status:         "Complete",
      cveId:          cveData.id,
    });
    setActive("graph");
    push({ type: "success", title: "Scan complete", message: `${cveData.id} · ${cveData.nodes?.length || 0} packages analyzed` });
  };

  const goGraph = (id) => {
    const target = id?.startsWith?.("CVE-") ? id : id;
    if (cveCache[target]) { setActiveCVE(cveCache[target]); setActive("graph"); return; }
    // Try live lookup
    runCveScan(target).then(data => {
      setActiveCVE(data); setActive("graph");
    }).catch(() => push({ type: "warn", message: `${target} could not be loaded.` }));
  };

  const addWatchlist = (id) => {
    if (!id) return;
    if (watchlist.includes(id)) {
      push({ type: "warn", message: `${id} is already on the watchlist.` });
      return;
    }
    setWatchlist(p => [...p, id]);
    push({ type: "success", message: `${id} added to watchlist` });
  };

  const removeWatchlist = (id) => {
    setWatchlist(p => p.filter(x => x !== id));
    push({ type: "info", message: `${id} removed from watchlist` });
  };

  const clearHistory = () => {
    setScanHistory([]);
    push({ type: "info", message: "Scan history cleared" });
  };

  // Watchlist auto-rescan on mount: refresh each watched CVE in the background
  // and stash the latest data + a "new dependents since last check" diff in localStorage.
  const [watchlistData, setWatchlistData] = useState(() => LS.get("ra:watchlistData", {}));
  useEffect(() => { LS.set("ra:watchlistData", watchlistData); }, [watchlistData]);
  useEffect(() => {
    if (!settings.watchlistRefresh) return;
    let cancelled = false;
    (async () => {
      const next = { ...watchlistData };
      for (const id of watchlist) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const data = await runCveScan(id);
          if (cancelled) return;
          const prev = next[id];
          const prevDeps = new Set((prev?.affectedProjects || []).map(p => p.name));
          const currDeps = (data.affectedProjects || []).map(p => p.name);
          const newDeps  = currDeps.filter(n => !prevDeps.has(n));
          next[id] = {
            id: data.id, severity: data.severity, cvssScore: data.cvssScore,
            affectedProjects: data.affectedProjects?.slice(0, 10) || [],
            lastChecked: Date.now(),
            newDeps,
          };
          setWatchlistData({ ...next });
        } catch { /* ignore individual failures */ }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.join("|"), settings.watchlistRefresh]);

  const pages = useMemo(() => ({
    dashboard:   <Dashboard   cveCache={cveCache} scanHistory={scanHistory} onNavigate={setActive} onScanSelect={goGraph} />,
    scanner:     <CVEScanner  cveCache={cveCache} onScanComplete={handleScanComplete} settings={settings} onAddWatchlist={addWatchlist} />,
    graph:       <DependencyGraph cveData={activeCVE} onRemediate={() => setActive("remediation")} onNavigate={setActive} />,
    remediation: <AIRemediation   cveData={activeCVE} settings={settings} />,
    packages:    <PackageExplorer cveCache={cveCache} scanHistory={scanHistory} onScanSelect={goGraph} />,
    reports:     <PackageExplorer cveCache={cveCache} scanHistory={scanHistory} onScanSelect={goGraph} />,
    watchlist:   <Watchlist watchlist={watchlist} cveCache={cveCache} watchlistData={watchlistData} onRemove={removeWatchlist} onScanSelect={goGraph} onAdd={addWatchlist} />,
    history:     <ScanHistory history={scanHistory} onSelect={goGraph} onClear={clearHistory} />,
    settings:    <Settings settings={settings} onChange={setSettings} defaultSettings={DEFAULT_SETTINGS} />,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [active, activeCVE, watchlist, scanHistory, settings, watchlistData]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar active={active} onNavigate={setActive} watchlistCount={watchlist.length} activeCVE={activeCVE} />
      <main className="flex-1 overflow-hidden flex flex-col" style={{ minWidth: 0 }}>
        <TopBar active={active} onNavigate={setActive} activeCVE={activeCVE} cveCache={cveCache} scanHistory={scanHistory} onScanSelect={goGraph} />
        {pages[active] || pages.dashboard}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}
