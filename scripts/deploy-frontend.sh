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
aws s3 sync build/ "s3://${S3_BUCKET}" --delete

if [ -n "$CLOUDFRONT_ID" ]; then
  echo "── Invalidating CloudFront cache ───────────────────────"
  aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_ID" --paths "/*"
fi

echo ""
echo "✅ Frontend deployed!"
echo "   URL: https://${CLOUDFRONT_DOMAIN}"
