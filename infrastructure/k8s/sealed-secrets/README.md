# Sealed Secrets for VendHub Production

## Overview

Production uses [Bitnami Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
to encrypt secrets before committing to Git. Only the SealedSecrets controller
running in the cluster can decrypt them.

## Setup

### 1. Install SealedSecrets Controller

```bash
kubectl apply -f controller.yml
# Or via Helm:
# helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
# helm install sealed-secrets sealed-secrets/sealed-secrets -n kube-system
```

### 2. Install kubeseal CLI

```bash
# macOS
brew install kubeseal

# Linux
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.27.3/kubeseal-0.27.3-linux-amd64.tar.gz
tar -xvzf kubeseal-*.tar.gz kubeseal
sudo install -m 755 kubeseal /usr/local/bin/kubeseal
```

### 3. Seal Secrets

```bash
# Create plain secret, then seal it:
./seal-secrets.sh

# Or manually:
envsubst < ../base/secrets.yml | kubeseal \
  --controller-name=sealed-secrets \
  --controller-namespace=kube-system \
  --format yaml > sealed-secrets.yml
```

### 4. Apply

```bash
kubectl apply -f sealed-secrets.yml
```

## Rotation

When secrets change, re-run `seal-secrets.sh` with new env vars and commit the
updated `sealed-secrets.yml`. The controller will detect changes and update
the underlying Kubernetes Secret.

## Key Rotation

The controller auto-rotates its encryption key every 30 days. Old sealed
secrets remain valid. To re-encrypt with the latest key:

```bash
kubeseal --re-encrypt < sealed-secrets.yml > sealed-secrets-new.yml
mv sealed-secrets-new.yml sealed-secrets.yml
```
