# ============================================================
# DAY1 DIARIES — CUSTOM DOMAIN MAPPING (optional)
# ============================================================
# Only takes effect when var.domain_name is set (non-empty).
# Leave domain_name = "" in terraform.tfvars to skip entirely —
# everything below becomes inert (count = 0) and main.tf's
# references to these resources/locals resolve safely.
# ============================================================

variable "use_route53" {
  description = "Set true if your domain's DNS is hosted in Route 53"
  default     = false
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID for your domain (required if use_route53 = true)"
  default     = ""
}

variable "api_subdomain" {
  description = "Subdomain to use for the API (e.g. 'api' -> api.yourdomain.com)"
  default     = "api"
}

locals {
  use_custom_domain = var.domain_name != ""
  api_domain        = local.use_custom_domain ? "${var.api_subdomain}.${var.domain_name}" : ""
}

# ── ACM certificate for CloudFront (frontend) — MUST be us-east-1 ──
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

resource "aws_acm_certificate" "frontend" {
  count             = local.use_custom_domain ? 1 : 0
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = ["www.${var.domain_name}"]

  lifecycle { create_before_destroy = true }
  tags = local.tags
}

# ── ACM certificate for ALB (API) — same region as ALB ─────────
resource "aws_acm_certificate" "api" {
  count             = local.use_custom_domain ? 1 : 0
  domain_name       = local.api_domain
  validation_method = "DNS"

  lifecycle { create_before_destroy = true }
  tags = local.tags
}

# ============================================================
# ROUTE 53 (only if use_route53 = true)
# ============================================================

resource "aws_route53_record" "frontend_cert_validation" {
  for_each = local.use_custom_domain && var.use_route53 ? {
    for dvo in aws_acm_certificate.frontend[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = var.hosted_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = local.use_custom_domain && var.use_route53 ? {
    for dvo in aws_acm_certificate.api[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = var.hosted_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "frontend" {
  count                   = local.use_custom_domain && var.use_route53 ? 1 : 0
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.frontend[0].arn
  validation_record_fqdns = [for r in aws_route53_record.frontend_cert_validation : r.fqdn]
}

resource "aws_acm_certificate_validation" "api" {
  count                   = local.use_custom_domain && var.use_route53 ? 1 : 0
  certificate_arn         = aws_acm_certificate.api[0].arn
  validation_record_fqdns = [for r in aws_route53_record.api_cert_validation : r.fqdn]
}

resource "aws_route53_record" "frontend_apex" {
  count   = local.use_custom_domain && var.use_route53 ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "frontend_www" {
  count   = local.use_custom_domain && var.use_route53 ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = "www.${var.domain_name}"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api" {
  count   = local.use_custom_domain && var.use_route53 ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = local.api_domain
  type    = "A"
  alias {
    name                   = aws_lb.api.dns_name
    zone_id                = aws_lb.api.zone_id
    evaluate_target_health = true
  }
}

output "manual_dns_instructions" {
  value = local.use_custom_domain ? (
    var.use_route53 ?
    "Route 53 records created automatically." :
    "Custom domain configured — run `terraform output` for cert validation records and DNS targets."
  ) : "No custom domain configured. Set domain_name in terraform.tfvars to enable."
}

output "api_custom_domain" {
  value = local.api_domain
}
