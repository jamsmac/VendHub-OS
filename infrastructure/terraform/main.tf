# ==============================================================================
# VendHub OS - Terraform Infrastructure
# ==============================================================================
# This configuration provisions cloud infrastructure for VendHub OS
# Supports: AWS, GCP, or DigitalOcean (configurable via variables)
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Backend configuration - uncomment and configure for remote state
  # backend "s3" {
  #   bucket         = "vendhub-terraform-state"
  #   key            = "infrastructure/terraform.tfstate"
  #   region         = "eu-central-1"
  #   encrypt        = true
  #   dynamodb_table = "vendhub-terraform-locks"
  # }
}

# ==============================================================================
# Local Values
# ==============================================================================

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = var.owner
  }

  name_prefix = "${var.project_name}-${var.environment}"

  # Kubernetes labels
  k8s_labels = {
    "app.kubernetes.io/name"       = var.project_name
    "app.kubernetes.io/instance"   = var.environment
    "app.kubernetes.io/managed-by" = "terraform"
  }
}

# ==============================================================================
# Random Resources (for secrets generation)
# ==============================================================================

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "redis_password" {
  length           = 32
  special          = false
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "jwt_refresh_secret" {
  length  = 64
  special = false
}

# ==============================================================================
# Kubernetes Provider Configuration
# ==============================================================================

provider "kubernetes" {
  config_path    = var.kubeconfig_path
  config_context = var.kubeconfig_context
}

provider "helm" {
  kubernetes {
    config_path    = var.kubeconfig_path
    config_context = var.kubeconfig_context
  }
}

# ==============================================================================
# Namespace
# ==============================================================================

resource "kubernetes_namespace" "vendhub" {
  metadata {
    name   = var.namespace
    labels = local.k8s_labels
  }
}

# ==============================================================================
# Secrets
# ==============================================================================

resource "kubernetes_secret" "app_secrets" {
  metadata {
    name      = "${local.name_prefix}-secrets"
    namespace = kubernetes_namespace.vendhub.metadata[0].name
    labels    = local.k8s_labels
  }

  data = {
    DB_PASSWORD         = var.db_password != "" ? var.db_password : random_password.db_password.result
    REDIS_PASSWORD      = var.redis_password != "" ? var.redis_password : random_password.redis_password.result
    JWT_SECRET          = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt_secret.result
    JWT_REFRESH_SECRET  = var.jwt_refresh_secret != "" ? var.jwt_refresh_secret : random_password.jwt_refresh_secret.result
    TELEGRAM_BOT_TOKEN  = var.telegram_bot_token
    PAYME_SECRET_KEY    = var.payme_secret_key
    CLICK_SECRET_KEY    = var.click_secret_key
    SMS_API_KEY         = var.sms_api_key
    STORAGE_SECRET_KEY  = var.storage_secret_key
    OPENAI_API_KEY      = var.openai_api_key
    SENTRY_DSN          = var.sentry_dsn
  }

  type = "Opaque"
}

# ==============================================================================
# ConfigMap
# ==============================================================================

resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "${local.name_prefix}-config"
    namespace = kubernetes_namespace.vendhub.metadata[0].name
    labels    = local.k8s_labels
  }

  data = {
    NODE_ENV        = var.environment == "production" ? "production" : "development"
    APP_NAME        = var.project_name
    API_URL         = var.api_url
    APP_URL         = var.app_url

    # Database
    DB_HOST         = var.db_host
    DB_PORT         = tostring(var.db_port)
    DB_NAME         = var.db_name
    DB_USER         = var.db_user
    DB_POOL_SIZE    = tostring(var.db_pool_size)
    DB_SSL          = tostring(var.db_ssl)

    # Redis
    REDIS_HOST      = var.redis_host
    REDIS_PORT      = tostring(var.redis_port)

    # API Settings
    API_PORT        = "4000"
    API_PREFIX      = "api/v1"
    CORS_ORIGINS    = var.cors_origins

    # Feature Flags
    FEATURE_TELEGRAM_BOT      = tostring(var.feature_telegram_bot)
    FEATURE_SMS_NOTIFICATIONS = tostring(var.feature_sms)
    FEATURE_AI_IMPORT         = tostring(var.feature_ai)
    FEATURE_OFD_INTEGRATION   = tostring(var.feature_ofd)

    # Rate Limiting
    THROTTLE_TTL    = tostring(var.throttle_ttl)
    THROTTLE_LIMIT  = tostring(var.throttle_limit)

    # Logging
    LOG_LEVEL       = var.log_level
  }
}

# ==============================================================================
# PostgreSQL (using Bitnami Helm Chart)
# ==============================================================================

