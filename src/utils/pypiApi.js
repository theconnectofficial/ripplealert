/**
 * pypiApi.js
 * PyPI helpers — package metadata, dep traversal, requirements.txt parsing.
 */

import { proxyJson, ProxyError } from "./proxyFetch";
import { coerce } from "./semver";

const PYPI_BASE = "https://pypi.org/pypi";
const ECOSYSTEMS_BASE = "https://packages.ecosyste.ms/api/v1/registries/pypi.org/packages";

export async function fetchPackage(name) {
  try {
    return await proxyJson(`${PYPI_BASE}/${encodeURIComponent(name)}/json`);
  } catch (err) {
    if (err instanceof ProxyError && err.status === 404) return null;
    throw err;
  }
}

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
 * Pull a clean dependency list out of `info.requires_dist`.
 * Strips environment markers like ` ; python_version >= "3.7"`.
 */
function parseRequiresDist(reqs = []) {
  return (reqs || [])
    .map(r => String(r).split(";")[0].trim())
    .map(r => {
      const m = r.match(/^([A-Za-z0-9_.\-]+)\s*(?:\[[^\]]*\])?\s*([<>=!~]=?\s*[^\s,]+)?/);
      if (!m) return null;
      return { name: m[1], range: (m[2] || "").replace(/\s+/g, "") };
    })
    .filter(Boolean);
}

/**
 * Recursively walk PyPI dependencies up to `maxDepth`.
 */
export async function traverseDeps(rootName, version = null, maxDepth = 2) {
  const seen = new Map();
  const edges = [];

  async function walk(name, ver, level) {
    if (level > maxDepth) return;
    if (seen.has(name) && seen.get(name).level <= level) return;

    const pkg = await fetchPackage(name);
    if (!pkg) return;

    const resolvedVer = ver || pkg.info?.version || "—";
    const deps = parseRequiresDist(pkg.info?.requires_dist);

    seen.set(name, {
      name, version: resolvedVer, level,
      deps: deps.map(d => d.name),
    });

    if (level === maxDepth) return;
    const limited = deps.slice(0, 6);
    for (const d of limited) {
      edges.push({ source: name, target: d.name });
      // eslint-disable-next-line no-await-in-loop
      await walk(d.name, coerce(d.range), level + 1);
    }
  }

  await walk(rootName, version, 0);
  return { nodes: Array.from(seen.values()), edges };
}

/**
 * Parse requirements.txt content → [{ name, version }]
 */
export function parseRequirementsTxt(content) {
  if (!content) return [];
  return String(content).split(/\r?\n/)
    .map(l => l.split("#")[0].trim())
    .filter(l => l && !l.startsWith("-"))
    .map(l => {
      const m = l.match(/^([A-Za-z0-9_.\-]+)\s*(?:\[[^\]]*\])?\s*([<>=!~]=?\s*[^\s;]+)?/);
      if (!m) return null;
      return { name: m[1], version: coerce(m[2]) || m[2] || null };
    })
    .filter(Boolean);
}
