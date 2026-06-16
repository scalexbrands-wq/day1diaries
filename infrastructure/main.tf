# ============================================================
# DAY1 DIARIES — AWS INFRASTRUCTURE (Terraform)
# Provisions: VPC, RDS Postgres, Cognito, S3+CloudFront (frontend),
#             ECS Fargate + ALB (API backend), ECR,
#             CloudFront proxy in front of the API (HTTPS for ALB)
# ============================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ── Variables ────────────────────────────────────────────────
variable "aws_region"     { default = "ap-south-1" }   # Mumbai — closest to India
variable "project_name"   { default = "day1diaries" }
variable "environment"    { default = "production" }
variable "db_username"    { default = "day1admin" }
variable "db_password"    { sensitive = true }          # supply via terraform.tfvars or TF_VAR_db_password
variable "db_name"        { default = "day1diaries" }
variable "domain_name"    { default = "" }              # optional: yourdomain.com

locals {
  name = "${var.project_name}-${var.environment}"
  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ============================================================
# NETWORKING — VPC, Subnets, Security Groups
# ============================================================

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = merge(local.tags, { Name = "${local.name}-vpc" })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = merge(local.tags, { Name = "${local.name}-igw" })
}

# Public subnets (for ALB + NAT + RDS)
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = merge(local.tags, { Name = "${local.name}-public-${count.index}" })
}

# Private subnets (for ECS tasks)
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = merge(local.tags, { Name = "${local.name}-private-${count.index}" })
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = merge(local.tags, { Name = "${local.name}-public-rt" })
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# NAT gateway for private subnets to reach internet (ECS pulling images, etc.)
resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = merge(local.tags, { Name = "${local.name}-nat-eip" })
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  tags          = merge(local.tags, { Name = "${local.name}-nat" })
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
  tags = merge(local.tags, { Name = "${local.name}-private-rt" })
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ── Security Groups ──────────────────────────────────────────

resource "aws_security_group" "alb" {
  name_prefix = "${local.name}-alb-"
  vpc_id      = aws_vpc.main.id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = local.tags
}

resource "aws_security_group" "ecs" {
  name_prefix = "${local.name}-ecs-"
  vpc_id      = aws_vpc.main.id
  ingress {
    from_port       = 4000
    to_port         = 4000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = local.tags
}

resource "aws_security_group" "rds" {
  name_prefix = "${local.name}-rds-"
  vpc_id      = aws_vpc.main.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = local.tags
}

# ============================================================
# RDS POSTGRESQL
# ============================================================

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db-subnet"
  subnet_ids = aws_subnet.public[*].id
  tags       = local.tags
}

resource "aws_db_instance" "main" {
  identifier             = "${local.name}-db"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = "db.t4g.micro"        # ~$13/mo — upgrade as you scale
  allocated_storage      = 20
  max_allocated_storage  = 100                    # auto-scales storage up to 100GB
  storage_type           = "gp3"
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  multi_az               = false                  # set true for production HA (+cost)
  publicly_accessible    = true
  storage_encrypted      = true
  backup_retention_period = 0
  skip_final_snapshot    = true
  deletion_protection    = false
  tags                   = local.tags
}

# ============================================================
# COGNITO — USER POOL + IDENTITY (Auth)
# ============================================================

resource "aws_cognito_user_pool" "main" {
  name = "${local.name}-users"

  username_attributes     = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  schema {
    name                = "username"
    attribute_data_type = "String"
    required            = false
    mutable             = true
  }

  schema {
    name                = "full_name"
    attribute_data_type = "String"
    required            = false
    mutable             = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  lifecycle {
    ignore_changes = [schema]
  }

  tags = local.tags
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "${local.name}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false   # public SPA client — no secret
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ]

  access_token_validity  = 1   # hours
  id_token_validity      = 1
  refresh_token_validity = 30  # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Google OAuth — configure via aws_cognito_identity_provider below if needed
  supported_identity_providers = ["COGNITO"]

  callback_urls = var.domain_name != "" ? [
    "https://${var.domain_name}/", "https://www.${var.domain_name}/", "http://localhost:3000/"
  ] : ["http://localhost:3000/"]
  logout_urls = var.domain_name != "" ? [
    "https://${var.domain_name}/", "https://www.${var.domain_name}/", "http://localhost:3000/"
  ] : ["http://localhost:3000/"]
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${local.name}-auth-2026x7k"
  user_pool_id = aws_cognito_user_pool.main.id
}

# ============================================================
# S3 + CLOUDFRONT — Frontend hosting
# ============================================================

resource "aws_s3_bucket" "frontend" {
  bucket = "${local.name}-frontend"
  tags   = local.tags
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  index_document { suffix = "index.html" }
  error_document { key = "index.html" }    # SPA routing fallback
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                 = "always"
  signing_protocol                 = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"   # US/EU/India edge locations only — cheaper

  aliases = local.use_custom_domain ? [var.domain_name, "www.${var.domain_name}"] : []

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    compress                = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  # SPA fallback — React Router needs index.html for all paths
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  dynamic "viewer_certificate" {
    for_each = local.use_custom_domain ? [1] : []
    content {
      acm_certificate_arn      = aws_acm_certificate.frontend[0].arn
      ssl_support_method       = "sni-only"
      minimum_protocol_version = "TLSv1.2_2021"
    }
  }

  dynamic "viewer_certificate" {
    for_each = local.use_custom_domain ? [] : [1]
    content {
      cloudfront_default_certificate = true
    }
  }

  tags = local.tags
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontAccess"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
      Condition = {
        StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn }
      }
    }]
  })
}