resource "helm_release" "postgresql" {
  count = var.deploy_database ? 1 : 0

  name       = "${local.name_prefix}-postgresql"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "postgresql"
  version    = "14.0.0"
  namespace  = kubernetes_namespace.vendhub.metadata[0].name

  values = [
    yamlencode({
      global = {
        postgresql = {
          auth = {
            postgresPassword = random_password.db_password.result
            username         = var.db_user
            password         = random_password.db_password.result
            database         = var.db_name
          }
        }
      }

      primary = {
        persistence = {
          enabled      = true
          size         = var.db_storage_size
          storageClass = var.storage_class
        }

        resources = {
          requests = {
            cpu    = var.environment == "production" ? "500m" : "100m"
            memory = var.environment == "production" ? "1Gi" : "256Mi"
          }
          limits = {
            cpu    = var.environment == "production" ? "2000m" : "500m"
            memory = var.environment == "production" ? "4Gi" : "1Gi"
          }
        }

        nodeSelector = var.db_node_selector
      }

      metrics = {
        enabled = var.enable_monitoring
        serviceMonitor = {
          enabled = var.enable_monitoring
        }
      }

      backup = {
        enabled = var.enable_backups
      }
    })
  ]

  depends_on = [kubernetes_namespace.vendhub]
}

# ==============================================================================
# Redis (using Bitnami Helm Chart)
# ==============================================================================

resource "helm_release" "redis" {
  count = var.deploy_redis ? 1 : 0

  name       = "${local.name_prefix}-redis"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "redis"
  version    = "18.0.0"
  namespace  = kubernetes_namespace.vendhub.metadata[0].name

  values = [
    yamlencode({
      global = {
        redis = {
          password = random_password.redis_password.result
        }
      }

      architecture = var.environment == "production" ? "replication" : "standalone"

      master = {
        persistence = {
          enabled      = true
          size         = var.redis_storage_size
          storageClass = var.storage_class
        }

        resources = {
          requests = {
            cpu    = var.environment == "production" ? "250m" : "50m"
            memory = var.environment == "production" ? "512Mi" : "128Mi"
          }
          limits = {
            cpu    = var.environment == "production" ? "1000m" : "250m"
            memory = var.environment == "production" ? "2Gi" : "512Mi"
          }
        }
      }

      replica = {
        replicaCount = var.environment == "production" ? 2 : 0
      }

      metrics = {
        enabled = var.enable_monitoring
        serviceMonitor = {
          enabled = var.enable_monitoring
        }
      }
    })
  ]

  depends_on = [kubernetes_namespace.vendhub]
}

# ==============================================================================
# VendHub Application (using custom Helm Chart)
# ==============================================================================

resource "helm_release" "vendhub" {
  name      = local.name_prefix
  chart     = "${path.module}/../helm/vendhub"
  namespace = kubernetes_namespace.vendhub.metadata[0].name

  values = [
    yamlencode({
      global = {
        environment = var.environment
        imageTag    = var.image_tag
      }

      api = {
        replicas = var.api_replicas
        image = {
          repository = var.api_image_repository
          tag        = var.image_tag
        }
        resources = {
          requests = {
            cpu    = var.environment == "production" ? "500m" : "100m"
            memory = var.environment == "production" ? "512Mi" : "256Mi"
          }
          limits = {
            cpu    = var.environment == "production" ? "2000m" : "500m"
            memory = var.environment == "production" ? "2Gi" : "1Gi"
          }
        }
        autoscaling = {
          enabled     = var.environment == "production"
          minReplicas = var.api_replicas
          maxReplicas = var.api_max_replicas
        }
      }

      web = {
        replicas = var.web_replicas
        image = {
          repository = var.web_image_repository
          tag        = var.image_tag
        }
      }

      client = {
        replicas = var.client_replicas
        image = {
          repository = var.client_image_repository
          tag        = var.image_tag
        }
      }

      bot = {
        enabled  = var.feature_telegram_bot
        replicas = 1
        image = {
          repository = var.bot_image_repository
          tag        = var.image_tag
        }
      }

      ingress = {
        enabled   = var.enable_ingress
        className = var.ingress_class

        hosts = {
          api    = var.api_host
          admin  = var.admin_host
          app    = var.app_host
          bot    = var.bot_host
        }

        tls = {
          enabled    = var.enable_tls
          secretName = "${local.name_prefix}-tls"
        }

        annotations = var.ingress_annotations
      }

      configMapRef = kubernetes_config_map.app_config.metadata[0].name
      secretRef    = kubernetes_secret.app_secrets.metadata[0].name
    })
  ]

  depends_on = [
    kubernetes_namespace.vendhub,
    kubernetes_secret.app_secrets,
    kubernetes_config_map.app_config,
    helm_release.postgresql,
    helm_release.redis
  ]
}

# ==============================================================================
# Monitoring Stack (optional)
# ==============================================================================

