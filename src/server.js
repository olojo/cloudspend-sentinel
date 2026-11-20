import { createServer } from "node:http";
import { createApp } from "./http/app.js";
import { MemoryStore } from "./store/memory-store.js";

const port = Number(process.env.PORT ?? 8080);
const store = new MemoryStore({ budget: Number(process.env.MONTHLY_BUDGET_USD ?? 10) });
const server = createServer(createApp({ store }));

server.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ severity: "INFO", message: "CloudSpend Sentinel started", port }));
});

function shutdown(signal) {
  console.log(JSON.stringify({ severity: "INFO", message: "Shutting down", signal }));
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
