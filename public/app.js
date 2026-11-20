const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const byId = (id) => document.getElementById(id);

function renderServices(services) {
  byId("service-list").innerHTML = services
    .map(
      (service) => `
        <div class="service-row">
          <div class="service-label"><span>${service.name}</span><strong>${money.format(service.cost)}</strong></div>
          <div class="bar-track"><span style="width: ${Math.max(4, service.share)}%"></span></div>
          <small>${service.share}% of observed spend</small>
        </div>`
    )
    .join("");
}

function renderAnomalies(anomalies) {
  byId("anomaly-list").innerHTML = anomalies.length
    ? anomalies
        .map(
          (item) => `
            <div class="stack-item danger-item">
              <div><strong>${item.service}</strong><span>+${item.increase}% above baseline</span></div>
              <p>${item.recommendation}</p>
            </div>`
        )
        .join("")
    : '<div class="empty-state">No cost anomalies detected.</div>';
}

function renderAlerts(alerts) {
  byId("alert-list").innerHTML = alerts.length
    ? alerts
        .map(
          (alert) => `
            <div class="stack-item">
              <div><strong>${alert.percent}% of budget</strong><span>${money.format(alert.currentSpend)}</span></div>
              <p>${new Date(alert.createdAt).toLocaleString()}</p>
            </div>`
        )
        .join("")
    : '<div class="empty-state">No budget notifications received yet.</div>';
}

async function refresh() {
  const response = await fetch("/api/summary");
  if (!response.ok) throw new Error("Unable to load cost summary.");
  const summary = await response.json();

  byId("current-spend").textContent = money.format(summary.budget.spent);
  byId("projected-spend").textContent = money.format(summary.projectedMonthlySpend);
  byId("latest-spend").textContent = money.format(summary.latestDailySpend);
  byId("anomaly-count").textContent = summary.anomalies.length;
  byId("budget-caption").textContent = `${summary.budget.percent}% of ${money.format(summary.budget.amount)} budget`;
  byId("period-caption").textContent = `${summary.period.start} to ${summary.period.end}`;

  const status = byId("budget-status");
  status.textContent = summary.budget.status;
  status.dataset.status = summary.budget.status;

  renderServices(summary.services);
  renderAnomalies(summary.anomalies);
  renderAlerts(summary.alerts);
}

function toast(message) {
  const element = byId("toast");
  element.textContent = message;
  element.classList.add("visible");
  setTimeout(() => element.classList.remove("visible"), 2600);
}

byId("simulate-button").addEventListener("click", async () => {
  const response = await fetch("/api/simulate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ currentSpend: 8.5, budgetAmount: 10, source: "portfolio-demo" })
  });
  if (!response.ok) return toast("The simulated alert could not be created.");
  toast("Budget alert accepted through the ingestion API.");
  await refresh();
});

refresh().catch((error) => toast(error.message));
