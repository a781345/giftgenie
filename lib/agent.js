// GiftGenie agent: resolve tastes -> ask Qloo for cross-domain affinities -> build a plan.
import { ENTITY_TYPES, searchResults, insightEntities, tagResults } from "./qloo.js";
import { writeNarrative } from "./llm.js";

const RESTAURANT_TAG = "urn:tag:category:place:restaurant";
const clean = (list, max = 3) =>
  (Array.isArray(list) ? list : String(list || "").split(/[,，\n]/))
    .map((s) => String(s).trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, max);

const tagNames = (e) => (e.tags || []).map((t) => t.name).filter(Boolean);

function explain(pick, signals) {
  const mine = new Set(tagNames(pick));
  const links = signals
    .map((s) => ({ name: s.name, shared: tagNames(s).filter((t) => mine.has(t)) }))
    .filter((l) => l.shared.length)
    .sort((a, b) => b.shared.length - a.shared.length);
  const affinity = pick.query?.affinity;
  const because = links.length
    ? `Fans of ${links.slice(0, 2).map((l) => l.name).join(" & ")} over-index on this — shared taste notes: ${[...new Set(links.flatMap((l) => l.shared))].slice(0, 3).join(", ")}.`
    : `Qloo's taste graph links this to the overall profile (${signals.slice(0, 2).map((s) => s.name).join(", ")}) even without an obvious shared genre — a nice discovery.`;
  return { because, affinity, sharedWith: links.map((l) => l.name) };
}

const slim = (e, signals) => ({
  entity_id: e.entity_id,
  name: e.name,
  subtype: e.subtype || e.subtypes?.[0] || e.type,
  popularity: e.popularity,
  affinity: e.query?.affinity,
  tags: tagNames(e).slice(0, 5),
  description: e.properties?.short_description || e.properties?.description || "",
  year: e.properties?.release_year || e.properties?.publication_year,
  address: e.properties?.address,
  price_level: e.properties?.price_level,
  rating: e.properties?.business_rating,
  image: e.properties?.image?.url || "",
  reason: explain(e, signals),
});

export async function runAgent(qloo, input, env = process.env) {
  const trace = [];
  const t0 = Date.now();
  const log = (step, request, summary) => trace.push({ step, request, summary, ms: Date.now() - t0 });

  const movies = clean(input.movies);
  const music = clean(input.music);
  const books = clean(input.books, 2);
  const food = clean(input.food);
  const city = String(input.city || "").trim().slice(0, 60);
  const occasion = ["date", "gift", "both"].includes(input.occasion) ? input.occasion : "both";
  if (!movies.length && !music.length && !books.length) {
    throw Object.assign(new Error("Add at least one movie, artist or book they love."), { status: 400 });
  }

  // 1) Resolve free text to Qloo entities (only cultural titles are sent — no personal data).
  const seeds = [
    ...movies.map((q) => ({ q, types: ENTITY_TYPES.movie })),
    ...music.map((q) => ({ q, types: ENTITY_TYPES.artist })),
    ...books.map((q) => ({ q, types: ENTITY_TYPES.book })),
  ];
  const resolved = await Promise.all(
    seeds.map(async ({ q, types }) => {
      const r = await qloo.search({ query: q, types, take: 1 });
      const top = searchResults(r)[0];
      return { input: q, types, match: top || null };
    }),
  );
  resolved.forEach((r) =>
    log("search", { endpoint: "/search", query: r.input, types: r.types, take: 1 }, r.match ? `→ ${r.match.name} (${r.match.entity_id})` : "no match"),
  );
  const signals = resolved.map((r) => r.match).filter(Boolean);
  if (!signals.length) throw Object.assign(new Error("Qloo couldn't match any of those titles. Try more specific names."), { status: 422 });
  const signalIds = signals.map((s) => s.entity_id).join(",");

  // 2) Cuisine words -> Qloo restaurant genre tags.
  const cuisineTags = [];
  for (const f of food) {
    const r = await qloo.tags({ query: f, tagTypes: "urn:tag:genre:place:restaurant", take: 1 });
    const t = tagResults(r)[0];
    log("tags", { endpoint: "/v2/tags", "filter.query": f, "filter.tag.types": "urn:tag:genre:place:restaurant", take: 1 }, t ? `→ ${t.name} (${t.id})` : "no tag");
    if (t) cuisineTags.push(t);
  }

  // 3) Cross-domain recommendations from the same taste signal.
  const ask = async (label, params) => {
    const p = { "signal.interests.entities": signalIds, take: 5, ...params };
    try {
      const r = await qloo.insights(p);
      const list = insightEntities(r);
      log("insights", { endpoint: "/v2/insights", ...p }, `${label}: ${list.length} results`);
      return list;
    } catch (err) {
      log("insights", { endpoint: "/v2/insights", ...p }, `${label}: error — ${err.message}`);
      return [];
    }
  };
  const wantDate = occasion !== "gift";
  const wantGift = occasion !== "date";
  const [restaurants, recMovies, recArtists, recBooks, recBrands] = await Promise.all([
    wantDate && city
      ? ask("restaurants", { "filter.type": ENTITY_TYPES.place, "filter.tags": [RESTAURANT_TAG, ...cuisineTags.map((t) => t.id)].join(","), "filter.location.query": city })
      : [],
    wantDate ? ask("movies", { "filter.type": ENTITY_TYPES.movie }) : [],
    ask("artists", { "filter.type": ENTITY_TYPES.artist }),
    wantGift ? ask("books", { "filter.type": ENTITY_TYPES.book }) : [],
    wantGift ? ask("brands", { "filter.type": ENTITY_TYPES.brand }) : [],
  ]);

  const S = (list) => list.map((e) => slim(e, signals));
  const picks = {
    restaurants: S(restaurants),
    movies: S(recMovies),
    artists: S(recArtists),
    books: S(recBooks),
    brands: S(recBrands),
  };

  // 4) Plan (deterministic skeleton; LLM only rewrites the copy, never invents picks).
  const plan = buildPlan({ picks, occasion, city, cuisineTags, budget: input.budget });
  const narrative = await writeNarrative({ plan, picks, signals: signals.map((s) => s.name), occasion, city }, env);
  if (narrative.source === "llm") log("llm", { provider: narrative.provider, model: narrative.model }, "narrative written from Qloo picks");

  return {
    mode: qloo.mode,
    occasion,
    city,
    resolved: resolved.map((r) => ({ input: r.input, type: r.types, match: r.match ? { name: r.match.name, entity_id: r.match.entity_id, tags: tagNames(r.match).slice(0, 4) } : null })),
    cuisineTags: cuisineTags.map((t) => ({ id: t.id, name: t.name })),
    picks,
    plan,
    narrative,
    trace,
  };
}

