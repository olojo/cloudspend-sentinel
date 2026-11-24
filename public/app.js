const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const byId = (id) => document.getElementById(id);

let costRecords = [];

function renderServices(services) {
  byId("service-count").textContent = `${services.length} services`;
  byId("service-list").innerHTML = services
    .map(
      (service, index) => `
        <div class="service-row">
          <span class="service-rank">${String(index + 1).padStart(2, "0")}</span>
          <div class="service-name"><strong>${service.name}</strong><small>${service.share}% of spend</small></div>
          <div class="service-bar" aria-hidden="true"><span style="width:${Math.max(3, service.share)}%"></span></div>
          <div class="service-value"><strong>${money.format(service.cost)}</strong><small>observed</small></div>
        </div>`
    )
    .join("");
}

function renderAnomalies(anomalies) {
  const anomaly = anomalies[0];
  byId("anomaly-list").innerHTML = anomaly
    ? `
      <div class="anomaly-card">
        <div class="anomaly-title"><h3>${anomaly.service}</h3><strong>+${anomaly.increase}%</strong></div>
        <p class="anomaly-caption">Increase above the previous daily baseline</p>
        <div class="anomaly-stats">
          <div><span>Latest daily cost</span><strong>${money.format(anomaly.latestCost)}</strong></div>
          <div><span>Previous baseline</span><strong>${money.format(anomaly.baseline)}</strong></div>
        </div>
        <p class="recommendation"><b>Investigation playbook:</b> ${anomaly.recommendation}</p>
      </div>`
    : '<div class="empty-state">No cost anomalies detected.</div>';
}

function renderAlerts(alerts) {
  byId("alert-list").innerHTML = alerts.length
    ? alerts
        .map(
          (alert) => `
            <div class="alert-row">
              <div class="alert-event">
                <span class="alert-icon">!</span>
                <div><strong>${alert.percent}% of budget</strong><small>Threshold notification</small></div>
              </div>
              <span class="alert-amount">${money.format(alert.currentSpend)}</span>
              <span class="alert-source">${alert.source}</span>
              <time class="alert-date">${new Date(alert.createdAt).toLocaleString()}</time>
            </div>`
        )
        .join("")
    : '<div class="empty-state">No budget events yet. Run the safe simulator to test the ingestion path.</div>';
}

function renderChart(records) {
  const totals = new Map();
  for (const record of records) totals.set(record.date, (totals.get(record.date) ?? 0) + record.cost);
  const points = [...totals.entries()].sort(([left], [right]) => left.localeCompare(right));
  if (!points.length) return;

  const max = Math.max(...points.map(([, value]) => value));
  const chartMax = Math.max(1, Math.ceil(max * 1.18 * 10) / 10);
  const left = 18;
  const right = 742;
  const top = 26;
  const bottom = 226;
  const width = right - left;
  const height = bottom - top;
  const plotted = points.map(([date, value], index) => ({
    date,
    value,
    x: left + (points.length === 1 ? width / 2 : (index / (points.length - 1)) * width),
    y: bottom - (value / chartMax) * height
  }));

  const line = plotted.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  byId("chart-line").setAttribute("d", line);
  byId("chart-area").setAttribute("d", `${line} L${right} ${bottom} L${left} ${bottom} Z`);
  byId("chart-points").innerHTML = plotted
    .map(
      (point, index) => `<circle class="chart-point${index === plotted.length - 1 ? " latest" : ""}" cx="${point.x}" cy="${point.y}" r="${index === plotted.length - 1 ? 6 : 3}"><title>${point.date}: ${money.format(point.value)}</title></circle>`
    )
    .join("");

  const labelIndexes = [0, Math.floor((points.length - 1) / 3), Math.floor(((points.length - 1) * 2) / 3), points.length - 1];
  byId("chart-axis").innerHTML = labelIndexes
    .map((index) => `<span>${new Date(`${points[index][0]}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span>`)
    .join("");
  byId("chart-max").textContent = money.format(chartMax);
  byId("chart-mid").textContent = money.format(chartMax / 2);
}

function renderBudget(budget) {
  byId("budget-spent").textContent = money.format(budget.spent);
  byId("budget-total").textContent = `/ ${money.format(budget.amount)}`;
  byId("budget-progress").style.width = `${Math.min(100, budget.percent)}%`;
  byId("budget-percent").textContent = `${budget.percent}% used`;
  byId("budget-remaining").textContent = `${money.format(budget.remaining)} remaining`;
}

async function refresh() {
  const [summaryResponse, costsResponse] = await Promise.all([fetch("/api/summary"), fetch("/api/costs")]);
  if (!summaryResponse.ok || !costsResponse.ok) throw new Error("Unable to load the cost workspace.");

  const summary = await summaryResponse.json();
  const costs = await costsResponse.json();
  costRecords = costs.records;

  byId("current-spend").textContent = money.format(summary.budget.spent);
  byId("projected-spend").textContent = money.format(summary.projectedMonthlySpend);
  byId("latest-spend").textContent = money.format(summary.latestDailySpend);
  byId("anomaly-count").textContent = summary.anomalies.length;
  byId("budget-caption").textContent = `${summary.budget.percent}% of ${money.format(summary.budget.amount)} guardrail`;
  byId("period-caption").textContent = `${summary.period.days} observed days`;
  byId("chart-total").textContent = money.format(summary.budget.spent);
  byId("chart-note").textContent = `${summary.period.start} – ${summary.period.end}`;
  byId("generated-at").textContent = `Updated ${new Date(summary.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  const status = byId("budget-status");
  status.textContent = summary.budget.status;
  status.dataset.status = summary.budget.status;

  renderBudget(summary.budget);
  renderServices(summary.services);
  renderAnomalies(summary.anomalies);
  renderAlerts(summary.alerts);
  renderChart(costRecords);
}

function toast(message) {
  const element = byId("toast");
  element.textContent = message;
  element.classList.add("visible");
  window.setTimeout(() => element.classList.remove("visible"), 2800);
}

function exportCsv() {
  if (!costRecords.length) return toast("Cost data is still loading.");
  const rows = ["date,service,cost", ...costRecords.map((record) => `${record.date},"${record.service.replaceAll('"', '""')}",${record.cost}`)];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "cloudspend-demo-costs.csv";
  link.click();
  URL.revokeObjectURL(link.href);
  toast("Demo cost data exported as CSV.");
}

byId("simulate-button").addEventListener("click", async () => {
  const response = await fetch("/api/simulate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ currentSpend: 8.5, budgetAmount: 10, source: "portfolio-demo" })
  });
  if (!response.ok) return toast("The simulated alert could not be created.");
  toast("Budget alert accepted through the Cloud Run ingestion API.");
  await refresh();
});

byId("export-button").addEventListener("click", exportCsv);

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
  });
});

refresh().catch((error) => toast(error.message));