# ============================================================
# CLOUDFRONT — HTTPS proxy in front of the API ALB
# ============================================================
# Gives the API an HTTPS endpoint (*.cloudfront.net) without
# needing a custom domain — avoids browser mixed-content errors
# when the frontend (HTTPS) calls the API (ALB is HTTP-only by
# default unless a custom domain + ACM cert is configured).

resource "aws_cloudfront_distribution" "api" {
  enabled     = true
  price_class = "PriceClass_100"

  origin {
    domain_name = aws_lb.api.dns_name
    origin_id   = "alb-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "alb-api"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "Origin"]
      cookies { forward = "none" }
    }
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = local.tags
}

# ============================================================
# ECR — Docker registry for API backend
# ============================================================

resource "aws_ecr_repository" "api" {
  name                 = "${local.name}-api"
  image_tag_mutability = "MUTABLE"
  tags                 = local.tags
}

# ============================================================
# ECS FARGATE — API Backend
# ============================================================

resource "aws_ecs_cluster" "main" {
  name = "${local.name}-cluster"
  tags = local.tags
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.name}-api"
  retention_in_days = 14
  tags              = local.tags
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256    # 0.25 vCPU — adjust as needed
  memory                   = 512    # 512 MB
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "api"
    image     = "${aws_ecr_repository.api.repository_url}:latest"
    essential = true
    portMappings = [{ containerPort = 4000, protocol = "tcp" }]
    environment = [
      { name = "PORT",            value = "4000" },
      { name = "DB_HOST",         value = aws_db_instance.main.address },
      { name = "DB_PORT",         value = "5432" },
      { name = "DB_NAME",         value = var.db_name },
      { name = "DB_USER",         value = var.db_username },
      { name = "COGNITO_USER_POOL_ID", value = aws_cognito_user_pool.main.id },
      { name = "COGNITO_CLIENT_ID",    value = aws_cognito_user_pool_client.web.id },
      { name = "AWS_REGION",      value = var.aws_region },
      { name = "CORS_ORIGIN",     value = join(",", compact([
          local.use_custom_domain ? "https://${var.domain_name}" : "",
          local.use_custom_domain ? "https://www.${var.domain_name}" : "",
          "https://${aws_cloudfront_distribution.frontend.domain_name}",
        ])) },
    ]
    secrets = [
      { name = "DB_PASSWORD", valueFrom = aws_secretsmanager_secret.db_password.arn }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api"
      }
    }
  }])

  tags = local.tags
}

resource "aws_secretsmanager_secret" "db_password" {
  name = "${local.name}-db-password"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}

resource "aws_ecs_service" "api" {
  name            = "${local.name}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 1                # scale up later
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 4000
  }

  depends_on = [aws_lb_listener.api]
  tags       = local.tags
}

# ── IAM Roles ────────────────────────────────────────────────

resource "aws_iam_role" "ecs_execution" {
  name = "${local.name}-ecs-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "secrets-access"
  role = aws_iam_role.ecs_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [aws_secretsmanager_secret.db_password.arn]
    }]
  })
}

resource "aws_iam_role" "ecs_task" {
  name = "${local.name}-ecs-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
  tags = local.tags
}

# Allow task to verify Cognito tokens and auto-confirm sign-ups
resource "aws_iam_role_policy" "ecs_task_cognito" {
  name = "cognito-access"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["cognito-idp:GetUser", "cognito-idp:AdminGetUser", "cognito-idp:AdminConfirmSignUp"]
      Resource = [aws_cognito_user_pool.main.arn]
    }]
  })
}

# ============================================================
# APPLICATION LOAD BALANCER
# ============================================================

resource "aws_lb" "api" {
  name               = "${local.name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
  tags               = local.tags
}

resource "aws_lb_target_group" "api" {
  name        = "${local.name}-api-tg"
  port        = 4000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }
  tags = local.tags
}

resource "aws_lb_listener" "api" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# HTTPS listener — only created when a custom domain + ACM cert is configured
resource "aws_lb_listener" "api_https" {
  count             = local.use_custom_domain ? 1 : 0
  load_balancer_arn = aws_lb.api.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.api[0].arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# ============================================================
# OUTPUTS
# ============================================================

output "rds_endpoint" {
  value = aws_db_instance.main.address
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "cognito_domain" {
  value = aws_cognito_user_pool_domain.main.domain
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "api_load_balancer_dns" {
  value = aws_lb.api.dns_name
}

output "frontend_s3_bucket" {
  value = aws_s3_bucket.frontend.id
}

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "aws_region" {
  value = var.aws_region
}

output "api_cloudfront_domain" {
  value = aws_cloudfront_distribution.api.domain_name
}