resource "helm_release" "prometheus_stack" {
  count = var.enable_monitoring ? 1 : 0

  name       = "${local.name_prefix}-monitoring"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "55.0.0"
  namespace  = kubernetes_namespace.vendhub.metadata[0].name

  values = [
    yamlencode({
      grafana = {
        enabled = true
        adminPassword = var.grafana_password

        ingress = {
          enabled = var.enable_ingress
          hosts   = [var.grafana_host]
          tls = var.enable_tls ? [{
            secretName = "${local.name_prefix}-grafana-tls"
            hosts      = [var.grafana_host]
          }] : []
        }

        persistence = {
          enabled = true
          size    = "10Gi"
        }

        dashboardProviders = {
          "dashboardproviders.yaml" = {
            apiVersion = 1
            providers = [{
              name      = "vendhub"
              folder    = "VendHub"
              type      = "file"
              options = {
                path = "/var/lib/grafana/dashboards/vendhub"
              }
            }]
          }
        }
      }

      prometheus = {
        prometheusSpec = {
          retention = "15d"
          storageSpec = {
            volumeClaimTemplate = {
              spec = {
                storageClassName = var.storage_class
                resources = {
                  requests = {
                    storage = "50Gi"
                  }
                }
              }
            }
          }
        }
      }

      alertmanager = {
        enabled = true
        config = {
          global = {
            resolve_timeout = "5m"
          }
          route = {
            receiver = "telegram"
          }
          receivers = [{
            name = "telegram"
            telegram_configs = var.alertmanager_telegram_token != "" ? [{
              bot_token = var.alertmanager_telegram_token
              chat_id   = var.alertmanager_telegram_chat_id
            }] : []
          }]
        }
      }
    })
  ]

  depends_on = [kubernetes_namespace.vendhub]
}

# ==============================================================================
# Loki (Log Aggregation)
# ==============================================================================

resource "helm_release" "loki" {
  count = var.enable_monitoring ? 1 : 0

  name       = "${local.name_prefix}-loki"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "loki-stack"
  version    = "2.10.0"
  namespace  = kubernetes_namespace.vendhub.metadata[0].name

  values = [
    yamlencode({
      loki = {
        enabled = true
        persistence = {
          enabled      = true
          size         = "50Gi"
          storageClass = var.storage_class
        }
      }

      promtail = {
        enabled = true
      }

      grafana = {
        enabled = false # Using kube-prometheus-stack grafana
      }
    })
  ]

  depends_on = [kubernetes_namespace.vendhub]
}

# ==============================================================================
# Cert-Manager (TLS Certificates)
# ==============================================================================

resource "helm_release" "cert_manager" {
  count = var.enable_tls && var.install_cert_manager ? 1 : 0

  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  version    = "1.14.0"
  namespace  = "cert-manager"
  create_namespace = true

  set {
    name  = "installCRDs"
    value = "true"
  }
}

resource "kubernetes_manifest" "cluster_issuer" {
  count = var.enable_tls && var.install_cert_manager ? 1 : 0

  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata = {
      name = "letsencrypt-prod"
    }
    spec = {
      acme = {
        server = "https://acme-v02.api.letsencrypt.org/directory"
        email  = var.letsencrypt_email
        privateKeySecretRef = {
          name = "letsencrypt-prod"
        }
        solvers = [{
          http01 = {
            ingress = {
              class = var.ingress_class
            }
          }
        }]
      }
    }
  }

  depends_on = [helm_release.cert_manager]
}

# ==============================================================================
# Outputs
# ==============================================================================

output "namespace" {
  description = "Kubernetes namespace"
  value       = kubernetes_namespace.vendhub.metadata[0].name
}

output "db_password" {
  description = "Database password (sensitive)"
  value       = random_password.db_password.result
  sensitive   = true
}

output "redis_password" {
  description = "Redis password (sensitive)"
  value       = random_password.redis_password.result
  sensitive   = true
}

output "jwt_secret" {
  description = "JWT secret (sensitive)"
  value       = random_password.jwt_secret.result
  sensitive   = true
}

output "api_endpoint" {
  description = "API endpoint URL"
  value       = var.enable_tls ? "https://${var.api_host}" : "http://${var.api_host}"
}

output "admin_endpoint" {
  description = "Admin panel URL"
  value       = var.enable_tls ? "https://${var.admin_host}" : "http://${var.admin_host}"
}

output "app_endpoint" {
  description = "Client app URL"
  value       = var.enable_tls ? "https://${var.app_host}" : "http://${var.app_host}"
}

output "grafana_endpoint" {
  description = "Grafana dashboard URL"
  value       = var.enable_monitoring ? (var.enable_tls ? "https://${var.grafana_host}" : "http://${var.grafana_host}") : null
}
