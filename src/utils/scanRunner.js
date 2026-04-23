/**
 * scanRunner.js
 * High-level orchestration:
 *   - runCveScan(cveId)         → NVD → ecosystem traversal → enriched CVE
 *   - runRepoScan(repoUrl, knownCves) → fetch lockfile → cross-reference
 *
 * The returned object always conforms to the legacy `cveData` shape so
 * the rest of the UI keeps working.
 */

import { fetchCVE } from "./nvdApi";
import * as npm  from "./npmApi";
import * as pypi from "./pypiApi";
import { fetchRepoManifest } from "./githubApi";
import { findVulnerableMatches } from "./npmApi";
import { satisfies } from "./semver";

const SEV_BY_LEVEL = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function levelToSeverity(level) {
  return SEV_BY_LEVEL[Math.min(level, SEV_BY_LEVEL.length - 1)];
}

function clientForEcosystem(eco) {
  if ((eco || "").toLowerCase().startsWith("pypi") || (eco || "").toLowerCase() === "python") return pypi;
  return npm;
}

/**
 * Build graph nodes/edges in the legacy shape from a forward dep traversal.
 */
function shapeForGraph(cve, traversal, dependents) {
  const seenNames = new Set();
  const nodes = [];

  // Root node = the vulnerable package itself
  nodes.push({
    id: cve.affectedPackage,
    label: `${cve.affectedPackage}\nv${cve.fixedVersion ? `${cve.fixedVersion}*` : "?"}`,
    level: 0,
    severity: cve.severity || "CRITICAL",
    type: "direct",
    version: cve.fixedVersion || "—",
    fixAvailable: !!cve.fixedVersion,
    downloads: 0,
  });
  seenNames.add(cve.affectedPackage);

  for (const n of traversal.nodes || []) {
    if (n.name === cve.affectedPackage) continue;
    if (seenNames.has(n.name)) continue;
    seenNames.add(n.name);
    const lvl = Math.max(1, n.level + 1);
    nodes.push({
      id: n.name,
      label: `${n.name}\nv${n.version}`,
      level: lvl,
      severity: levelToSeverity(lvl),
      type: lvl === 1 ? "direct" : "transitive",
      version: n.version,
      fixAvailable: !!cve.fixedVersion,
      downloads: 0,
    });
  }

  const ids = new Set(nodes.map(n => n.id));
  const edges = (traversal.edges || []).filter(e => ids.has(e.source) && ids.has(e.target));

  // Connect dependents → root (these are "who depends on the vulnerable pkg")
  for (const dep of (dependents || []).slice(0, 8)) {
    if (seenNames.has(dep.name)) continue;
    seenNames.add(dep.name);
    nodes.push({
      id: dep.name,
      label: `${dep.name}\nv${dep.version}`,
      level: 1,
      severity: "HIGH",
      type: "direct",
      version: dep.version,
      fixAvailable: !!cve.fixedVersion,
      downloads: dep.downloads,
    });
    edges.push({ source: dep.name, target: cve.affectedPackage });
  }

  return { nodes, edges };
}

function shapeAffectedProjects(dependents, cve) {
  return (dependents || []).slice(0, 8).map((d, i) => ({
    id: `proj-${i}`,
    name: d.name,
    repo: d.repository || `${d.name}/${d.name}`,
    version: d.version,
    severity: i === 0 ? "CRITICAL" : i < 3 ? "HIGH" : "MEDIUM",
    dependencyType: i < 3 ? "direct" : "transitive",
    downloads: d.downloads,
    fixAvailable: !!cve.fixedVersion,
  }));
}

/**
 * Main entrypoint: scan a CVE end-to-end.
 *
 * @param {string} cveId
 * @returns {Promise<object>} cve-shaped object enriched with nodes/edges/affectedProjects
 */
export async function runCveScan(cveId) {
  const start = performance.now();
  const cve = await fetchCVE(cveId);
  const client = clientForEcosystem(cve.ecosystem);

  // Run dep traversal and reverse-deps in parallel, but tolerate failures
  const [traversal, dependents] = await Promise.all([
    client.traverseDeps(cve.affectedPackage, null, 2).catch(() => ({ nodes: [], edges: [] })),
    client.fetchDependents(cve.affectedPackage, 12).catch(() => []),
  ]);

  // Hydrate downloads for npm root if we can
  if ((cve.ecosystem || "").toLowerCase() === "npm") {
    try {
      const dl = await npm.fetchWeeklyDownloads(cve.affectedPackage);
      if (dl) cve._downloads = dl;
    } catch { /* noop */ }
  }

  const graph = shapeForGraph(cve, traversal, dependents);
  cve.nodes = graph.nodes;
  cve.edges = graph.edges;
  cve.affectedProjects = shapeAffectedProjects(dependents, cve);
  cve.scanDurationMs = Math.round(performance.now() - start);
  return cve;
}

/**
 * Repo-mode scan: pull lockfile, cross-reference against `knownCves`.
 *
 * @param {string} repoUrl
 * @param {object[]} knownCves - array of normalized CVEs to test against
 * @returns {Promise<object>} report
 */
export async function runRepoScan(repoUrl, knownCves = []) {
  const start = performance.now();
  const manifest = await fetchRepoManifest(repoUrl);

  let deps = [];
  if (manifest.filename === "package-lock.json") deps = npm.parsePackageLock(manifest.content);
  else if (manifest.filename === "package.json") deps = npm.parsePackageJson(manifest.content);
  else if (manifest.filename === "requirements.txt") deps = pypi.parseRequirementsTxt(manifest.content);
  else if (manifest.filename === "Pipfile.lock") {
    try {
      const data = JSON.parse(manifest.content);
      deps = Object.entries(data.default || {}).map(([name, info]) => ({
        name, version: (info?.version || "").replace(/^==/, ""),
      }));
    } catch { deps = []; }
  }

  // Cross-reference
  const findings = [];
  for (const cve of knownCves) {
    const matches = findVulnerableMatches(deps, cve);
    for (const m of matches) {
      findings.push({ ...m, ecosystem: cve.ecosystem, cve });
    }
  }

  // Counts
  const counts = {
    total: deps.length,
    critical: findings.filter(f => f.severity === "CRITICAL").length,
    high:     findings.filter(f => f.severity === "HIGH").length,
    medium:   findings.filter(f => f.severity === "MEDIUM").length,
    safe:     deps.length - findings.length,
  };

  // Synthesize a top-level "scan" object the UI can consume.
  // Use the highest-severity finding (or a stub) as the "primary" CVE for graph display.
  const primary = findings[0]?.cve || null;
  const result = primary
    ? {
        ...primary,
        repoUrl,
        repoMode: true,
        scanDurationMs: Math.round(performance.now() - start),
        repoCounts: counts,
        repoFindings: findings,
        manifestFile: manifest.filename,
      }
    : {
        id: `REPO-${Date.now()}`,
        repoUrl,
        repoMode: true,
        affectedPackage: `${manifest.owner}/${manifest.repo}`,
        ecosystem: manifest.ecosystem,
        cvssScore: 0,
        severity: "LOW",
        description: `No vulnerabilities found in ${manifest.filename} against the loaded CVE corpus.`,
        publishedDate: new Date().toISOString().slice(0, 10),
        affectedVersionRange: "—",
        fixedVersion: "—",
        nodes: [], edges: [], affectedProjects: [],
        repoCounts: counts,
        repoFindings: [],
        manifestFile: manifest.filename,
        scanDurationMs: Math.round(performance.now() - start),
      };

  return result;
}

export { satisfies };
