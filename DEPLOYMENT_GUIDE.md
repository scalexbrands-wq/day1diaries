# Day1 Diaries — Complete AWS Deployment Walkthrough

This is a literal step-by-step guide. Follow it top to bottom. Total time: roughly **1.5–2 hours**, mostly waiting for AWS resources to provision.

---

## Before You Start — What You Need

| Item | Where to get it |
|---|---|
| AWS account | console.aws.amazon.com (with billing enabled) |
| AWS CLI installed + configured | `aws configure` — needs an IAM user with admin access (or the permissions listed at the bottom) |
| Terraform installed | terraform.io/downloads — version 1.5+ |
| Docker installed | docker.com — needed to build the API image |
| Node.js 20+ | nodejs.org |
| `psql` (Postgres client) | `brew install postgresql` (Mac) or `apt install postgresql-client` (Linux) |
| Your domain | Already purchased (GoDaddy, Namecheap, Cloudflare, Route 53, etc.) |

---

## PART 1 — Provision AWS Infrastructure (Terraform)

### Step 1.1 — Get the files and configure

```bash
cd day1diaries-aws/infrastructure
cp terraform.tfvars.example terraform.tfvars
```

Open `terraform.tfvars` and edit:

```hcl
db_password = "PickAStrongPassword2026!"     # REQUIRED. Save this somewhere safe.
aws_region  = "ap-south-1"                    # Mumbai. Change if you want a different region.

# ── Domain settings — fill these in now ──
domain_name   = "yourdomain.com"              # your actual domain, no "www" or "https"
api_subdomain = "api"                          # → api.yourdomain.com

# Choose ONE of the two:
use_route53    = false    # true if your domain's DNS is in Route 53
hosted_zone_id = ""        # only if use_route53 = true (see Part 4)
```

> **Don't have a domain yet, or want to deploy first and map the domain later?** Set `domain_name = ""` for now. Everything will work on AWS-provided URLs (`*.cloudfront.net` and `*.elb.amazonaws.com`). You can add the domain later by editing `terraform.tfvars` and re-running `terraform apply` — see **Part 4**.

### Step 1.2 — Initialize and apply

```bash
terraform init
terraform plan
```

Review the plan — it should show roughly **45-55 resources** to create. Then:

```bash
terraform apply
```

Type `yes` when prompted. **This takes 12-18 minutes.** The slow parts are RDS (~10 min) and the NAT Gateway (~3 min). Grab a coffee.

### Step 1.3 — Save the outputs

When it finishes, run:

```bash
terraform output
```

You'll see something like:

```
api_custom_domain        = "api.yourdomain.com"
api_load_balancer_dns    = "day1diaries-production-alb-123456789.ap-south-1.elb.amazonaws.com"
cloudfront_domain        = "d1234abcdwxyz.cloudfront.net"
cognito_client_id        = "1a2b3c4d5e6f7g8h9i0j"
cognito_domain           = "day1diaries-production-auth"
cognito_user_pool_id     = "ap-south-1_AbCdEfGhI"
ecr_repository_url       = "123456789012.dkr.ecr.ap-south-1.amazonaws.com/day1diaries-production-api"
frontend_s3_bucket       = "day1diaries-production-frontend"
manual_dns_instructions  = "..."  (if domain_name is set and use_route53=false)
rds_endpoint             = "day1diaries-production-db.abc123xyz.ap-south-1.rds.amazonaws.com"
```

**Copy this entire block into a text file** — you'll need every value below.

---

## PART 2 — Set Up the Database

### Step 2.1 — Run the schema

The RDS instance is in a **private subnet** — you can't connect from your laptop directly. Two options:

**Option A — Temporary public access (simplest for one-time setup):**

```bash
# Get your RDS security group ID
SG_ID=$(terraform output -raw rds_endpoint | cut -d. -f1 | xargs -I{} aws rds describe-db-instances \
  --db-instance-identifier {} --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' --output text)

# Temporarily allow your IP
MY_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress --group-id $SG_ID \
  --protocol tcp --port 5432 --cidr ${MY_IP}/32

# Make RDS temporarily publicly accessible
aws rds modify-db-instance --db-instance-identifier day1diaries-production-db \
  --publicly-accessible --apply-immediately
```

