# ==============================================================================
# VendHub OS - Staging Environment Configuration
# ==============================================================================

# General
project_name = "vendhub"
environment  = "staging"
owner        = "vendhub-team"

# Kubernetes
namespace     = "vendhub-staging"
storage_class = "standard"

# Database
deploy_database = true
db_name         = "vendhub_staging"
db_user         = "vendhub"
db_pool_size    = 10
db_ssl          = false
db_storage_size = "10Gi"

# Redis
deploy_redis       = true
redis_storage_size = "5Gi"

# Application
image_tag           = "staging"
api_replicas        = 1
api_max_replicas    = 3
web_replicas        = 1
client_replicas     = 1

# URLs (staging subdomain)
api_url     = "https://api-staging.vendhub.uz"
app_url     = "https://app-staging.vendhub.uz"
api_host    = "api-staging.vendhub.uz"
admin_host  = "admin-staging.vendhub.uz"
app_host    = "app-staging.vendhub.uz"
bot_host    = "bot-staging.vendhub.uz"
cors_origins = "https://admin-staging.vendhub.uz,https://app-staging.vendhub.uz"

# Feature Flags
feature_telegram_bot = true
feature_sms          = false  # Disabled in staging
feature_ai           = true
feature_ofd          = false

# Rate Limiting (more lenient for testing)
throttle_ttl   = 60
throttle_limit = 200

# Logging
log_level = "debug"

# Ingress
enable_ingress = true
ingress_class  = "nginx"

# TLS
enable_tls           = true
install_cert_manager = true
letsencrypt_email    = "admin@vendhub.uz"

# Monitoring
enable_monitoring = true
enable_backups    = false  # No backups in staging
grafana_host      = "grafana-staging.vendhub.uz"
