/**
 * nvdApi.js
 * Client for the National Vulnerability Database 2.0 API.
 * https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-...
 */

import { proxyJson, ProxyError } from "./proxyFetch";

const NVD_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0";

// Map an NVD CPE 2.3 vendor/product → our ecosystem buckets
function detectEcosystem(cpeString) {
  if (!cpeString) return "npm";
  const s = cpeString.toLowerCase();
  if (s.includes(":python:") || s.includes(":pypi:")) return "PyPI";
  if (s.includes(":apache:")  || s.includes(":java:")  || s.includes("log4j")) return "Maven";
  if (s.includes(":node")     || s.includes(":npm")    || s.includes(":nodejs")) return "npm";
  return "npm";
}

function pickPackageName(cpe) {
  // cpe:2.3:a:vendor:product:version:...
  const parts = (cpe || "").split(":");
  const product = parts[4] || "";
  return product.replace(/_/g, "-") || null;
}

function pickCvss(metrics = {}) {
  const v31 = metrics.cvssMetricV31?.[0]?.cvssData;
  if (v31) {
    return {
      score: v31.baseScore,
      severity: (metrics.cvssMetricV31[0].baseSeverity || v31.baseSeverity || "").toUpperCase(),
      attackVector: v31.attackVector || "—",
      vector: v31.vectorString,
      version: "3.1",
    };
  }
  const v30 = metrics.cvssMetricV30?.[0]?.cvssData;
  if (v30) {
    return {
      score: v30.baseScore,
      severity: (metrics.cvssMetricV30[0].baseSeverity || v30.baseSeverity || "").toUpperCase(),
      attackVector: v30.attackVector || "—",
      vector: v30.vectorString,
      version: "3.0",
    };
  }
  const v2  = metrics.cvssMetricV2?.[0]?.cvssData;
  if (v2) {
    return {
      score: v2.baseScore,
      severity: (metrics.cvssMetricV2[0].baseSeverity || "").toUpperCase(),
      attackVector: v2.accessVector || "—",
      vector: v2.vectorString,
      version: "2.0",
    };
  }
  return { score: 0, severity: "UNKNOWN", attackVector: "—", vector: null, version: null };
}

function pickAffectedRange(configurations = []) {
  for (const cfg of configurations) {
    for (const node of cfg.nodes || []) {
      for (const cpe of node.cpeMatch || []) {
        if (!cpe.vulnerable) continue;
        const lo = cpe.versionStartIncluding ? `>=${cpe.versionStartIncluding}`
                : cpe.versionStartExcluding ? `>${cpe.versionStartExcluding}` : null;
        const hi = cpe.versionEndExcluding ? `<${cpe.versionEndExcluding}`
                : cpe.versionEndIncluding ? `<=${cpe.versionEndIncluding}` : null;
        const range = [lo, hi].filter(Boolean).join(" ");
        if (range) {
          return { range, fixed: cpe.versionEndExcluding || null, cpe: cpe.criteria };
        }
        // exact version pin
        const exactMatch = cpe.criteria?.match(/^cpe:2\.3:a:[^:]+:[^:]+:([^:]+):/);
        if (exactMatch && exactMatch[1] !== "*") {
          return { range: `=${exactMatch[1]}`, fixed: null, cpe: cpe.criteria };
        }
      }
    }
  }
  return { range: "*", fixed: null, cpe: null };
}

/**
 * Normalize a raw NVD `cve` object into the shape RippleAlert uses internally.
 *
 * @param {object} raw - NVD vulnerability JSON
 * @returns {object|null}
 */
export function normalizeNvd(raw) {
  if (!raw) return null;
  const cve = raw.cve || raw;

  const desc =
    (cve.descriptions || []).find(d => d.lang === "en")?.value
    || (cve.descriptions || [])[0]?.value
    || "No description available.";

  const cvss = pickCvss(cve.metrics || {});
  const aff  = pickAffectedRange(cve.configurations || []);
  const eco  = detectEcosystem(aff.cpe);
  const pkg  = pickPackageName(aff.cpe) || "unknown-package";

  return {
    id: cve.id,
    description: desc,
    affectedPackage: pkg,
    ecosystem: eco,
    cvssScore: cvss.score,
    cvssVersion: cvss.version,
    severity: cvss.severity || "UNKNOWN",
    attackVector: cvss.attackVector,
    vectorString: cvss.vector,
    affectedVersionRange: aff.range,
    fixedVersion: aff.fixed,
    publishedDate: (cve.published || "").slice(0, 10),
    lastModified:  (cve.lastModified || "").slice(0, 10),
    references:    (cve.references || []).slice(0, 5).map(r => r.url),
    nvdUrl: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
    // empty placeholders — populated by scanRunner
    nodes: [],
    edges: [],
    affectedProjects: [],
  };
}

/**
 * Fetch a single CVE from NVD by id and return normalized data.
 *
 * @param {string} cveId - e.g. "CVE-2021-44228"
 * @returns {Promise<object>}
 * @throws Error with .code === "NOT_FOUND" if NVD returns no entries.
 */
export async function fetchCVE(cveId) {
  const id = (cveId || "").trim().toUpperCase();
  if (!/^CVE-\d{4}-\d{3,}$/.test(id)) {
    const err = new Error(`Invalid CVE identifier: "${cveId}"`);
    err.code = "BAD_INPUT";
    throw err;
  }

  let data;
  try {
    data = await proxyJson(`${NVD_BASE}?cveId=${id}`);
  } catch (err) {
    if (err instanceof ProxyError && err.status === 404) {
      const e = new Error(`${id} not found on NVD.`);
      e.code = "NOT_FOUND";
      throw e;
    }
    const e = new Error(`NVD request failed: ${err.message}`);
    e.code = "NETWORK";
    throw e;
  }

  const items = data?.vulnerabilities || [];
  if (!items.length) {
    const e = new Error(`${id} returned no entries from NVD.`);
    e.code = "NOT_FOUND";
    throw e;
  }
  return normalizeNvd(items[0]);
}

/**
 * Search NVD for CVEs that affect a given keyword (used by repo scanner).
 * Returns up to `limit` normalized CVEs.
 */
export async function searchCVEsByKeyword(keyword, limit = 5) {
  if (!keyword) return [];
  const url = `${NVD_BASE}?keywordSearch=${encodeURIComponent(keyword)}&resultsPerPage=${limit}`;
  try {
    const data = await proxyJson(url);
    return (data?.vulnerabilities || []).map(v => normalizeNvd(v)).filter(Boolean);
  } catch {
    return [];
  }
}
