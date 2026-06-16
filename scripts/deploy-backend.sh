#!/bin/bash
# ============================================================
# Day1 Diaries — Build & push API image to ECR, deploy to ECS
# Usage: ./deploy-backend.sh
# Requires: AWS CLI + Docker configured, terraform outputs available
# ============================================================
set -e

cd "$(dirname "$0")/.."

AWS_REGION=$(terraform -chdir=infrastructure output -raw aws_region 2>/dev/null || echo "ap-south-1")
ECR_REPO=$(terraform -chdir=infrastructure output -raw ecr_repository_url)
ECS_CLUSTER="day1diaries-production-cluster"
ECS_SERVICE="day1diaries-production-api"

echo "── Logging into ECR ────────────────────────────────────"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REPO"

echo "── Building Docker image ───────────────────────────────"
cd backend
docker build -t day1diaries-api .

echo "── Tagging & pushing to ECR ────────────────────────────"
docker tag day1diaries-api:latest "${ECR_REPO}:latest"
docker push "${ECR_REPO}:latest"

echo "── Forcing ECS service redeploy ────────────────────────"
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --force-new-deployment \
  --region "$AWS_REGION" > /dev/null

echo ""
echo "✅ Backend image pushed and ECS service redeploying!"
echo "   Monitor: aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE"
