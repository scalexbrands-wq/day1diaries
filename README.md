# Day1 Diaries — AWS Deployment Guide

Complete migration from Supabase + Netlify → **AWS** (RDS Postgres, Cognito, S3 + CloudFront, ECS Fargate).

---

## 1. Architecture Overview

```
                                   ┌─────────────────────┐
                                   │   CloudFront (CDN)   │
                                   │  + S3 (React build)  │
                                   └──────────┬───────────┘
                                              │
                          User's browser ────┤
                                              │
                                   ┌──────────▼───────────┐
                                   │   ALB (port 80/443)   │
                                   └──────────┬───────────┘
                                              │
                                   ┌──────────▼───────────┐
                                   │  ECS Fargate (API)    │
                                   │  Express + Node 20    │
                                   └──────────┬───────────┘
                                              │
                       ┌──────────────────────┼──────────────────────┐
                       │                                              │
            ┌──────────▼───────────┐                       ┌─────────▼──────────┐
            │  RDS Postgres 16      │                       │  Cognito User Pool  │
            │  (private subnet)     │                       │  (auth/JWT)         │
            └───────────────────────┘                       └─────────────────────┘
```

| Layer | Service | Notes |
|---|---|---|
| Frontend hosting | S3 + CloudFront | Static React build, SPA routing via 403/404 → index.html |
| API | ECS Fargate + ALB | Express.js, Dockerized, auto-scales |
| Database | RDS Postgres 16 (db.t4g.micro) | Private subnet, 20GB → 100GB autoscale |
| Auth | Cognito User Pool | Email/password + optional Google OAuth |
| Container registry | ECR | API Docker images |
| Networking | VPC, 2 AZs | Public subnets (ALB/NAT), private subnets (RDS/ECS) |

---

## 2. Prerequisites

- AWS account with admin access (or sufficient IAM permissions for VPC, RDS, ECS, Cognito, S3, CloudFront, ECR, IAM, Secrets Manager)
- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) configured (`aws configure`)
- Docker (for building the API image)
- Node.js 20+
- `psql` / `pg_dump` (Postgres 16 client tools) — for schema setup and data migration

---

## 3. Step-by-Step Deployment

### Step 1 — Configure Terraform variables

```bash
cd infrastructure
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
db_password = "ChooseAStrongPassword123!"   # required, no default
domain_name  = ""                            # optional: "app.yourdomain.com"
aws_region   = "ap-south-1"                  # Mumbai (closest to India). Change if needed.
```

> **Note:** Never commit `terraform.tfvars` — it's already gitignored.

### Step 2 — Provision infrastructure

```bash
terraform init
terraform plan      # review what will be created
terraform apply     # type "yes" to confirm
```

This takes **10–15 minutes** (RDS + NAT Gateway are the slowest). When done, note the outputs:

```bash
terraform output
```

You'll see: `rds_endpoint`, `cognito_user_pool_id`, `cognito_client_id`, `cognito_domain`, `cloudfront_domain`, `api_load_balancer_dns`, `frontend_s3_bucket`, `ecr_repository_url`.

### Step 3 — Set up the database schema

```bash
export RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
psql "postgresql://day1admin:<your-db-password>@${RDS_ENDPOINT}:5432/day1diaries" \
  -f schema.sql
```

This creates all 16 tables/views, indexes, triggers, and seeds the 8 default habits + 8 gamification levels + landing page defaults.

### Step 4 — (Optional) Migrate existing Supabase data

If you have existing users/stories in Supabase you want to bring over:

```bash
cd ../scripts
export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
export RDS_DB_URL="postgresql://day1admin:<password>@${RDS_ENDPOINT}:5432/day1diaries"
./migrate-data.sh
```

Read the script's final warning about Cognito UUIDs vs old Supabase `auth.users` UUIDs — existing users will need to re-register under Cognito (their old stories/profile remain in the DB but won't auto-link until they sign up with the same email and you run a relink step).

### Step 5 — Deploy the backend API

```bash
cd ../backend
cp .env.example .env
```

Fill in `.env` with the Terraform outputs (`DB_HOST`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, etc.) — **but for ECS, these are injected automatically via the task definition + Secrets Manager**, so `.env` is only for local testing.

Build and push to ECR, then deploy to ECS:

```bash
cd ../scripts
./deploy-backend.sh
```

This will:
1. Log in to ECR
2. Build the Docker image
3. Push to ECR
4. Force ECS to redeploy with the new image

Verify the API is healthy:
```bash
curl http://$(terraform -chdir=../infrastructure output -raw api_load_balancer_dns)/health
# → {"status":"ok","timestamp":"..."}
```

### Step 6 — Configure and deploy the frontend

```bash
cd ../frontend   # your React app root (day1diaries/)
cp .env.example .env.production
```

Fill in `.env.production`:

```bash
REACT_APP_API_BASE_URL=http://<api_load_balancer_dns>          # or https://api.yourdomain.com
REACT_APP_COGNITO_USER_POOL_ID=<cognito_user_pool_id>
REACT_APP_COGNITO_CLIENT_ID=<cognito_client_id>
REACT_APP_COGNITO_DOMAIN=<cognito_domain>
REACT_APP_AWS_REGION=ap-south-1
```

Copy over the AWS-specific source files (these replace the Supabase versions):

```bash
cp ../day1diaries-aws/frontend-config/src/lib/api.js          src/lib/api.js
cp ../day1diaries-aws/frontend-config/src/contexts/AuthContext.js src/contexts/AuthContext.js
cp ../day1diaries-aws/frontend-config/src/pages/Login.js       src/pages/Login.js
cp ../day1diaries-aws/frontend-config/src/pages/Register.js    src/pages/Register.js
```

