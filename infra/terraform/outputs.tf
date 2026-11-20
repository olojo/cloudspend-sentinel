output "artifact_repository" {
  description = "Artifact Registry repository used by Cloud Build."
  value       = google_artifact_registry_repository.application.name
}

output "cloud_run_service" {
  description = "Cloud Run service name."
  value       = google_cloud_run_v2_service.application.name
}

output "cloud_run_uri" {
  description = "Cloud Run service URI. Authentication is required by default."
  value       = google_cloud_run_v2_service.application.uri
}

output "runtime_service_account" {
  description = "Least-privilege runtime identity."
  value       = google_service_account.runtime.email
}

output "budget_topic" {
  description = "Pub/Sub topic that receives Cloud Billing budget events."
  value       = google_pubsub_topic.budget_events.id
}
