/**
 * semver.js
 * Minimal semver utilities — version comparison and range satisfaction.
 * Sufficient for npm/PyPI vulnerability checks.
 */

/**
 * Parse a version string like "1.2.3-beta.1" → [1,2,3,"beta.1"]
 */
export function parseVersion(v) {
  if (!v) return null;
  const cleaned = String(v).trim().replace(/^[v=^~><\s]+/, "");
  const m = cleaned.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+](.+))?/);
  if (!m) {
    // Handle "1.2" / "1" partials
    const partial = cleaned.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    if (!partial) return null;
    return [+partial[1], +(partial[2] || 0), +(partial[3] || 0), null];
  }
  return [+m[1], +m[2], +m[3], m[4] || null];
}

/**
 * Compare two versions: -1 if a<b, 0 if equal, 1 if a>b.
 * Pre-release versions sort lower than their base.
 */
export function cmpVersion(a, b) {
  const pa = parseVersion(a), pb = parseVersion(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  if (pa[3] && !pb[3]) return -1;
  if (!pa[3] && pb[3]) return 1;
  if (pa[3] && pb[3]) return pa[3] < pb[3] ? -1 : pa[3] > pb[3] ? 1 : 0;
  return 0;
}

/**
 * Check if version `v` is contained in a range string.
 *
 * Accepts:
 *   "<=2.14.1"      "<2.17.0"        ">=1.0.0"
 *   ">=2.0.0 <2.17.0"   (intersection)
 *   ">=2.0.0,<2.17.0"   (PyPI style commas)
 *   "[2.0.0,2.17.0)"    (Maven/NVD style)
 *   "1.2.3"             (exact)
 */
export function satisfies(version, range) {
  if (!version || !range) return false;
  const v = parseVersion(version);
  if (!v) return false;

  // Maven [a,b) / (a,b] / [a,b]
  const mvn = String(range).match(/^([\[(])\s*([\d.]+)?\s*,\s*([\d.]+)?\s*([\])])$/);
  if (mvn) {
    const [, lo, lov, hiv, hi] = mvn;
    const checks = [];
    if (lov) checks.push(lo === "[" ? cmpVersion(version, lov) >= 0 : cmpVersion(version, lov) > 0);
    if (hiv) checks.push(hi === "]" ? cmpVersion(version, hiv) <= 0 : cmpVersion(version, hiv) < 0);
    return checks.every(Boolean);
  }

  // Compound: "X Y" or "X, Y" or "X && Y" — all must be satisfied
  const parts = String(range).split(/[\s,&]+/).filter(Boolean);
  if (parts.length > 1) return parts.every(p => satisfies(version, p));

  const single = parts[0] || range;
  const m = String(single).match(/^(<=|>=|<|>|=|==|!=|~|\^)?\s*v?([\d.][\w.+-]*)$/);
  if (!m) return false;
  const op = m[1] || "=";
  const target = m[2];
  const c = cmpVersion(version, target);

  switch (op) {
    case "<":  return c < 0;
    case "<=": return c <= 0;
    case ">":  return c > 0;
    case ">=": return c >= 0;
    case "!=": return c !== 0;
    case "=":
    case "==": return c === 0;
    case "~": {  // ~1.2.3 → >=1.2.3 <1.3.0
      const t = parseVersion(target);
      if (!t) return false;
      return c >= 0 && (v[0] === t[0] && v[1] === t[1]);
    }
    case "^": {  // ^1.2.3 → >=1.2.3 <2.0.0
      const t = parseVersion(target);
      if (!t) return false;
      return c >= 0 && v[0] === t[0];
    }
    default: return c === 0;
  }
}

/**
 * Strip range operators to a usable version-ish string.
 * Useful for taking a manifest entry like "^4.17.20" → "4.17.20"
 */
export function coerce(spec) {
  if (!spec) return null;
  const m = String(spec).match(/(\d+(?:\.\d+){0,2}[\w.+-]*)/);
  return m ? m[1] : null;
}
