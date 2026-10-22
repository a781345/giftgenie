const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const form = $("#form");
const out = $("#results");

fetch("/api/status").then((r) => r.json()).then((s) => {
  $("#status").innerHTML =
    `<span class="badge ${s.qloo}">${s.qloo === "live" ? "● Qloo live" : "● Qloo mock data"}</span>` +
    `<span class="badge">${s.llm === "on" ? "LLM narrative on" : "Deterministic planner"}</span>`;
});

$("#example").onclick = () => {
  const ex = { movies: "Amélie, Spirited Away", music: "Beach House, Norah Jones", books: "Norwegian Wood", food: "Japanese, dessert", city: "Hong Kong" };
  for (const [k, v] of Object.entries(ex)) form.elements[k].value = v;
};

const why = (p) => {
  if (!p?.reason) return "";
  const a = typeof p.affinity === "number" ? Math.round(p.affinity * 100) : null;
  return `<div class="why"><b>Why:</b> ${esc(p.reason.because)}
    ${a !== null ? `<div class="aff"><span>Qloo affinity</span><span class="bar"><i style="width:${a}%"></i></span><span>${a}%</span></div>` : ""}</div>`;
};

const mini = (list, label) =>
  list?.length
    ? `<h2>${label}</h2><div class="more">${list.slice(0, 4).map((p) => `<div class="mini"><b>${esc(p.name)}</b>${p.year ? `<span class="tags">${p.year} · </span>` : ""}<span class="tags">${esc(p.tags.slice(0, 3).join(" · "))}</span></div>`).join("")}</div>`
    : "";

function render(d) {
  const r = d.resolved.map((x) => (x.match ? `<span class="chip ok" title="${esc(x.match.entity_id)}">${esc(x.input)} → ${esc(x.match.name)}</span>` : `<span class="chip miss">${esc(x.input)}: no match</span>`)).join("");
  const cuisines = d.cuisineTags.map((t) => `<span class="chip ok" title="${esc(t.id)}">${esc(t.name)}</span>`).join("");
  const steps = d.plan.steps.length
    ? `<h2>The evening</h2><ul class="timeline">${d.plan.steps.map((s) => `<li><span class="time">${esc(s.time)}</span><div class="step-title">${esc(s.title)}</div><div class="step-detail">${esc(s.detail || "")}</div>${why(s.pick)}</li>`).join("")}</ul>`
    : "";
  const gifts = d.plan.gifts.length
    ? `<h2>Gift shortlist</h2><div class="grid">${d.plan.gifts.map((g) => `<div class="gift"><div class="kind">${esc(g.kind)}</div><div class="title">${esc(g.title)}</div><p>${esc(g.idea)}</p>${why(g.pick)}</div>`).join("")}</div>`
    : "";
  const trace = d.trace.map((t) => `<div><span class="ep">${esc(t.request.endpoint || t.step)}</span> ${esc(Object.entries(t.request).filter(([k]) => k !== "endpoint").map(([k, v]) => `${k}=${v}`).join("&"))}<br>↳ ${esc(t.summary)}</div>`).join("");

  out.innerHTML = `
    <p class="headline">${esc(d.plan.headline)}</p>
    <div class="chips">${r}${cuisines}</div>
    <div class="summary"><div class="src">${d.narrative.source === "llm" ? "Written by LLM from Qloo picks" : "Plan summary"}</div>${esc(d.narrative.summary)}
      <div class="card-note">💌 “${esc(d.narrative.card)}”</div></div>
    ${steps}${gifts}
    ${mini(d.picks.movies.slice(1), "More films for them")}
    ${mini(d.picks.books.slice(d.plan.gifts.length ? 1 : 0), "More books")}
    ${mini(d.picks.restaurants.slice(1), "Other restaurants")}
    <details><summary>🔍 How Qloo powered this plan (${d.trace.length} calls${d.mode === "mock" ? ", mock data" : ""})</summary><div class="trace">${trace}</div></details>
    <p class="disclaimer">Qloo results describe aggregate taste affinities among people who like similar things — great starting points, not facts about your person. ${d.mode === "mock" ? "This demo is running on fixture data; restaurant names marked (mock) are placeholders." : ""}</p>`;
}

form.onsubmit = async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(form));
  $("#go").disabled = true;
  out.innerHTML = `<div class="loading"><div class="spinner"></div>Reading the taste graph…</div>`;
  try {
    const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    render(data);
  } catch (err) {
    out.innerHTML = `<div class="err">${esc(err.message)}</div>`;
  } finally {
    $("#go").disabled = false;
  }
};

// ?demo=1 pre-fills the example and runs it (handy for screenshots / judges).
if (new URLSearchParams(location.search).has("demo")) {
  $("#example").click();
  form.requestSubmit();
}
