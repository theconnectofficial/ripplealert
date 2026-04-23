/**
 * githubApi.js
 * Fetch lockfiles from public GitHub repositories.
 */

import { proxyFetch, ProxyError } from "./proxyFetch";

const GH_BASE = "https://api.github.com/repos";

/**
 * Extract owner/repo from a GitHub URL.
 *   https://github.com/elastic/elasticsearch  → { owner: "elastic", repo: "elasticsearch" }
 */
export function parseGithubUrl(url) {
  if (!url) return null;
  const m = String(url).match(/github\.com[:/]([^/]+)\/([^/?#.]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

async function fetchContent(owner, repo, path) {
  const url = `${GH_BASE}/${owner}/${repo}/contents/${path}`;
  try {
    const res = await proxyFetch(url, { headers: { Accept: "application/vnd.github.v3.raw" } });
    return await res.text();
  } catch (err) {
    if (err instanceof ProxyError && err.status === 404) return null;
    throw err;
  }
}

/**
 * Try to fetch the most useful manifest/lockfile from a repo.
 * Returns { ecosystem, filename, content } or null.
 */
export async function fetchRepoManifest(repoUrl) {
  const parsed = parseGithubUrl(repoUrl);
  if (!parsed) {
    const e = new Error("Could not parse GitHub URL. Expected https://github.com/owner/repo");
    e.code = "BAD_INPUT";
    throw e;
  }
  const { owner, repo } = parsed;

  // Order: lockfile preferred, then manifest fallback
  const candidates = [
    { eco: "npm",  file: "package-lock.json" },
    { eco: "npm",  file: "package.json" },
    { eco: "PyPI", file: "requirements.txt" },
    { eco: "PyPI", file: "Pipfile.lock" },
  ];

  for (const c of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const content = await fetchContent(owner, repo, c.file);
    if (content) {
      return { ecosystem: c.eco, filename: c.file, content, owner, repo };
    }
  }

  const e = new Error(`No supported manifest found in ${owner}/${repo}.`);
  e.code = "NOT_FOUND";
  throw e;
}