Wait ~2 minutes for the change to apply, then:

```bash
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
psql "postgresql://day1admin:<your-db-password>@${RDS_ENDPOINT}:5432/day1diaries" \
  -f schema.sql
```

You should see at the end: `Schema created successfully. 17 tables/views created.`

**Then revert the public access (important for security):**

```bash
aws rds modify-db-instance --db-instance-identifier day1diaries-production-db \
  --no-publicly-accessible --apply-immediately
aws ec2 revoke-security-group-ingress --group-id $SG_ID \
  --protocol tcp --port 5432 --cidr ${MY_IP}/32
```

**Option B — SSH bastion / Session Manager tunnel (more secure, more setup):** if you'd rather not expose RDS even temporarily, launch a small EC2 instance in the public subnet and tunnel through it with `aws ssm start-session` port forwarding. This is more involved — Option A is fine for initial setup since you immediately revert it.

### Step 2.2 — Verify the schema

```bash
psql "postgresql://day1admin:<your-db-password>@${RDS_ENDPOINT}:5432/day1diaries" \
  -c "\dt"
```

You should see 17 tables: `profiles`, `stories`, `likes`, `comments`, `saves`, `follows`, `habits`, `user_habits`, `habit_logs`, `user_badges`, `habit_challenges`, `challenge_participations`, `community_updates`, `event_registrations`, `gamification_levels`, `landing_hero`, `landing_categories`, `landing_testimonials`.

### Step 2.3 — (Optional) Migrate existing data from Supabase

If you have real users/stories already in Supabase:

```bash
cd ../scripts
export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
export RDS_DB_URL="postgresql://day1admin:<your-db-password>@${RDS_ENDPOINT}:5432/day1diaries"
./migrate-data.sh
```

Read the warning it prints at the end about Cognito UUIDs.

---

## PART 3 — Deploy the Backend API

### Step 3.1 — Build and push the Docker image

```bash
cd ../backend

AWS_REGION=$(terraform -chdir=../infrastructure output -raw aws_region)
ECR_REPO=$(terraform -chdir=../infrastructure output -raw ecr_repository_url)

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO

# Build
docker build -t day1diaries-api .

# Tag and push
docker tag day1diaries-api:latest ${ECR_REPO}:latest
docker push ${ECR_REPO}:latest
```

### Step 3.2 — Deploy to ECS

The ECS service was created by Terraform but is waiting for a real image. Force it to pick up the one you just pushed:

```bash
aws ecs update-service \
  --cluster day1diaries-production-cluster \
  --service day1diaries-production-api \
  --force-new-deployment \
  --region $AWS_REGION
```

Wait ~2-3 minutes, then check status:

```bash
aws ecs describe-services \
  --cluster day1diaries-production-cluster \
  --services day1diaries-production-api \
  --query 'services[0].deployments[0].rolloutState'
```

Should say `"COMPLETED"`.

### Step 3.3 — Test the API

```bash
ALB_DNS=$(terraform -chdir=../infrastructure output -raw api_load_balancer_dns)
curl http://${ALB_DNS}/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-06-14T..."}
```

If this fails, check logs:
```bash
aws logs tail /ecs/day1diaries-production-api --follow
```

Common issue: DB connection refused — double-check `DB_HOST` in the task definition matches `rds_endpoint`, and that the ECS security group can reach RDS on 5432 (Terraform sets this up automatically, but worth checking if you customized anything).

---

## PART 4 — Map Your Domain

You set `domain_name` in `terraform.tfvars` back in Step 1.1. Now finish the DNS setup.

### If `use_route53 = true` (your DNS is already in Route 53)

Terraform already created everything — certificates, validation records, and A-records pointing your domain at CloudFront and your API subdomain at the ALB. Just wait 10-20 minutes for ACM validation + DNS propagation, then skip to **Step 4.3**.

### If `use_route53 = false` (GoDaddy, Namecheap, Cloudflare, etc.) — most common case

#### Step 4.1 — Get the exact records to add

```bash
cd infrastructure
terraform output manual_dns_instructions
```

This prints something like:

