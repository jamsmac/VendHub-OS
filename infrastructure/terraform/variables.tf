# ==============================================================================
# VendHub OS - Terraform Variables
# ==============================================================================

# ==============================================================================
# General
# ==============================================================================

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "vendhub"
}

variable "environment" {
  description = "Environment (development, staging, production)"
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "owner" {
  description = "Owner tag for resources"
  type        = string
  default     = "vendhub-team"
}

# ==============================================================================
# Kubernetes Configuration
# ==============================================================================

variable "kubeconfig_path" {
  description = "Path to kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

variable "kubeconfig_context" {
  description = "Kubernetes context to use"
  type        = string
  default     = ""
}

variable "namespace" {
  description = "Kubernetes namespace for VendHub"
  type        = string
  default     = "vendhub"
}

variable "storage_class" {
  description = "Kubernetes storage class for persistent volumes"
  type        = string
  default     = "standard"
}

# ==============================================================================
# Database Configuration
# ==============================================================================

variable "deploy_database" {
  description = "Deploy PostgreSQL in cluster (false to use external DB)"
  type        = bool
  default     = true
}

variable "db_host" {
  description = "Database host (used when deploy_database is false)"
  type        = string
  default     = "vendhub-postgresql"
}

variable "db_port" {
  description = "Database port"
  type        = number
  default     = 5432
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "vendhub"
}

variable "db_user" {
  description = "Database user"
  type        = string
  default     = "vendhub"
}

variable "db_password" {
  description = "Database password (leave empty to auto-generate)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "db_pool_size" {
  description = "Database connection pool size"
  type        = number
  default     = 20
}

variable "db_ssl" {
  description = "Enable SSL for database connection"
  type        = bool
  default     = false
}

variable "db_storage_size" {
  description = "Database storage size"
  type        = string
  default     = "20Gi"
}

variable "db_node_selector" {
  description = "Node selector for database pod"
  type        = map(string)
  default     = {}
}

# ==============================================================================
# Redis Configuration
# ==============================================================================

variable "deploy_redis" {
  description = "Deploy Redis in cluster (false to use external Redis)"
  type        = bool
  default     = true
}

variable "redis_host" {
  description = "Redis host (used when deploy_redis is false)"
  type        = string
  default     = "vendhub-redis-master"
}

variable "redis_port" {
  description = "Redis port"
  type        = number
  default     = 6379
}

variable "redis_password" {
  description = "Redis password (leave empty to auto-generate)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "redis_storage_size" {
  description = "Redis storage size"
  type        = string
  default     = "10Gi"
}

# ==============================================================================
# Application Configuration
# ==============================================================================

variable "image_tag" {
  description = "Docker image tag for all applications"
  type        = string
  default     = "latest"
}

variable "api_image_repository" {
  description = "API Docker image repository"
  type        = string
  default     = "vendhub/api"
}

variable "web_image_repository" {
  description = "Web (Admin) Docker image repository"
  type        = string
  default     = "vendhub/web"
}

variable "client_image_repository" {
  description = "Client (Mini App) Docker image repository"
  type        = string
  default     = "vendhub/client"
}

variable "bot_image_repository" {
  description = "Bot Docker image repository"
  type        = string
  default     = "vendhub/bot"
}

variable "api_replicas" {
  description = "Number of API replicas"
  type        = number
  default     = 2
}

variable "api_max_replicas" {
  description = "Maximum API replicas for autoscaling"
  type        = number
  default     = 10
}

variable "web_replicas" {
  description = "Number of Web (Admin) replicas"
  type        = number
  default     = 2
}

variable "client_replicas" {
  description = "Number of Client (Mini App) replicas"
  type        = number
  default     = 2
}

# ==============================================================================
# URLs and Hosts
# ==============================================================================

variable "api_url" {
  description = "Full API URL (e.g., https://api.vendhub.uz)"
  type        = string
  default     = "https://api.vendhub.uz"
}

variable "app_url" {
  description = "Full App URL (e.g., https://app.vendhub.uz)"
  type        = string
  default     = "https://app.vendhub.uz"
}

variable "api_host" {
  description = "API hostname (without protocol)"
  type        = string
  default     = "api.vendhub.uz"
}

variable "admin_host" {
  description = "Admin panel hostname"
  type        = string
  default     = "admin.vendhub.uz"
}

variable "app_host" {
  description = "Client app hostname"
  type        = string
  default     = "app.vendhub.uz"
}

variable "bot_host" {
  description = "Bot webhook hostname"
  type        = string
  default     = "bot.vendhub.uz"
}

variable "cors_origins" {
  description = "Allowed CORS origins (comma-separated)"
  type        = string
  default     = "https://admin.vendhub.uz,https://app.vendhub.uz"
}

# ==============================================================================
# Secrets (Sensitive)
# ==============================================================================

variable "jwt_secret" {
  description = "JWT secret (leave empty to auto-generate)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh secret (leave empty to auto-generate)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "telegram_bot_token" {
  description = "Telegram Bot API token"
  type        = string
  default     = ""
  sensitive   = true
}

variable "payme_secret_key" {
  description = "Payme secret key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "click_secret_key" {
  description = "Click secret key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "sms_api_key" {
  description = "SMS provider API key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "storage_secret_key" {
  description = "S3/MinIO secret key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key for AI features"
  type        = string
  default     = ""
  sensitive   = true
}

variable "sentry_dsn" {
  description = "Sentry DSN for error tracking"
  type        = string
  default     = ""
  sensitive   = true
}

# ==============================================================================
# Feature Flags
# ==============================================================================

variable "feature_telegram_bot" {
  description = "Enable Telegram bot"
  type        = bool
  default     = true
}

variable "feature_sms" {
  description = "Enable SMS notifications"
  type        = bool
  default     = true
}

variable "feature_ai" {
  description = "Enable AI features"
  type        = bool
  default     = true
}

variable "feature_ofd" {
  description = "Enable OFD/fiscal integration"
  type        = bool
  default     = false
}

# ==============================================================================
# Rate Limiting
# ==============================================================================

variable "throttle_ttl" {
  description = "Rate limit window in seconds"
  type        = number
  default     = 60
}

variable "throttle_limit" {
  description = "Maximum requests per window"
  type        = number
  default     = 100
}

# ==============================================================================
# Logging
# ==============================================================================

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "info"

  validation {
    condition     = contains(["error", "warn", "info", "debug", "verbose"], var.log_level)
    error_message = "Log level must be one of: error, warn, info, debug, verbose."
  }
}

# ==============================================================================
# Ingress Configuration
# ==============================================================================

variable "enable_ingress" {
  description = "Enable Kubernetes Ingress"
  type        = bool
  default     = true
}

variable "ingress_class" {
  description = "Ingress class name"
  type        = string
  default     = "nginx"
}

variable "ingress_annotations" {
  description = "Additional ingress annotations"
  type        = map(string)
  default     = {}
}

# ==============================================================================
# TLS Configuration
# ==============================================================================

variable "enable_tls" {
  description = "Enable TLS/HTTPS"
  type        = bool
  default     = true
}

variable "install_cert_manager" {
  description = "Install cert-manager for automatic TLS certificates"
  type        = bool
  default     = true
}

variable "letsencrypt_email" {
  description = "Email for Let's Encrypt certificate notifications"
  type        = string
  default     = "admin@vendhub.uz"
}

# ==============================================================================
# Monitoring Configuration
# ==============================================================================

variable "enable_monitoring" {
  description = "Enable Prometheus/Grafana monitoring stack"
  type        = bool
  default     = true
}

variable "enable_backups" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "grafana_host" {
  description = "Grafana dashboard hostname"
  type        = string
  default     = "grafana.vendhub.uz"
}

variable "grafana_password" {
  description = "Grafana admin password"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "alertmanager_telegram_token" {
  description = "Telegram bot token for Alertmanager notifications"
  type        = string
  default     = ""
  sensitive   = true
}

variable "alertmanager_telegram_chat_id" {
  description = "Telegram chat ID for Alertmanager notifications"
  type        = string
  default     = ""
}
