import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createQloo } from "./lib/qloo.js";
import { runAgent } from "./lib/agent.js";

// Minimal .env loader (no dependencies).
try {
  const txt = await readFile(new URL("./.env", import.meta.url), "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const PUBLIC = fileURLToPath(new URL("./public/", import.meta.url));
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };
const qloo = createQloo();
const llmOn = Boolean((process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "").trim());

// Tiny per-IP rate limit to protect the Qloo quota on a public demo.
const hits = new Map();
const limited = (ip) => {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 10;
};

const send = (res, status, body, type = "application/json") => {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/api/status") return send(res, 200, { qloo: qloo.mode, llm: llmOn ? "on" : "off" });
    if (url.pathname === "/api/plan" && req.method === "POST") {
      const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
      if (limited(ip)) return send(res, 429, { error: "Too many plans — give it a minute." });
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 20_000) return send(res, 413, { error: "Request too large" });
      }
      const input = JSON.parse(raw || "{}");
      const result = await runAgent(qloo, input);
      return send(res, 200, result);
    }
    if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });
    const path = normalize(url.pathname === "/" ? "/index.html" : url.pathname).replace(/^(\.\.[/\\])+/, "");
    const file = join(PUBLIC, path);
    if (!file.startsWith(PUBLIC)) return send(res, 403, { error: "Forbidden" });
    const data = await readFile(file).catch(() => null);
    if (!data) return send(res, 404, "Not found", "text/plain");
    return send(res, 200, data, TYPES[extname(file)] || "application/octet-stream");
  } catch (err) {
    console.error("[error]", err.message);
    return send(res, err.status || 500, { error: err.status ? err.message : "Something went wrong. Please try again." });
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`GiftGenie on http://localhost:${port}  (qloo: ${qloo.mode}, llm: ${llmOn ? "on" : "off"})`));
