const start = new Date("2026-10-20T00:00:00Z");

const dailySeries = [
  { service: "Cloud Run", values: [0.08, 0.09, 0.07, 0.1, 0.09, 0.11, 0.1, 0.09, 0.12, 0.11, 0.13, 0.12, 0.14, 0.15] },
  { service: "BigQuery", values: [0.04, 0.05, 0.04, 0.06, 0.04, 0.05, 0.05, 0.06, 0.05, 0.06, 0.05, 0.07, 0.06, 0.08] },
  { service: "Compute Engine", values: [0.18, 0.17, 0.2, 0.19, 0.21, 0.2, 0.22, 0.2, 0.19, 0.21, 0.22, 0.23, 0.24, 1.42] },
  { service: "Networking", values: [0.03, 0.03, 0.04, 0.03, 0.04, 0.03, 0.04, 0.04, 0.04, 0.05, 0.04, 0.05, 0.05, 0.06] }
];

export const sampleCosts = dailySeries.flatMap(({ service, values }) =>
  values.map((cost, offset) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    return {
      date: date.toISOString().slice(0, 10),
      service,
      cost
    };
  })
);

export const defaultBudget = 10;
