# Operations runbook

## Pre-deployment checklist

- Use a dedicated portfolio project.
- Confirm the `$2` project budget and email thresholds.
- Confirm Cloud Run minimum instances is `0` and maximum instances is `1`.
- Review the Terraform plan for load balancers, VMs, GPUs, Cloud SQL, or unexpected regions. None should be present.
- Confirm `allow_public_dashboard` is `false`.

## Verification

1. Run `npm test` and `npm run check`.
2. Deploy the infrastructure through a reviewed Terraform plan.
3. Build the application through Cloud Build.
4. Verify the health endpoint through authenticated access.
5. Publish one synthetic budget message.
6. Confirm Pub/Sub acknowledges the message.
7. Confirm the alert appears in the dashboard.
8. Inspect Cloud Logging for errors and retries.

## Incident: budget messages are retrying

1. Check the Cloud Run request log for `401`, `403`, or `422` responses.
2. Verify the Pub/Sub push service account has Cloud Run Invoker on this service.
3. Verify the Pub/Sub service agent can create OIDC tokens.
4. Decode a test message locally and validate its numeric cost and budget fields.
5. Inspect the subscription's oldest unacknowledged message age.

## Incident: dashboard is unavailable

1. Check the Cloud Run revision is ready.
2. Query `/api/health` using an identity with Cloud Run Invoker.
3. Review startup-probe failures and structured startup logs.
4. Roll traffic back to the previous revision if the failure followed a deployment.

## Teardown

1. Save sanitized screenshots, logs, and the cost report.
2. Remove deployed container revisions and images that are not needed for evidence.
3. Run `terraform plan -destroy` and review every resource.
4. Run `terraform destroy` only against the dedicated portfolio project.
5. Confirm the billing report no longer shows active usage-producing resources.
6. Keep the repository and evidence; live infrastructure is not required for the portfolio.
