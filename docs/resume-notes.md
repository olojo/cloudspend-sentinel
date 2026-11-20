# Résumé and interview notes

## Résumé bullet

Built CloudSpend Sentinel, an event-driven Google Cloud FinOps platform using Cloud Run, Pub/Sub, BigQuery, Terraform, and keyless CI/CD; implemented service-level anomaly detection, authenticated budget-event ingestion, least-privilege IAM, automated tests, and cost controls that kept the deployment below a `$2` operating budget.

## Short interview explanation

> I wanted to show that I could operate cloud infrastructure responsibly, not only deploy it. I built an event-driven service that receives Cloud Billing budget updates, attributes spending by service, detects abnormal daily increases, and gives responders an investigation playbook. I separated the domain, HTTP, and storage layers, deployed it through Terraform and keyless CI/CD, and designed it to scale to zero with a one-instance ceiling.

## Discussion points

- Why Pub/Sub is preferable to continuous budget polling
- Why GitHub OIDC is safer than a downloaded service-account key
- How min/max instances affect cost and availability
- Why the anomaly model uses an explainable baseline
- How Cloud Run IAM protects a private service
- Why an alert budget is not automatically a hard cap
- How to make Pub/Sub delivery idempotent
- How the design would change for a production availability target