```
1) ACM CERTIFICATE VALIDATION — add these CNAME records:

   FRONTEND CERT (us-east-1):
   _a1b2c3d4e5f6.yourdomain.com  ->  _x7y8z9.acm-validations.aws.  (CNAME)

   API CERT:
   _f6e5d4c3b2a1.api.yourdomain.com  ->  _w1v2u3.acm-validations.aws.  (CNAME)

2) Wait for validation, then run: terraform apply

3) FRONTEND:
   yourdomain.com      -> ALIAS/ANAME -> d1234abcdwxyz.cloudfront.net
   www.yourdomain.com  -> CNAME       -> d1234abcdwxyz.cloudfront.net

4) API:
   api.yourdomain.com  -> CNAME -> day1diaries-production-alb-....elb.amazonaws.com
```

#### Step 4.2 — Add these records at your DNS provider

Log into your domain registrar's DNS management panel (GoDaddy: "DNS Management"; Namecheap: "Advanced DNS"; Cloudflare: "DNS" tab).

**a) Add the two ACM validation CNAME records first** (from step 1 above). These prove you own the domain.

> **GoDaddy/Namecheap tip:** when adding a CNAME, the "Host" field usually expects just the prefix, not the full domain. If the record name is `_a1b2c3d4e5f6.yourdomain.com`, enter `_a1b2c3d4e5f6` as the host.

**b) Wait for certificate validation** (5-30 minutes). Check status:

```bash
aws acm describe-certificate --region us-east-1 \
  --certificate-arn $(terraform output -json | jq -r '.acm_certificate_frontend_arn // empty') \
  --query 'Certificate.Status' 2>/dev/null || echo "Check ACM console instead"
```

Or simpler — just check the **ACM console** (Certificate Manager) in both `us-east-1` (frontend cert) and your main region (API cert). Both should show **"Issued"** once validated.

**c) Once both certs show "Issued", re-run:**

```bash
terraform apply
```

This activates the custom domain on CloudFront and adds the HTTPS listener on the ALB.

**d) Now add the domain records:**

- **Apex domain** (`yourdomain.com`):
  - If your DNS provider supports **ALIAS** or **ANAME** records (Cloudflare, Route 53, some others): point it at the CloudFront domain (`d1234abcdwxyz.cloudfront.net`)
  - If it **doesn't** (most registrars don't support ALIAS at apex): either (a) use `www.yourdomain.com` as your primary site and set up apex → www redirect at your registrar, or (b) move your DNS to Route 53/Cloudflare which support apex aliasing for free

- **`www.yourdomain.com`**: CNAME → `d1234abcdwxyz.cloudfront.net`

- **`api.yourdomain.com`**: CNAME → the ALB DNS name (`day1diaries-production-alb-....elb.amazonaws.com`)

#### Step 4.3 — Wait for DNS propagation (5 min - 24 hours, usually <1 hour)

Check propagation:

```bash
dig yourdomain.com
dig www.yourdomain.com
dig api.yourdomain.com
```

Each should eventually resolve to CloudFront or ALB IPs.

---

## PART 5 — Deploy the Frontend

### Step 5.1 — Configure environment variables

In your **React app root** (`day1diaries/`), create `.env.production`:

```bash
cd day1diaries   # your existing React project

cat > .env.production << EOF
REACT_APP_API_BASE_URL=https://api.yourdomain.com
REACT_APP_COGNITO_USER_POOL_ID=$(terraform -chdir=../day1diaries-aws/infrastructure output -raw cognito_user_pool_id)
REACT_APP_COGNITO_CLIENT_ID=$(terraform -chdir=../day1diaries-aws/infrastructure output -raw cognito_client_id)
REACT_APP_COGNITO_DOMAIN=$(terraform -chdir=../day1diaries-aws/infrastructure output -raw cognito_domain)
REACT_APP_AWS_REGION=ap-south-1
EOF
```

> **No custom domain yet?** Use `REACT_APP_API_BASE_URL=http://<api_load_balancer_dns>` (HTTP, not HTTPS — the ALB only has an HTTPS listener once a domain+cert is configured).

### Step 5.2 — Replace Supabase files with AWS versions

```bash
cp ../day1diaries-aws/frontend-config/src/lib/api.js              src/lib/api.js
cp ../day1diaries-aws/frontend-config/src/contexts/AuthContext.js src/contexts/AuthContext.js
cp ../day1diaries-aws/frontend-config/src/pages/Login.js          src/pages/Login.js
cp ../day1diaries-aws/frontend-config/src/pages/Register.js       src/pages/Register.js
```

