variable "project_id" {
  description = "Dedicated Google Cloud project for the portfolio application."
  type        = string
}

variable "region" {
  description = "Region for Cloud Run and Artifact Registry."
  type        = string
  default     = "us-central1"
}

variable "container_image" {
  description = "Initial container image. Cloud Build replaces this with the application image."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "monthly_budget_usd" {
  description = "Application budget displayed by the dashboard and used for billing alerts."
  type        = number
  default     = 2

  validation {
    condition     = var.monthly_budget_usd > 0 && var.monthly_budget_usd <= 10
    error_message = "The portfolio budget must be greater than 0 and no more than 10 USD."
  }
}

variable "billing_account" {
  description = "Billing account ID for a project-scoped alert budget. Leave empty to skip budget creation."
  type        = string
  default     = ""
  sensitive   = true
}

variable "allow_public_dashboard" {
  description = "Allow unauthenticated dashboard access. Keep false until the final portfolio demo."
  type        = bool
  default     = false
}