Then update every page/component that imports from `../lib/supabase` to import from `../lib/api` instead (the function names match 1:1 — see Section 5).

Build and deploy:

```bash
cd ../scripts
./deploy-frontend.sh
```

Visit `https://$(terraform -chdir=../infrastructure output -raw cloudfront_domain)` 🎉

---

## 4. Post-Deployment Checklist

- [ ] `GET /health` on the ALB returns `{"status":"ok"}`
- [ ] Sign up a test user → check email for Cognito verification code → confirm → land on `/feed`
- [ ] Promote your test user to admin: `UPDATE profiles SET role='admin' WHERE username='yourname';` directly via `psql`
- [ ] Visit `/admin` — confirm dashboard loads (habits, challenges, events, users tabs)
- [ ] Post a story, like it, comment on it — confirm counts update live on your profile
- [ ] Adopt a habit, log a day — confirm streak updates
- [ ] (Optional) Set up a custom domain: point Route 53 / your DNS at the CloudFront distribution and ALB, add an ACM certificate, update `domain_name` in `terraform.tfvars`, re-apply

---

## 5. Frontend Code Changes Required

Your existing React pages import from `src/lib/supabase.js`. The new `src/lib/api.js` (in `frontend-config/src/lib/`) exports **the same function names** with the same signatures, calling the Express API instead of Supabase directly. In each page file, change:

```diff
- import { getStories, toggleLike, getProfile } from '../lib/supabase'
+ import { getStories, toggleLike, getProfile } from '../lib/api'
```

That's it for ~90% of calls — function names and return shapes (`{ data, error }`) are preserved. The only behavioral differences:

- **Auth**: `signUp`/`signIn` now go through Cognito (email confirmation required — see `Register.js`)
- **`getSession()`**: now reads from `localStorage` tokens instead of a Supabase session cookie
- **Real-time subscriptions**: if any page used `supabase.channel(...)` for live updates, those are not ported — the Express API is request/response only. Polling or WebSocket support can be added later if needed.

---

## 6. Cost Estimate (Monthly, ap-south-1 / Mumbai)

| Resource | Spec | Est. Monthly Cost (USD) |
|---|---|---|
| RDS Postgres | db.t4g.micro, 20GB gp3 | ~$13 |
| NAT Gateway | 1x, + data processing | ~$33 |
| Application Load Balancer | 1x | ~$17 |
| ECS Fargate | 1 task, 0.25 vCPU / 0.5GB, always-on | ~$9 |
| S3 | <5GB static assets | <$1 |
| CloudFront | Low traffic (PriceClass_100) | ~$1–5 |
| Cognito | Free tier covers first 50,000 MAU | $0 |
| ECR | <1GB images | <$1 |
| **Total** | | **~$75–80/month** |

**Cost-saving tips:**
- The NAT Gateway and ALB are the dominant fixed costs (~$50/month combined). For early-stage/dev environments, consider:
  - Removing the NAT Gateway and running ECS tasks in public subnets with security groups locking down access (saves ~$33/mo)
  - Using a single ALB across multiple projects, or switching to API Gateway + Lambda for very low traffic (pay-per-request)
- RDS can be stopped (not deleted) during long idle periods — note that stopped RDS instances still incur storage costs but not compute
- Enable RDS auto-pause is not available for Postgres; consider Aurora Serverless v2 if traffic is highly variable

---

## 7. Useful Commands

```bash
# Tail API logs
aws logs tail /ecs/day1diaries-production-api --follow

# Connect to RDS via psql (from a bastion or local with VPN/SSH tunnel — RDS is private)
psql "postgresql://day1admin:<password>@<rds_endpoint>:5432/day1diaries"

# Manually promote a user to admin
psql $RDS_DB_URL -c "UPDATE profiles SET role='admin' WHERE email='you@example.com';"

# Check ECS service status
aws ecs describe-services --cluster day1diaries-production-cluster --services day1diaries-production-api

# Destroy everything (careful!)
terraform destroy
```

---

## 8. File Map

```
day1diaries-aws/
├── README.md                          ← this file
├── infrastructure/
│   ├── main.tf                        ← all AWS resources (VPC, RDS, Cognito, S3, CF, ECS, ALB)
│   └── schema.sql                     ← Postgres schema, triggers, seed data
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js                   ← Express app entrypoint
│       ├── db/pool.js                 ← pg connection pool
│       ├── middleware/auth.js         ← Cognito JWT verification
│       └── routes/
│           ├── auth.js                ← signup/confirm/signin/refresh
│           ├── profiles.js
│           ├── stories.js
│           ├── social.js              ← follows, saves, leaderboard
│           ├── habits.js              ← habits, challenges, participations
│           ├── community.js           ← events/community updates
│           ├── admin.js
│           └── landing.js
├── frontend-config/
│   └── src/
│       ├── lib/api.js                 ← drop-in replacement for lib/supabase.js
│       ├── contexts/AuthContext.js    ← Cognito-based auth context
│       └── pages/
│           ├── Login.js
│           └── Register.js            ← includes email-confirmation step
└── scripts/
    ├── deploy-frontend.sh             ← build React → S3 → CloudFront invalidation
    ├── deploy-backend.sh              ← build Docker → ECR → ECS redeploy
    └── migrate-data.sh                ← Supabase → RDS data migration
```
