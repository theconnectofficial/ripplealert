/**
 * npmApi.js
 * npm registry helpers — package metadata, dependency traversal, and
 * lockfile parsing. Reverse-dependents are sourced from ecosyste.ms which
 * is one of the few CORS-friendly free APIs that exposes that data.
 */

import { proxyJson, ProxyError } from "./proxyFetch";
import { coerce, satisfies } from "./semver";

const NPM_BASE = "https://registry.npmjs.org";
const DOWNLOADS_BASE = "https://api.npmjs.org/downloads/point/last-week";
const ECOSYSTEMS_BASE = "https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages";

/**
 * Fetch package metadata from the npm registry.
 */
export async function fetchPackage(name) {
  try {
    return await proxyJson(`${NPM_BASE}/${encodeURIComponent(name)}`);
  } catch (err) {
    if (err instanceof ProxyError && err.status === 404) return null;
    throw err;
  }
}

export async function fetchWeeklyDownloads(name) {
  try {
    const data = await proxyJson(`${DOWNLOADS_BASE}/${encodeURIComponent(name)}`);
    return data?.downloads || 0;
  } catch {
    return 0;
  }
}

/**
 * Fetch real reverse dependents from ecosyste.ms.
 * Returns an array of { name, repository, downloads }.
 */
export async function fetchDependents(name, limit = 20) {
  try {
    const data = await proxyJson(`${ECOSYSTEMS_BASE}/${encodeURIComponent(name)}/dependent_packages?per_page=${limit}`);
    return (Array.isArray(data) ? data : []).map(p => ({
      name: p.name,
      repository: p.repository_url?.replace(/^https?:\/\/github\.com\//, "") || "",
      version: p.latest_release_number || p.latest_stable_version || "—",
      downloads: p.downloads || 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Recursively walk forward dependencies for a package up to `maxDepth`.
 * Returns a flat list of nodes with their level.
 */
export async function traverseDeps(rootName, version = null, maxDepth = 2) {
  const seen = new Map(); // name → { name, version, level, deps: string[] }
  const edges = [];

  async function walk(name, ver, level) {
    if (level > maxDepth) return;
    if (seen.has(name) && seen.get(name).level <= level) return;

    const pkg = await fetchPackage(name);
    if (!pkg) return;

    const resolvedVer = ver || pkg["dist-tags"]?.latest || Object.keys(pkg.versions || {}).pop();
    const verData = pkg.versions?.[resolvedVer] || {};
    const deps    = Object.entries(verData.dependencies || {});

    seen.set(name, {
      name, version: resolvedVer, level,
      deps: deps.map(([d]) => d),
    });

    if (level === maxDepth) return;
    // Limit fan-out per node to keep it interactive
    const limited = deps.slice(0, 6);
    for (const [depName, depRange] of limited) {
      edges.push({ source: name, target: depName });
      // eslint-disable-next-line no-await-in-loop
      await walk(depName, coerce(depRange), level + 1);
    }
  }

  await walk(rootName, version, 0);
  return { nodes: Array.from(seen.values()), edges };
}

/**
 * Parse package-lock.json (v1, v2, v3) into a flat list of { name, version }.
 */
export function parsePackageLock(content) {
  let data;
  try { data = typeof content === "string" ? JSON.parse(content) : content; }
  catch { return []; }

  const out = [];

  // v2 / v3 — top-level "packages" map
  if (data.packages) {
    for (const [path, info] of Object.entries(data.packages)) {
      if (!path || path === "" || !info?.version) continue;
      const name = path.replace(/^node_modules\//, "").split("/node_modules/").pop();
      if (!name) continue;
      out.push({ name, version: info.version });
    }
  }
  // v1 — nested "dependencies" tree
  else if (data.dependencies) {
    const walk = (deps) => {
      for (const [name, info] of Object.entries(deps || {})) {
        if (info?.version) out.push({ name, version: info.version });
        if (info?.dependencies) walk(info.dependencies);
      }
    };
    walk(data.dependencies);
  }

  // Dedupe by name+version
  const key = (p) => `${p.name}@${p.version}`;
  const map = new Map();
  for (const p of out) map.set(key(p), p);
  return Array.from(map.values());
}

/**
 * Parse a plain package.json's `dependencies` + `devDependencies` block.
 */
export function parsePackageJson(content) {
  let data;
  try { data = typeof content === "string" ? JSON.parse(content) : content; }
  catch { return []; }
  const merge = (obj) => Object.entries(obj || {}).map(([name, range]) => ({ name, version: coerce(range) || range }));
  return [...merge(data.dependencies), ...merge(data.devDependencies)];
}

/**
 * Cross-reference a parsed dependency list against a CVE's affected range.
 * Returns vulnerable matches with safe/fixed version info.
 */
export function findVulnerableMatches(deps, cve) {
  if (!cve?.affectedPackage || !cve?.affectedVersionRange) return [];
  const target = cve.affectedPackage.toLowerCase();
  return deps
    .filter(d => d.name?.toLowerCase() === target && satisfies(d.version, cve.affectedVersionRange))
    .map(d => ({
      name: d.name,
      installedVersion: d.version,
      safeVersion: cve.fixedVersion,
      cveId: cve.id,
      cvssScore: cve.cvssScore,
      severity: cve.severity,
    }));
}
