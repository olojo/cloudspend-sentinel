import { defaultBudget, sampleCosts } from "../data/sample-costs.js";

export class MemoryStore {
  #costs;
  #alerts;
  #budget;

  constructor({ costs = sampleCosts, alerts = [], budget = defaultBudget } = {}) {
    this.#costs = structuredClone(costs);
    this.#alerts = structuredClone(alerts);
    this.#budget = budget;
  }

  async getCosts() {
    return structuredClone(this.#costs);
  }

  async getBudget() {
    return this.#budget;
  }

  async getAlerts() {
    return structuredClone(this.#alerts).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveAlert(alert) {
    this.#alerts.push(structuredClone(alert));
    return structuredClone(alert);
  }
}
