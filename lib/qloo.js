// Qloo Taste AI client.
// Mirrors the request shape used by the official @qloo/qloo-harness (`qloo api`):
//   GET {base}/search            ?query=&types=&take=
//   GET {base}/v2/tags           ?filter.query=&filter.tag.types=&take=
//   GET {base}/v2/insights       ?filter.type=&signal.interests.entities=&filter.tags=&filter.location.query=&take=
// Auth: X-Api-Key header. The key only ever lives on the server.
import { createMockQloo } from "./mock.js";

export const ENTITY_TYPES = {
  movie: "urn:entity:movie",
  tv_show: "urn:entity:tv_show",
  artist: "urn:entity:artist",
  book: "urn:entity:book",
  brand: "urn:entity:brand",
  place: "urn:entity:place",
  destination: "urn:entity:destination",
};

export class QlooError extends Error {
  constructor(message, { status, retryable = false } = {}) {
    super(message);
    this.name = "QlooError";
    this.status = status;
    this.retryable = retryable;
  }
}

export function createLiveQloo({ apiKey, baseUrl = "https://api.qloo.com", timeoutMs = 12000 }) {
  const base = baseUrl.replace(/\/+$/, "") + "/";
  const cache = new Map(); // small in-memory cache to respect the event quota

  async function request(endpoint, params = {}, attempt = 0) {
    const url = new URL(endpoint.replace(/^\//, ""), base);
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }
    const key = url.toString();
    if (cache.has(key)) return cache.get(key);

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(key, {
        headers: { "X-Api-Key": apiKey, Accept: "application/json" },
        signal: ctrl.signal,
      });
    } catch (err) {
      throw new QlooError(`Qloo network error: ${err.message}`, { retryable: true });
    } finally {
      clearTimeout(t);
    }
    if (res.status === 429 && attempt < 1) {
      await new Promise((r) => setTimeout(r, 1200)); // one bounded retry
      return request(endpoint, params, attempt + 1);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg =
        res.status === 401 || res.status === 403
          ? "Qloo rejected the API key (QLOO_AUTH)."
          : res.status === 429
            ? "Qloo rate limit reached. Try again shortly."
            : body.message || body.error?.message || `Qloo request failed: ${res.status}`;
      throw new QlooError(msg, { status: res.status, retryable: res.status >= 500 || res.status === 429 });
    }
    const json = await res.json();
    if (cache.size > 500) cache.clear();
    cache.set(key, json);
    return json;
  }

  return {
    mode: "live",
    search: ({ query, types, take = 3 }) => request("/search", { query, types, take }),
    tags: ({ query, tagTypes, take = 3 }) =>
      request("/v2/tags", { "filter.query": query, "filter.tag.types": tagTypes, take }),
    insights: (params) => request("/v2/insights", params),
  };
}

export function createQloo(env = process.env) {
  const apiKey = (env.QLOO_API_KEY || "").trim();
  if (!apiKey || env.QLOO_MOCK === "1") return createMockQloo();
  return createLiveQloo({ apiKey, baseUrl: env.QLOO_BASE_URL || "https://api.qloo.com" });
}

// Helpers to read responses defensively (search returns `results: []`,
// insights returns `results: { entities: [] }`, tags returns `results: { tags: [] }`).
export const searchResults = (r) => (Array.isArray(r?.results) ? r.results : r?.results?.entities || []);
export const insightEntities = (r) => r?.results?.entities || [];
export const tagResults = (r) => r?.results?.tags || (Array.isArray(r?.results) ? r.results : []);
