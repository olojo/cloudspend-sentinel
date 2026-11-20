import test from "node:test";
import assert from "node:assert/strict";
import { analyzeCosts, normalizeBudgetEvent } from "../src/domain/analyze-costs.js";
import { sampleCosts } from "../src/data/sample-costs.js";

test("cost analysis identifies the simulated Compute Engine spike", () => {
  const result = analyzeCosts(sampleCosts, 10);

  assert.equal(result.budget.amount, 10);
  assert.equal(result.period.days, 14);
  assert.equal(result.anomalies.length, 1);
  assert.equal(result.anomalies[0].service, "Compute Engine");
  assert.ok(result.anomalies[0].increase > 500);
});

test("cost analysis rejects invalid budgets", () => {
  assert.throws(() => analyzeCosts(sampleCosts, 0), /greater than zero/);
});

test("budget events are normalized into alert records", () => {
  const alert = normalizeBudgetEvent({ currentSpend: 8.5, budgetAmount: 10, currency: "USD" });

  assert.equal(alert.percent, 85);
  assert.equal(alert.currentSpend, 8.5);
  assert.equal(alert.currency, "USD");
});
