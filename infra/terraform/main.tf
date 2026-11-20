locals {
  required_apis = toset([
    "artifactregistry.googleapis.com",
    "bigquery.googleapis.com",
    "billingbudgets.googleapis.com",
    "cloudbuild.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "pubsub.googleapis.com",
    "run.googleapis.com"
  ])

  runtime_roles = toset([
    "roles/bigquery.jobUser",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter"
  ])
}

data "google_project" "current" {
  project_id = var.project_id
}

resource "google_project_service" "apis" {
  for_each = local.required_apis

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "application" {
  project       = var.project_id
  location      = var.region
  repository_id = "cloudspend-sentinel"
  description   = "CloudSpend Sentinel container images"
  format        = "DOCKER"

  depends_on = [google_project_service.apis]
}

resource "google_service_account" "runtime" {
  project      = var.project_id
  account_id   = "cloudspend-runtime"
  display_name = "CloudSpend Sentinel runtime"
}

resource "google_service_account" "budget_push" {
  project      = var.project_id
  account_id   = "cloudspend-budget-push"
  display_name = "Authenticated Pub/Sub push identity"
}

resource "google_project_iam_member" "runtime" {
  for_each = local.runtime_roles

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_bigquery_dataset" "finops" {
  project                    = var.project_id
  dataset_id                 = "cloudspend_finops"
  friendly_name              = "CloudSpend Sentinel FinOps"
  description                = "Curated daily cost observations and anomaly results."
  location                   = "US"
  default_table_expiration_ms = 7776000000
  delete_contents_on_destroy = true

  depends_on = [google_project_service.apis]
}

resource "google_bigquery_dataset_iam_member" "runtime_viewer" {
  project    = var.project_id
  dataset_id = google_bigquery_dataset.finops.dataset_id
  role       = "roles/bigquery.dataViewer"
  member     = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_pubsub_topic" "budget_events" {
  project = var.project_id
  name    = "cloudspend-budget-events"

  message_retention_duration = "86600s"
  depends_on                 = [google_project_service.apis]
}

resource "google_cloud_run_v2_service" "application" {
  project             = var.project_id
  name                = "cloudspend-sentinel"
  location            = var.region
  deletion_protection = false
  ingress             = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.runtime.email

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }

    containers {
      image = var.container_image

      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi"
        }
      }

      env {
        name  = "MONTHLY_BUDGET_USD"
        value = tostring(var.monthly_budget_usd)
      }

      startup_probe {
        initial_delay_seconds = 1
        timeout_seconds       = 1
        period_seconds        = 3
        failure_threshold     = 10

        http_get {
          path = "/api/health"
        }
      }
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_cloud_run_v2_service_iam_member" "budget_push_invoker" {
  project  = var.project_id
  location = google_cloud_run_v2_service.application.location
  name     = google_cloud_run_v2_service.application.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.budget_push.email}"
}

resource "google_cloud_run_v2_service_iam_member" "public_dashboard" {
  count = var.allow_public_dashboard ? 1 : 0

  project  = var.project_id
  location = google_cloud_run_v2_service.application.location
  name     = google_cloud_run_v2_service.application.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_project_iam_member" "pubsub_token_creator" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"

  depends_on = [google_project_service.apis]
}

resource "google_pubsub_subscription" "budget_push" {
  project = var.project_id
  name    = "cloudspend-budget-push"
  topic   = google_pubsub_topic.budget_events.id

  ack_deadline_seconds       = 30
  message_retention_duration = "86400s"

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.application.uri}/api/budget-events"

    oidc_token {
      service_account_email = google_service_account.budget_push.email
      audience              = google_cloud_run_v2_service.application.uri
    }
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "120s"
  }

  depends_on = [
    google_cloud_run_v2_service_iam_member.budget_push_invoker,
    google_project_iam_member.pubsub_token_creator
  ]
}

resource "google_billing_budget" "portfolio" {
  count = var.billing_account == "" ? 0 : 1

  billing_account = var.billing_account
  display_name    = "CloudSpend Sentinel portfolio budget"

  budget_filter {
    projects = ["projects/${data.google_project.current.number}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(var.monthly_budget_usd)
    }
  }

  dynamic "threshold_rules" {
    for_each = toset([0.5, 0.8, 1.0])
    content {
      threshold_percent = threshold_rules.value
      spend_basis       = "CURRENT_SPEND"
    }
  }

  all_updates_rule {
    pubsub_topic = google_pubsub_topic.budget_events.id
    schema_version = "1.0"
  }

  depends_on = [google_project_service.apis]
}
