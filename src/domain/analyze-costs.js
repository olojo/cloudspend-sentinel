const playbook = {
  "Cloud Run": "Check minimum instances, request concurrency, and unexpected traffic.",
  BigQuery: "Inspect bytes processed, partition filters, and repeated full-table scans.",
  "Compute Engine": "Find idle VMs, oversized machine types, and unattached disks.",
  Networking: "Review cross-region traffic, public IPv4 addresses, load balancers, and NAT usage."
};

const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function previousAverage(records, latestDate) {
  const previous = records.filter((record) => record.date !== latestDate);
  if (!previous.length) return 0;
  return previous.reduce((total, record) => total + record.cost, 0) / previous.length;
}

export function analyzeCosts(records, budgetAmount) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("At least one cost record is required.");
  }
  if (!Number.isFinite(budgetAmount) || budgetAmount <= 0) {
    throw new Error("Budget amount must be greater than zero.");
  }

  const dates = [...new Set(records.map((record) => record.date))].sort();
  const latestDate = dates.at(-1);
  const totalSpend = records.reduce((total, record) => total + record.cost, 0);
  const budgetPercent = (totalSpend / budgetAmount) * 100;

  const serviceMap = new Map();
  for (const record of records) {
    const current = serviceMap.get(record.service) ?? { total: 0, latest: 0, records: [] };
    current.total += record.cost;
    current.records.push(record);
    if (record.date === latestDate) current.latest += record.cost;
    serviceMap.set(record.service, current);
  }

  const services = [...serviceMap.entries()]
    .map(([name, value]) => ({ name, cost: round(value.total), share: round((value.total / totalSpend) * 100) }))
    .sort((a, b) => b.cost - a.cost);

  const anomalies = [...serviceMap.entries()]
    .map(([service, value]) => {
      const baseline = previousAverage(value.records, latestDate);
      const increase = baseline ? ((value.latest - baseline) / baseline) * 100 : 0;
      return {
        service,
        latestCost: round(value.latest),
        baseline: round(baseline),
        increase: round(increase),
        recommendation: playbook[service] ?? "Review recent deployments and SKU-level billing changes."
      };
    })
    .filter((item) => item.latestCost >= 0.5 && item.increase >= 75)
    .sort((a, b) => b.increase - a.increase);

  const latestDailySpend = records
    .filter((record) => record.date === latestDate)
    .reduce((total, record) => total + record.cost, 0);
  const averageDailySpend = totalSpend / dates.length;
  const projectedMonthlySpend = averageDailySpend * 30;

  let status = "healthy";
  if (budgetPercent >= 100) status = "breached";
  else if (budgetPercent >= 80) status = "critical";
  else if (budgetPercent >= 50) status = "warning";

  return {
    generatedAt: new Date().toISOString(),
    period: { start: dates[0], end: latestDate, days: dates.length },
    budget: {
      amount: round(budgetAmount),
      spent: round(totalSpend),
      remaining: round(Math.max(0, budgetAmount - totalSpend)),
      percent: round(budgetPercent),
      status
    },
    latestDailySpend: round(latestDailySpend),
    projectedMonthlySpend: round(projectedMonthlySpend),
    services,
    anomalies
  };
}

export function normalizeBudgetEvent(payload) {
  const amount = Number(payload.costAmount ?? payload.currentSpend ?? payload.amount);
  const budget = Number(payload.budgetAmount ?? payload.budget ?? 0);

  if (!Number.isFinite(amount) || !Number.isFinite(budget) || budget <= 0) {
    throw new Error("Budget event must contain numeric cost and budget amounts.");
  }

  return {
    id: payload.id ?? `budget-${Date.now()}`,
    createdAt: new Date().toISOString(),
    source: payload.source ?? "google-cloud-billing",
    currentSpend: round(amount),
    budgetAmount: round(budget),
    percent: round((amount / budget) * 100),
    currency: payload.currencyCode ?? payload.currency ?? "USD"
  };
}
