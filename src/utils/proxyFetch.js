/**
 * proxyFetch.js
 * CORS-proxied fetch with automatic fallback.
 * Primary:  corsproxy.io
 * Fallback: api.allorigins.win (returns JSON-wrapped body)
 */

const PROXIES = [
  {
    name: "corsproxy",
    wrap: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    unwrap: (res) => res, // returns raw response
  },
  {
    name: "allorigins",
    wrap: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    unwrap: (res) => res,
  },
];

export class ProxyError extends Error {
  constructor(message, { status, url, proxy } = {}) {
    super(message);
    this.name = "ProxyError";
    this.status = status;
    this.url    = url;
    this.proxy  = proxy;
  }
}

/**
 * Fetch a URL through a CORS proxy, falling back to alternates on failure.
 *
 * @param {string} url
 * @param {object} [options]   - fetch options
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<Response>}
 */
export async function proxyFetch(url, options = {}, { signal } = {}) {
  let lastErr = null;
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy.wrap(url), { ...options, signal });
      if (res.ok) return proxy.unwrap(res);
      // 404 from upstream is a "real" answer — don't cycle proxies for it
      if (res.status === 404) {
        throw new ProxyError(`Not found: ${url}`, { status: 404, url, proxy: proxy.name });
      }
      lastErr = new ProxyError(`HTTP ${res.status} via ${proxy.name}`, { status: res.status, url, proxy: proxy.name });
    } catch (err) {
      if (err instanceof ProxyError && err.status === 404) throw err;
      lastErr = err;
    }
  }
  throw lastErr || new ProxyError(`All proxies failed for ${url}`, { url });
}

/**
 * proxyJson — fetch + JSON parse with the same fallback behaviour.
 */
export async function proxyJson(url, options = {}, ctx = {}) {
  const res = await proxyFetch(url, options, ctx);
  return res.json();
}
