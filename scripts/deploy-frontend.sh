#!/bin/bash
# ============================================================
# Day1 Diaries — Deploy frontend to S3 + CloudFront
# Usage: ./deploy-frontend.sh
# Requires: AWS CLI configured, terraform outputs available
# ============================================================
set -e

cd "$(dirname "$0")/.."

# Read Terraform outputs
S3_BUCKET=$(terraform -chdir=infrastructure output -raw frontend_s3_bucket)
CLOUDFRONT_ID=$(terraform -chdir=infrastructure output -raw cloudfront_distribution_id 2>/dev/null || true)
CLOUDFRONT_DOMAIN=$(terraform -chdir=infrastructure output -raw cloudfront_domain)

echo "── Building React app ──────────────────────────────────"
cd frontend
npm ci
npm run build

echo "── Syncing to S3 bucket: $S3_BUCKET ────────────────────"
# CRA's static assets are content-hashed (main.<hash>.js), so they're safe
# to cache for a year — a new deploy ships new filenames, never reuses an
# old one. index.html (and asset-manifest.json, which it indirectly
# depends on via those hashed filenames) must never be cached, or
# visitors keep loading a stale build that references deleted assets.
aws s3 sync build/ "s3://${S3_BUCKET}" --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" --exclude "asset-manifest.json"
aws s3 cp build/index.html "s3://${S3_BUCKET}/index.html" \
  --cache-control "public, max-age=0, must-revalidate"
if [ -f build/asset-manifest.json ]; then
  aws s3 cp build/asset-manifest.json "s3://${S3_BUCKET}/asset-manifest.json" \
    --cache-control "public, max-age=0, must-revalidate"
fi

if [ -n "$CLOUDFRONT_ID" ]; then
  echo "── Invalidating CloudFront cache ───────────────────────"
  aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_ID" --paths "/*"
fi

echo ""
echo "✅ Frontend deployed!"
echo "   URL: https://${CLOUDFRONT_DOMAIN}"