### Step 5.3 — Update imports across the app

Every file that does `import { ... } from '../lib/supabase'` needs to become `import { ... } from '../lib/api'`. Quick way to find them all:

```bash
grep -rl "lib/supabase" src/
```

Then for each file:

```bash
sed -i "s|from '../lib/supabase'|from '../lib/api'|g" src/pages/*.js src/components/*.js
```

(Adjust paths if some files are nested deeper, e.g. `../../lib/supabase`.)

### Step 5.4 — Build and deploy

```bash
npm ci
npm run build

S3_BUCKET=$(terraform -chdir=../day1diaries-aws/infrastructure output -raw frontend_s3_bucket)
CF_ID=$(terraform -chdir=../day1diaries-aws/infrastructure output -raw cloudfront_distribution_id)

aws s3 sync build/ s3://${S3_BUCKET} --delete
aws cloudfront create-invalidation --distribution-id ${CF_ID} --paths "/*"
```

### Step 5.5 — Visit your site

```
https://yourdomain.com
```

(or `https://d1234abcdwxyz.cloudfront.net` if no domain yet)

---

## PART 6 — Final Checks & Going Live

### 6.1 — Create your admin account

1. Go to `/register`, sign up with your real email
2. Check email for the **6-digit Cognito verification code**, enter it
3. You'll land on `/feed`
4. Now promote yourself to admin via psql (re-enable temporary public RDS access as in Step 2.1 if needed, or use a bastion):

```bash
psql "postgresql://day1admin:<password>@${RDS_ENDPOINT}:5432/day1diaries" \
  -c "UPDATE profiles SET role='admin' WHERE email='you@example.com';"
```

5. Refresh the app — you should now see **Admin** in the sidebar

### 6.2 — Smoke test checklist

- [ ] Sign up → verify email → land on feed
- [ ] Write a story → appears in feed
- [ ] Like / comment / save → counts update on profile
- [ ] Adopt a habit → log a day → streak increments
- [ ] `/admin` loads — Habits, Challenges, Events, Users tabs all work
- [ ] `/community` shows challenges and events

### 6.3 — Cost monitoring

Set a billing alarm so you're not surprised:

```bash
aws budgets create-budget --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{"BudgetName":"day1diaries-monthly","BudgetLimit":{"Amount":"100","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}' \
  --notifications-with-subscribers '[{"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"you@example.com"}]}]'
```

Expected baseline: **~$75-85/month** (see `README.md` for the breakdown).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `terraform apply` fails on Cognito domain — "already exists" | Cognito domain prefixes are globally unique across AWS. Change `local.name` prefix or pick a more unique `project_name` in `main.tf` |
| ACM cert stuck "Pending validation" for hours | Double-check the CNAME record name/value were copied exactly (no trailing dots missing/extra) — use `dig CNAME _a1b2c3.yourdomain.com` to verify it resolves |
| API returns 401 for all requests | Check `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` in the ECS task definition match the Terraform outputs exactly |
| ECS task keeps restarting | `aws logs tail /ecs/day1diaries-production-api --follow` — usually a DB connection issue (check `DB_HOST`, security groups, or that schema.sql was run) |
| CloudFront shows old version after deploy | Invalidation takes 1-5 min; hard-refresh (Ctrl+Shift+R) or check invalidation status: `aws cloudfront get-invalidation --distribution-id <id> --id <invalidation-id>` |
| "Username already taken" on signup but user doesn't exist in app | Old Supabase migration data may have stale usernames — check `SELECT * FROM profiles WHERE username='...'` |

---

## Required IAM Permissions (if not using an admin user)

Your IAM user/role needs permissions for: `ec2` (VPC/subnets/SGs/NAT/EIP), `rds`, `cognito-idp`, `s3`, `cloudfront`, `ecr`, `ecs`, `elasticloadbalancing`, `iam` (role creation), `secretsmanager`, `logs`, `acm`, `route53` (if `use_route53=true`), `budgets` (for Step 6.3).

For a quick start, attaching the AWS-managed `AdministratorAccess` policy to your IAM user is simplest, then tighten later.
