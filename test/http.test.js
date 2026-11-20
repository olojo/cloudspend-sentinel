import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createApp } from "../src/http/app.js";
import { MemoryStore } from "../src/store/memory-store.js";

async function invoke(handler, { method = "GET", path = "/", headers = {}, body } = {}) {
  const requestBody = body === undefined ? [] : [Buffer.from(JSON.stringify(body))];
  const request = Readable.from(requestBody);
  request.method = method;
  request.url = path;
  request.headers = headers;

  let status;
  let responseHeaders;
  let responseBody = "";
  const response = {
    writeHead(nextStatus, nextHeaders) {
      status = nextStatus;
      responseHeaders = nextHeaders;
    },
    end(chunk = "") {
      responseBody += chunk.toString();
    }
  };

  await handler(request, response);
  return {
    status,
    headers: responseHeaders,
    json: () => JSON.parse(responseBody)
  };
}

test("health endpoint reports service status", async () => {
  const handler = createApp({ store: new MemoryStore() });
  const response = await invoke(handler, { path: "/api/health" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.json(), { status: "ok", service: "cloudspend-sentinel" });
});

test("summary endpoint returns budget and anomaly data", async () => {
  const handler = createApp({ store: new MemoryStore() });
  const response = await invoke(handler, { path: "/api/summary" });
  const summary = response.json();

  assert.equal(response.status, 200);
  assert.equal(summary.anomalies[0].service, "Compute Engine");
  assert.ok(summary.services.length >= 4);
});

test("ingestion endpoint accepts Pub/Sub envelopes and enforces its token", async () => {
  const handler = createApp({ store: new MemoryStore(), ingestToken: "test-token" });
  const payload = Buffer.from(JSON.stringify({ costAmount: 8, budgetAmount: 10 })).toString("base64");
  const body = { message: { data: payload } };

  const unauthorized = await invoke(handler, { method: "POST", path: "/api/budget-events", body });
  assert.equal(unauthorized.status, 401);

  const accepted = await invoke(handler, {
    method: "POST",
    path: "/api/budget-events",
    headers: { authorization: "Bearer test-token" },
    body
  });
  assert.equal(accepted.status, 202);
  assert.equal(accepted.json().alert.percent, 80);
});
