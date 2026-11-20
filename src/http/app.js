import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeCosts, normalizeBudgetEvent } from "../domain/analyze-costs.js";

const publicDirectory = fileURLToPath(new URL("../../public/", import.meta.url));
const staticFiles = new Map([
  ["/", "index.html"],
  ["/app.js", "app.js"],
  ["/styles.css", "styles.css"]
]);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8"
};

function sendJson(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 131_072) throw new Error("Request body is too large.");
  }
  return body ? JSON.parse(body) : {};
}

function decodePubSubEnvelope(body) {
  if (!body.message?.data) return body;
  const decoded = Buffer.from(body.message.data, "base64").toString("utf8");
  return JSON.parse(decoded);
}

function authorized(request, expectedToken) {
  if (!expectedToken) return true;
  return request.headers.authorization === `Bearer ${expectedToken}`;
}

export function createApp({ store, ingestToken = process.env.INGEST_TOKEN } = {}) {
  if (!store) throw new Error("A store is required.");

  return async function handler(request, response) {
    const url = new URL(request.url, "http://localhost");

    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        return sendJson(response, 200, { status: "ok", service: "cloudspend-sentinel" });
      }

      if (request.method === "GET" && url.pathname === "/api/summary") {
        const [records, budget, alerts] = await Promise.all([
          store.getCosts(),
          store.getBudget(),
          store.getAlerts()
        ]);
        return sendJson(response, 200, { ...analyzeCosts(records, budget), alerts: alerts.slice(0, 5) });
      }

      if (request.method === "GET" && url.pathname === "/api/costs") {
        return sendJson(response, 200, { records: await store.getCosts() });
      }

      if (request.method === "GET" && url.pathname === "/api/alerts") {
        return sendJson(response, 200, { alerts: await store.getAlerts() });
      }

      if (request.method === "POST" && ["/api/budget-events", "/api/simulate"].includes(url.pathname)) {
        if (!authorized(request, ingestToken)) {
          return sendJson(response, 401, { error: "Unauthorized" });
        }
        const envelope = await readJson(request);
        const alert = normalizeBudgetEvent(decodePubSubEnvelope(envelope));
        await store.saveAlert(alert);
        return sendJson(response, 202, { accepted: true, alert });
      }

      const filename = staticFiles.get(url.pathname);
      if (request.method === "GET" && filename) {
        const path = join(publicDirectory, filename);
        const content = await readFile(path);
        response.writeHead(200, { "content-type": contentTypes[extname(path)] });
        return response.end(content);
      }

      return sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      const status = error instanceof SyntaxError ? 400 : 422;
      return sendJson(response, status, { error: error.message });
    }
  };
}
