/**
 * geminiApi.js
 * Centralised Gemini 2.0 Flash API helpers for RippleAlert.
 * Import the functions you need rather than calling fetch() directly.
 */

const GEMINI_MODEL = "gemini-2.0-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// ── Low-level fetch wrapper ──────────────────────────────────────────────────

/**
 * Send a prompt to Gemini and return the text response.
 * Throws an Error with a descriptive message on any failure.
 *
 * @param {string} apiKey     - Gemini API key
 * @param {string} prompt     - Plain-text prompt
 * @param {object} [config]   - Optional generationConfig overrides
 * @returns {Promise<string>}
 */
export async function callGemini(apiKey, prompt, config = {}) {
  if (!apiKey) throw new Error("No Gemini API key configured. Add one in Settings.");

  const url = `${BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 1200,
        temperature: 0.7,
        ...config,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error (HTTP ${res.status})`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

/**
 * Lightweight connectivity ping — uses minimal tokens.
 * Resolves to true if the key is valid, throws otherwise.
 *
 * @param {string} apiKey
 * @returns {Promise<true>}
 */
export async function pingGemini(apiKey) {
  await callGemini(apiKey, "ping", { maxOutputTokens: 8 });
  return true;
}

// ── Prompt builders ──────────────────────────────────────────────────────────

/**
 * Build a patch-request GitHub issue body for one affected project.
 *
 * @param {object} cveData  - CVE object from cve_cache
 * @param {object} project  - Entry from cveData.affectedProjects
 * @returns {string}        - Prompt string
 */
export function buildPatchIssuePrompt(cveData, project) {
  const level = project.dependencyType === "direct" ? 0 : project.level ?? 1;
  const chain = project.exposureChain
    || `${project.name}@${project.version} → ${cveData.affectedPackage}@${cveData.affectedVersionRange}`;

  return `You are a security engineer writing a GitHub issue to notify a package maintainer of a vulnerability.

CVE: ${cveData.id}
CVSS Score: ${cveData.cvssScore}
Severity: ${project.severity || cveData.severity}
Vulnerable package: ${cveData.affectedPackage} ${cveData.affectedVersionRange}
Affected project: ${project.name}
Exposure level: Level ${level}
Exposure chain: ${chain}
Fixed version: ${cveData.fixedVersion || "(no fix published yet)"}

Write a professional GitHub issue in Markdown with these sections:
- Title (include CVE ID, package name, severity)
- Summary (2-3 sentences explaining the exposure)
- Exposure chain (show the exact dependency path)
- Impact (what could happen if exploited)
- Recommended fix (exact version bump with code snippet)
- References (link to NVD entry: https://nvd.nist.gov/vuln/detail/${cveData.id})

Be specific, not generic. Write as if you are actually going to post this issue.`;
}

/**
 * Build a general remediation summary prompt for an entire CVE.
 *
 * @param {object} cveData - CVE object from cve_cache
 * @returns {string}
 */
export function buildRemediationSummaryPrompt(cveData) {
  const affectedCount = cveData.affectedProjects?.length || 0;
  return `You are a senior application security engineer. Write a concise remediation brief (Markdown) for the following CVE.

CVE ID: ${cveData.id}
CVSS Score: ${cveData.cvssScore}/10
Severity: ${cveData.severity}
Affected Package: ${cveData.affectedPackage}
Affected Versions: ${cveData.affectedVersionRange}
Fixed Version: ${cveData.fixedVersion}
Ecosystem: ${cveData.ecosystem}
Description: ${cveData.description}
Downstream projects affected: ${affectedCount}

Include:
- ## Executive Summary (2–3 sentences)
- ## Impact Assessment
- ## Remediation Steps (numbered)
- ## Verification Checklist
- ## References`;
}

// ── High-level helpers ───────────────────────────────────────────────────────

/**
 * Generate a patch-request issue body for one project.
 *
 * @param {string} apiKey
 * @param {object} cveData
 * @param {object} project
 * @returns {Promise<string>} Markdown issue body
 */
export async function generatePatchIssue(apiKey, cveData, project) {
  const prompt = buildPatchIssuePrompt(cveData, project);
  return callGemini(apiKey, prompt);
}

/**
 * Generate a full CVE remediation summary.
 *
 * @param {string} apiKey
 * @param {object} cveData
 * @returns {Promise<string>} Markdown remediation brief
 */
export async function generateRemediationSummary(apiKey, cveData) {
  const prompt = buildRemediationSummaryPrompt(cveData);
  return callGemini(apiKey, prompt, { maxOutputTokens: 1500 });
}
