// Optional LLM narrative. Any OpenAI-compatible Chat Completions endpoint works
// (default: OpenAI gpt-4o-mini). No key -> deterministic copy.
export async function writeNarrative(ctx, env = process.env) {
  const fallback = deterministic(ctx);
  const key = (env.LLM_API_KEY || env.OPENAI_API_KEY || "").trim();
  if (!key) return fallback;
  const base = (env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = env.LLM_MODEL || "gpt-4o-mini";
  const compact = {
    occasion: ctx.occasion,
    city: ctx.city,
    loves: ctx.signals,
    steps: ctx.plan.steps.map((s) => ({ time: s.time, title: s.title, why: s.pick?.reason?.because })),
    gifts: ctx.plan.gifts.map((g) => ({ title: g.title, idea: g.idea, why: g.pick?.reason?.because })),
  };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 350,
        messages: [
          { role: "system", content: "You are GiftGenie. Write a warm, concise plan summary (max 110 words) and a one-sentence gift card message. Use ONLY the places, titles and brands provided; never invent new ones. Do not claim certainty about the person's preferences — these are taste affinities. Reply as JSON: {\"summary\": string, \"card\": string}." },
          { role: "user", content: JSON.stringify(compact) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    if (!parsed.summary) throw new Error("empty");
    return { source: "llm", provider: base.includes("openai.com") ? "openai" : base, model, summary: parsed.summary, card: parsed.card || fallback.card };
  } catch (err) {
    return { ...fallback, note: `LLM unavailable (${err.message}); used deterministic copy.` };
  }
}

function deterministic({ plan, signals, occasion, city }) {
  const loves = signals.slice(0, 3).join(", ");
  const parts = [];
  if (occasion !== "gift" && plan.steps.length) {
    const d = plan.steps.find((s) => s.title.startsWith("Dinner at"));
    const m = plan.steps.find((s) => s.title.startsWith("Movie night"));
    const a = plan.steps.find((s) => s.title.startsWith("Walk home"));
    const bits = [d && `dinner at ${d.pick?.name}${city ? ` in ${city}` : ""}`, a && `${a.pick?.name} on the walk home`, m && `${m.pick?.name} to close the night`].filter(Boolean);
    if (bits.length) parts.push(`Plan: ${bits.join(", then ")}.`);
  }
  if (occasion !== "date" && plan.gifts.length) {
    parts.push(`For a gift, ${plan.gifts[0].title} leads the shortlist${plan.gifts[1] ? `, with ${plan.gifts[1].title} as a strong alternative` : ""}.`);
  }
  parts.push(`Every pick comes from Qloo's taste graph, seeded with ${loves}.`);
  return {
    source: "deterministic",
    summary: parts.join(" "),
    card: `Saw this and thought of you — it has the same magic as ${signals[0] || "your favourites"}.`,
  };
}
