/**
 * RippleAlert — Pre-Cache Script
 * Run this at home BEFORE the hackathon to cache all dependency data.
 * Usage: node scripts/fetchAndCache.js
 *
 * This script hits npm & PyPI APIs and saves all responses locally.
 * During the demo, the React app reads from the cache — no live API calls.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, "../src/data/cve_cache.json");
const DELAY_MS = 500; // Be polite to APIs — wait 500ms between requests

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// ─── NVD API — Fetch CVE Details ─────────────────────────────────────────────
async function fetchCVEFromNVD(cveId) {
  console.log(`\n[NVD] Fetching ${cveId}...`);
  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cveId}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`NVD API failed: ${res.status}`);

  const data = await res.json();
  const vuln = data.vulnerabilities?.[0]?.cve;
  if (!vuln) throw new Error(`CVE ${cveId} not found in NVD`);

  const cvssScore =
    vuln.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ||
    vuln.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore ||
    0;

  const severity =
    cvssScore >= 9
      ? "CRITICAL"
      : cvssScore >= 7
      ? "HIGH"
      : cvssScore >= 4
      ? "MEDIUM"
      : "LOW";

  return {
    id: cveId,
    description: vuln.descriptions?.find((d) => d.lang === "en")?.value || "",
    severity,
    cvssScore,
    publishedDate: vuln.published?.split("T")[0] || "",
  };
}

// ─── npm Registry — Fetch Package Dependents ─────────────────────────────────
async function fetchNpmDependents(packageName, depth = 0, maxDepth = 2, visited = new Set()) {
  if (depth > maxDepth || visited.has(packageName)) return [];
  visited.add(packageName);

  console.log(`  [npm] Fetching dependents of "${packageName}" (level ${depth})...`);
  await delay(DELAY_MS);

  try {
    const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();

    // Get packages that list this one as a dependency
    // npm doesn't have a direct dependents endpoint, so we use the search API
    const searchUrl = `https://registry.npmjs.org/-/v1/search?text=dependencies:${packageName}&size=5`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return [];

    const searchData = await searchRes.json();
    const dependents = searchData.objects?.map((obj) => ({
      name: obj.package.name,
      version: obj.package.version,
      description: obj.package.description,
    })) || [];

    const results = [];
    for (const dep of dependents.slice(0, 3)) {
      results.push({ ...dep, depth, parent: packageName });
      if (depth < maxDepth) {
        const nested = await fetchNpmDependents(dep.name, depth + 1, maxDepth, visited);
        results.push(...nested);
      }
    }

    return results;
  } catch (err) {
    console.warn(`  [npm] Warning: Could not fetch ${packageName}:`, err.message);
    return [];
  }
}

// ─── PyPI — Fetch Package Info ────────────────────────────────────────────────
async function fetchPyPIPackage(packageName) {
  console.log(`  [PyPI] Fetching "${packageName}"...`);
  await delay(DELAY_MS);

  try {
    const url = `https://pypi.org/pypi/${packageName}/json`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    return {
      name: data.info.name,
      version: data.info.version,
      description: data.info.summary,
      requires: data.info.requires_dist || [],
    };
  } catch (err) {
    console.warn(`  [PyPI] Warning: Could not fetch ${packageName}:`, err.message);
    return null;
  }
}

// ─── Build Node/Edge Graph ────────────────────────────────────────────────────
function buildGraph(vulnerablePackage, dependents) {
  const nodes = [
    {
      id: vulnerablePackage,
      label: `${vulnerablePackage}\n(vulnerable)`,
      level: 0,
      severity: "CRITICAL",
      type: "vulnerable",
    },
  ];

  const edges = [];
  const seen = new Set([vulnerablePackage]);

  for (const dep of dependents) {
    if (!seen.has(dep.name)) {
      seen.add(dep.name);
      const severity = dep.depth === 0 ? "HIGH" : dep.depth === 1 ? "MEDIUM" : "LOW";
      nodes.push({
        id: dep.name,
        label: `${dep.name}\n${dep.version || ""}`,
        level: dep.depth + 1,
        severity,
        type: dep.depth === 0 ? "direct" : "transitive",
      });
    }
    edges.push({ source: dep.parent || vulnerablePackage, target: dep.name });
  }

  return { nodes, edges };
}

// ─── Main Runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log("=== RippleAlert Cache Builder ===");
  console.log("Run this at home before the hackathon.\n");

  // Load existing cache (we already have Log4Shell pre-seeded)
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    console.log(`Loaded existing cache with ${Object.keys(cache).length} CVE(s).`);
  }

  // Example: Add a new CVE to the cache
  // To add more CVEs, just add their IDs to this array
  const cveToFetch = [
    // "CVE-2023-44487",  // Uncomment to fetch more
    // "CVE-2022-42889",
  ];

  for (const cveId of cveToFetch) {
    if (cache[cveId]) {
      console.log(`\n[SKIP] ${cveId} already cached.`);
      continue;
    }

    try {
      const cveDetails = await fetchCVEFromNVD(cveId);
      const dependents = await fetchNpmDependents(cveDetails.affectedPackage || cveId, 0, 2);
      const { nodes, edges } = buildGraph(cveDetails.affectedPackage || cveId, dependents);

      cache[cveId] = {
        ...cveDetails,
        nodes,
        edges,
        affectedProjects: dependents.slice(0, 7).map((d) => ({
          id: d.name,
          name: d.name,
          version: d.version,
          repo: `github.com/${d.name}`,
          severity: d.depth === 0 ? "HIGH" : "MEDIUM",
          dependencyType: d.depth === 0 ? "direct" : "transitive",
        })),
      };

      console.log(`\n✅ Cached ${cveId} with ${nodes.length} nodes.`);
    } catch (err) {
      console.error(`\n❌ Failed to cache ${cveId}:`, err.message);
    }
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  console.log(`\n✅ Cache saved to ${CACHE_FILE}`);
  console.log(`Total CVEs cached: ${Object.keys(cache).length}`);
  console.log("\nYou're ready for the demo. 🚀");
}

main().catch(console.error);
