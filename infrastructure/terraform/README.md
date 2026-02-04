# VendHub Terraform Infrastructure

This directory contains Terraform configurations for deploying VendHub OS to Kubernetes.

## Overview

The Terraform configuration deploys:

- **PostgreSQL** (Bitnami Helm chart)
- **Redis** (Bitnami Helm chart)
- **VendHub Application** (Custom Helm chart)
- **Monitoring Stack** (Prometheus, Grafana, Loki)
- **Cert-Manager** (TLS certificates)

## Prerequisites

1. **Terraform** >= 1.5.0
2. **Kubernetes** cluster (EKS, GKE, AKS, or self-managed)
3. **kubectl** configured with cluster access
4. **Helm** 3.x

## Quick Start

### 1. Initialize Terraform

```bash
cd infrastructure/terraform
terraform init
```

### 2. Configure Variables

Create a `terraform.tfvars` file or use environment-specific files:

```bash
# Copy example
cp environments/staging.tfvars terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

### 3. Set Sensitive Variables

Export sensitive variables (don't commit to git):

```bash
export TF_VAR_telegram_bot_token="your-bot-token"
export TF_VAR_payme_secret_key="your-payme-key"
export TF_VAR_click_secret_key="your-click-key"
export TF_VAR_sms_api_key="your-sms-key"
export TF_VAR_storage_secret_key="your-storage-key"
export TF_VAR_openai_api_key="your-openai-key"
export TF_VAR_grafana_password="secure-password"
```

### 4. Plan & Apply

```bash
# Preview changes
terraform plan -var-file=environments/staging.tfvars

# Apply changes
terraform apply -var-file=environments/staging.tfvars
```

## Environment Configurations

### Staging

```bash
terraform apply -var-file=environments/staging.tfvars
```

Features:
- Single replica for most services
- Debug logging
- No backups
- Relaxed rate limiting

### Production

```bash
terraform apply -var-file=environments/production.tfvars
```

Features:
- Multiple replicas with autoscaling
- Info-level logging
- Automated backups
- Strict rate limiting
- TLS enabled

## File Structure

```
terraform/
├── main.tf                    # Main configuration
├── variables.tf               # Variable definitions
├── environments/
│   ├── staging.tfvars        # Staging configuration
│   └── production.tfvars     # Production configuration
└── README.md                  # This file
```

## Outputs

After applying, you'll get these outputs:

| Output | Description |
|--------|-------------|
| `namespace` | Kubernetes namespace |
| `db_password` | Database password (sensitive) |
| `redis_password` | Redis password (sensitive) |
| `jwt_secret` | JWT secret (sensitive) |
| `api_endpoint` | API URL |
| `admin_endpoint` | Admin panel URL |
| `app_endpoint` | Client app URL |
| `grafana_endpoint` | Grafana dashboard URL |

View outputs:
```bash
terraform output
terraform output -raw db_password  # View sensitive value
```

## Remote State (Recommended)

For team collaboration, configure remote state:

### AWS S3

```hcl
# In main.tf, uncomment and configure:
backend "s3" {
  bucket         = "vendhub-terraform-state"
  key            = "infrastructure/terraform.tfstate"
  region         = "eu-central-1"
  encrypt        = true
  dynamodb_table = "vendhub-terraform-locks"
}
```

Create the S3 bucket and DynamoDB table:
```bash
aws s3 mb s3://vendhub-terraform-state
aws dynamodb create-table \
  --table-name vendhub-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

## Customization

### Using External Database

Set `deploy_database = false` and provide connection details:

```hcl
deploy_database = false
db_host         = "your-rds-endpoint.amazonaws.com"
db_port         = 5432
db_name         = "vendhub"
db_user         = "vendhub"
db_password     = "your-password"
db_ssl          = true
```

### Using External Redis

Set `deploy_redis = false` and provide connection details:

```hcl
deploy_redis   = false
redis_host     = "your-elasticache-endpoint.amazonaws.com"
redis_port     = 6379
redis_password = "your-password"
```

### Disabling Monitoring

```hcl
enable_monitoring = false
```

### Custom Ingress Annotations

```hcl
ingress_annotations = {
  "kubernetes.io/ingress.class"                     = "nginx"
  "nginx.ingress.kubernetes.io/proxy-body-size"     = "100m"
  "nginx.ingress.kubernetes.io/rate-limit"          = "100"
  "external-dns.alpha.kubernetes.io/hostname"       = "api.vendhub.uz"
}
```

## Destroying Infrastructure

```bash
# Destroy all resources
terraform destroy -var-file=environments/staging.tfvars
```

**Warning**: This will delete all data. Backup databases before destroying.

## Troubleshooting

### Common Issues

**1. Helm release stuck in "pending-install"**
```bash
helm list -n vendhub --pending
helm delete vendhub-staging -n vendhub-staging --wait
```

**2. PVC pending**
```bash
kubectl get pvc -n vendhub
kubectl describe pvc <pvc-name> -n vendhub
```

**3. Pod not starting**
```bash
kubectl get pods -n vendhub
kubectl describe pod <pod-name> -n vendhub
kubectl logs <pod-name> -n vendhub
```

### Debug Mode

Enable detailed logging:
```bash
TF_LOG=DEBUG terraform apply
```

## Security Best Practices

1. **Never commit secrets** to git
2. Use **environment variables** or **secret managers** for sensitive values
3. Enable **TLS** in production
4. Use **remote state** with encryption
5. Enable **state locking** with DynamoDB
6. Review **IAM permissions** for Terraform execution

## Contributing

1. Make changes in a feature branch
2. Test in staging environment
3. Run `terraform fmt` before committing
4. Create a pull request with plan output
