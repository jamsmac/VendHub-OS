#!/bin/bash
#
# Generate TypeScript SDK from OpenAPI spec
#
# Prerequisites:
#   - API server running at http://localhost:4000
#   - @openapitools/openapi-generator-cli installed (npx handles this)
#
# Usage:
#   ./scripts/generate-sdk.sh
#

set -e

SPEC_URL="${SPEC_URL:-http://localhost:4000/api/docs-json}"
OUTPUT_DIR="packages/shared/src/generated/api-sdk"

echo "Fetching OpenAPI spec from $SPEC_URL..."
curl -s "$SPEC_URL" -o /tmp/vendhub-openapi.json

if [ ! -s /tmp/vendhub-openapi.json ]; then
  echo "ERROR: Could not fetch OpenAPI spec. Is the API server running?"
  exit 1
fi

echo "Generating TypeScript SDK..."
npx @openapitools/openapi-generator-cli generate \
  -i /tmp/vendhub-openapi.json \
  -g typescript-axios \
  -o "$OUTPUT_DIR" \
  --additional-properties=supportsES6=true,npmName=@vendhub/api-sdk,withSeparateModelsAndApi=true,apiPackage=api,modelPackage=models

echo "SDK generated at $OUTPUT_DIR"
echo ""
echo "To use in apps:"
echo "  import { MachinesApi, Configuration } from '@vendhub/shared/generated/api-sdk';"
echo "  const api = new MachinesApi(new Configuration({ basePath: '/api/v1' }));"
