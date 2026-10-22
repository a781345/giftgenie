// Mock Qloo: deterministic, offline, response shapes match the live API.
import { ALL, ALL_TAGS } from "./fixtures.js";

const hash = (s) => {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
};
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const clone = (x) => JSON.parse(JSON.stringify(x));
const byId = new Map(Object.values(ALL).flat().map((x) => [x.entity_id, x]));
const synthetic = new Map();

function similarity(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (b.includes(a) || a.includes(b)) return 0.8;
  const A = new Set(a.split(" ")), B = new Set(b.split(" "));
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / Math.max(A.size, B.size);
}

const wrap = (results) => ({ success: true, results, duration: 12 + (hash(JSON.stringify(results).length) % 40) });

export function createMockQloo() {
  return {
    mode: "mock",
    async search({ query, types, take = 3 }) {
      const pool = types ? ALL[types] || [] : Object.values(ALL).flat();
      const scored = pool.map((x) => ({ x, s: similarity(query, x.name) })).filter((p) => p.s >= 0.5).sort((a, b) => b.s - a.s);
      let out = scored.slice(0, take).map((p) => clone(p.x));
      if (!out.length && query) {
        // Unknown title: synthesise a plausible entity so the flow still works offline.
        const h = hash(query + types);
        const tagsPool = ALL_TAGS.filter((t) => t.type.includes(types?.includes("artist") ? "music" : types?.includes("place") ? "place" : "media"));
        const ent = {
          name: query.replace(/\b\w/g, (c) => c.toUpperCase()),
          entity_id: h.toString(16).toUpperCase().padStart(8, "0") + "-MOCK-4000-A000-" + (h * 7).toString(16).toUpperCase().slice(0, 12).padStart(12, "0"),
          type: "urn:entity",
          subtype: types || "urn:entity:movie",
          properties: { description: "(mock) entity synthesised for an unrecognised query" },
          popularity: 0.7 + (h % 25) / 100,
          tags: [tagsPool[h % tagsPool.length], tagsPool[(h >> 3) % tagsPool.length]].filter(Boolean),
        };
        synthetic.set(ent.entity_id, ent);
        out = [ent];
      }
      return { results: out };
    },

    async tags({ query, take = 3 }) {
      const q = norm(query);
      const hits = ALL_TAGS.filter((t) => norm(t.name).includes(q) || q.includes(norm(t.name)))
        .slice(0, take)
        .map((t) => ({ id: t.id, name: t.name, types: [t.type], parents: [] }));
      return wrap({ tags: hits });
    },

    async insights(params) {
      const type = params["filter.type"];
      const take = Number(params.take || 5);
      const signalIds = String(params["signal.interests.entities"] || "").split(",").filter(Boolean);
      const filterTags = String(params["filter.tags"] || "").split(",").filter(Boolean);
      const city = params["filter.location.query"] || "your city";
      const signals = signalIds.map((i) => byId.get(i) || synthetic.get(i)).filter(Boolean);
      const signalTagNames = new Set(signals.flatMap((s) => s.tags.map((t) => t.name)));
      const seed = hash(signalIds.join(","));

      let pool = (ALL[type] || []).filter((x) => !signalIds.includes(x.entity_id));
      if (filterTags.length) {
        const f = pool.filter((x) => x.tags.some((t) => filterTags.includes(t.id) && t.id !== "urn:tag:category:place:restaurant"));
        if (f.length) pool = f;
      }
      const ranked = pool
        .map((x) => {
          const overlap = x.tags.filter((t) => signalTagNames.has(t.name)).length;
          const jitter = (hash(x.entity_id + seed) % 100) / 1000;
          return { x, score: overlap * 0.08 + jitter + x.popularity * 0.2 };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, take);
      const entities = ranked.map(({ x }, i) => {
        const c = clone(x);
        if (c.properties.address) c.properties.address = `${c.properties.address.replace("{city}", city)}`;
        c.query = { affinity: Math.round((0.97 - i * 0.045 - (hash(x.entity_id + seed) % 20) / 1000) * 1000) / 1000, measurements: { audience_growth: Math.round(((hash(c.entity_id) % 40) - 10) / 1000 * 1000) / 1000 } };
        return c;
      });
      return wrap({ entities });
    },
  };
}
