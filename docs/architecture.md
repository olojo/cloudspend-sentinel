# Architecture and design decisions

## Business objective

Small teams often discover cost problems only after a billing cycle closes. CloudSpend Sentinel shortens that feedback loop by combining threshold notifications with service-level anomaly analysis and an explicit remediation playbook.

## Design principles

1. **Scale to zero:** Cloud Run has no minimum instances and a maximum of one for the portfolio environment.
2. **Event-driven ingestion:** Cloud Billing publishes to Pub/Sub; no polling service runs continuously.
3. **Replaceable storage:** Cost analysis depends on a repository contract, not Firestore or BigQuery directly.
4. **Least privilege:** Build, push, and runtime identities have different responsibilities.
5. **Safe demonstration:** Realistic sample data and a simulator make the project reviewable without creating billable resources.
6. **Reproducible infrastructure:** Terraform creates APIs, IAM identities, BigQuery, Pub/Sub, Artifact Registry, and Cloud Run.

## Request path

1. Cloud Billing publishes an update to the budget topic.
2. Pub/Sub signs a push request using the dedicated push service account.
3. Cloud Run validates and normalizes the event.
4. The alert repository persists the event.
5. The dashboard requests a summary produced by the domain analysis layer.

## Cost-analysis model

The first version uses a transparent rules-based model that is easy to explain in an interview:

- Group observations by service.
- Calculate each service's average excluding the latest date.
- Flag a service when its latest daily cost is at least `$0.50` and at least `75%` above that baseline.
- Attach a service-specific investigation recommendation.
- Project monthly spending from the observed daily average.

This intentionally favors explainability over an opaque statistical model. A later version can add seasonal baselines and configurable sensitivity.

## Reliability decisions

- Health and startup probes prevent unhealthy revisions from receiving traffic.
- Pub/Sub retries failed deliveries with bounded exponential backoff.
- Each budget event receives an ID, allowing a persistent repository to implement idempotent writes.
- The Cloud Run instance limit protects the portfolio budget, while Pub/Sub retains events during temporary capacity constraints.

## Deliberate limitations

- The checked-in memory repository is ephemeral and intended for local demonstration.
- Firestore persistence and BigQuery billing-export queries are the next milestone.
- A maximum of one Cloud Run instance is not a production availability target; it is a portfolio cost guardrail.
- The public-dashboard option remains disabled until the ingestion endpoint is separated or protected with an application-level token.
