# Threat model

## Protected assets

- Billing amounts and service attribution
- Budget-notification integrity
- Google Cloud project and billing identifiers
- Deployment credentials and service identities
- Alert history

## Trust boundaries

| Boundary | Control |
|---|---|
| GitHub to Google Cloud | Workload Identity Federation; no service-account keys |
| Pub/Sub to Cloud Run | OIDC token using a dedicated push identity |
| Cloud Run to Google APIs | Dedicated runtime service account |
| Browser to dashboard | Cloud Run IAM by default |
| Application to stored data | Repository layer and least-privilege data roles |

## Principal threats and mitigations

### Forged budget events

An attacker could create false alarms or hide legitimate alerts. The deployed service is private by default, and Pub/Sub receives only `roles/run.invoker`. When the dashboard becomes public, ingestion must require a separate secret or move to a dedicated private service.

### Excessive IAM permissions

The runtime identity could be used to modify infrastructure. It receives only logging, monitoring, BigQuery job, and dataset-read permissions. Deployment permissions belong to a separate identity.

### Cost denial of service

Repeated requests could intentionally create spend. Cloud Run is capped at one instance, request bodies are limited, and the final public demo will add rate limiting before permanent exposure.

### Secret disclosure

No credentials or billing exports belong in Git. GitHub authenticates through OIDC and runtime secrets will be stored in Secret Manager.

### Sensitive billing-data exposure

The dashboard remains authenticated during development. Screenshots and demo data must use synthetic project names and must not reveal billing-account identifiers.

## Residual risks

- Budget and billing data can be delayed, so the system is an early-warning tool rather than an accounting ledger.
- A single Cloud Run instance can be temporarily unavailable.
- The memory repository loses alerts whenever the container restarts until the Firestore milestone is complete.
