# Cost plan and guardrails

## Objective

The project has a `$2` working budget and is designed to remain inside Google Cloud's free allowances during normal portfolio demonstrations. The user's absolute portfolio ceiling is `$10`, shared across all projects.

## Expected resources

| Resource | Guardrail | Expected portfolio cost |
|---|---|---:|
| Cloud Run | Min `0`, max `1`, request billing | `$0` |
| Cloud Build | Manual releases only | `$0` |
| Artifact Registry | One small image, prune old tags | `$0` |
| BigQuery | Partitioned queries and dry runs | `$0` |
| Pub/Sub | Budget events only | `$0` |
| Logging | No debug flood or request-body logging | `$0` |

## Mandatory protections

- Dedicated project and project-scoped budget.
- Alerts at 50%, 80%, and 100% of `$2`.
- Cloud Run maximum instance count of one.
- No external load balancer, Cloud SQL, VM, GPU, Cloud DNS zone, or static public IP.
- Billing report checked after each deployment.
- Terraform destroy reviewed after the cloud evidence is captured.

## Important limitation

An alerts-only Google Cloud budget is not a hard spending cap. The Cloud Run spend-cap feature can stop new Cloud Run usage, but persistent storage and other services require explicit cleanup. The infrastructure limit and teardown runbook remain the primary controls.

## Evidence to publish

The final cost report should show:

- Date range of the demonstration
- Total cost and credits
- Cost by service/SKU
- Free-tier usage
- Confirmation that no active charge-producing resources remain
