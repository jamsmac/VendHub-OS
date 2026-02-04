# ==============================================================================
# VendHub OS - Production Environment Configuration
# ==============================================================================

# General
project_name = "vendhub"
environment  = "production"
owner        = "vendhub-team"

# Kubernetes
namespace     = "vendhub"
storage_class = "fast-ssd"

# Database
deploy_database = true
db_name         = "vendhub"
db_user         = "vendhub"
db_pool_size    = 50
db_ssl          = true
db_storage_size = "100Gi"
db_node_selector = {
  "node-type" = "database"
}

# Redis
deploy_redis       = true
redis_storage_size = "20Gi"

# Application
image_tag           = "latest"
api_replicas        = 3
api_max_replicas    = 20
web_replicas        = 2
client_replicas     = 2

# URLs (production domain)
api_url     = "https://api.vendhub.uz"
app_url     = "https://app.vendhub.uz"
api_host    = "api.vendhub.uz"
admin_host  = "admin.vendhub.uz"
app_host    = "app.vendhub.uz"
bot_host    = "bot.vendhub.uz"
cors_origins = "https://admin.vendhub.uz,https://app.vendhub.uz"

# Feature Flags
feature_telegram_bot = true
feature_sms          = true
feature_ai           = true
feature_ofd          = true  # Fiscal integration enabled

# Rate Limiting
throttle_ttl   = 60
throttle_limit = 100

# Logging
log_level = "info"

# Ingress
enable_ingress = true
ingress_class  = "nginx"
ingress_annotations = {
  "nginx.ingress.kubernetes.io/ssl-redirect"        = "true"
  "nginx.ingress.kubernetes.io/proxy-body-size"     = "50m"
  "nginx.ingress.kubernetes.io/limit-rps"           = "50"
  "nginx.ingress.kubernetes.io/limit-connections"   = "20"
}

# TLS
enable_tls           = true
install_cert_manager = true
letsencrypt_email    = "admin@vendhub.uz"

# Monitoring
enable_monitoring = true
enable_backups    = true
grafana_host      = "grafana.vendhub.uz"
