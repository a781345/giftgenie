// End-to-end smoke test in mock mode (no network).
import { createMockQloo } from "../lib/mock.js";
import { runAgent } from "../lib/agent.js";
const r = await runAgent(createMockQloo(), { occasion: "both", movies: "Amélie, Spirited Away", music: "Beach House", books: "Norwegian Wood", food: "Japanese, dessert", city: "Hong Kong", budget: "mid" }, {});
console.log(JSON.stringify({ resolved: r.resolved.map((x) => x.match?.name), cuisines: r.cuisineTags, steps: r.plan.steps.map((s) => s.title), gifts: r.plan.gifts.map((g) => g.title), narrative: r.narrative, calls: r.trace.length, sampleReason: r.plan.steps[0]?.pick?.reason }, null, 2));
const ok = r.plan.steps.length >= 2 && r.plan.gifts.length >= 2 && r.resolved.every((x) => x.match);
if (!ok) { console.error("SMOKE FAILED"); process.exit(1); }
console.log("SMOKE OK");