const priceOk = (p, budget) => {
  const max = { low: 2, mid: 3, high: 4 }[budget] || 4;
  return !p.price_level || p.price_level <= max;
};

function buildPlan({ picks, occasion, city, cuisineTags, budget }) {
  const steps = [];
  const gifts = [];
  const dinner = picks.restaurants.find((p) => priceOk(p, budget)) || picks.restaurants[0];
  const film = picks.movies[0];
  const artist = picks.artists[0];
  if (occasion !== "gift") {
    if (dinner)
      steps.push({ time: "19:00", title: `Dinner at ${dinner.name}`, detail: [dinner.address, dinner.tags.slice(1, 3).join(" · "), dinner.price_level ? "$".repeat(dinner.price_level) : ""].filter(Boolean).join(" — "), pick: dinner });
    else if (!city) steps.push({ time: "19:00", title: "Dinner", detail: "Add a city to get Qloo restaurant picks nearby.", pick: null });
    if (artist) steps.push({ time: "20:45", title: `Walk home playlist: ${artist.name}`, detail: picks.artists.slice(1, 4).map((a) => a.name).join(", ") ? `Then ${picks.artists.slice(1, 4).map((a) => a.name).join(", ")}` : "", pick: artist });
    if (film) steps.push({ time: "21:30", title: `Movie night: ${film.name}${film.year ? ` (${film.year})` : ""}`, detail: film.description, pick: film });
  }
  if (occasion !== "date") {
    if (picks.books[0]) gifts.push({ kind: "Book", title: picks.books[0].name, idea: `A copy of “${picks.books[0].name}” with a handwritten note on the first page.`, pick: picks.books[0] });
    if (picks.brands[0]) gifts.push({ kind: "Brand", title: picks.brands[0].name, idea: `Something small from ${picks.brands[0].name} — ${picks.brands[0].description || "a brand their taste profile over-indexes on"}.`, pick: picks.brands[0] });
    if (picks.brands[1]) gifts.push({ kind: "Brand", title: picks.brands[1].name, idea: `Backup idea: ${picks.brands[1].name}${picks.brands[1].description ? ` (${picks.brands[1].description})` : ""}.`, pick: picks.brands[1] });
    if (artist) gifts.push({ kind: "Music", title: artist.name, idea: `A vinyl or concert tickets for ${artist.name}.`, pick: artist });
  }
  const headline =
    occasion === "gift"
      ? "A gift shortlist built from their taste profile"
      : `An evening${city ? ` in ${city}` : ""} built from what they love${cuisineTags.length ? ` (${cuisineTags.map((t) => t.name).join(", ")})` : ""}`;
  return { headline, steps, gifts };
}
