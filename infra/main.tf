terraform {
  backend "s3" {
  }
}

/*    ________ */
/*   / __/_  / */
/*  _\ \_/_ <  */
/* /___/____/  */

resource "aws_s3_bucket" "whoami_build" {
  bucket        = "felix-hzv.dev"
  force_destroy = true

  tags = {
    Application = "PERSONAL_WEBSITE"
    Environment = "production"
  }
}

resource "aws_s3_bucket_versioning" "versioning" {
  bucket = aws_s3_bucket.whoami_build.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "block" {
  bucket = aws_s3_bucket.whoami_build.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

/*   _______             ______              __  */
/*  / ___/ /__  __ _____/ / __/______  ___  / /_ */
/* / /__/ / _ \/ // / _  / _// __/ _ \/ _ \/ __/ */
/* \___/_/\___/\_,_/\_,_/_/ /_/  \___/_//_/\__/  */

# Route 53 zone
resource "aws_route53_zone" "main" {
  name = "felix-hzv.dev"

  tags = {
    Application = "PERSONAL_WEBSITE"
    Environment = "production"
  }
}

# DNS records 
resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "felix-hzv.dev"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.felix-hzv.dev"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

/*   __  ___     _ __  */
/*  /  |/  /__ _(_) /  */
/* / /|_/ / _ `/ / /   */
/* /_/  /_/\_,_/_/_/    */

resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "felix-hzv.dev"
  type    = "MX"
  ttl     = 300
  records = [
    "10 mx1.privateemail.com",
    "10 mx2.privateemail.com"
  ]
}

resource "aws_route53_record" "spf" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "felix-hzv.dev"
  type    = "TXT"
  ttl     = 300
  records = [
    "v=spf1 include:spf.privateemail.com ~all"
  ]
}

resource "aws_cloudfront_origin_access_identity" "origin_access_identity" {
  comment = "OAI for CloudFront to access S3"
}

resource "aws_s3_bucket_policy" "policy" {
  bucket = aws_s3_bucket.whoami_build.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.origin_access_identity.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.whoami_build.arn}/*"
      }
    ]
  })
}

resource "aws_cloudfront_function" "rewrite_uri" {
  name    = "rewrite-uri-index"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      var uri = request.uri;
      if (uri.endsWith('/')) {
        request.uri += 'index.html';
      } else if (!uri.includes('.')) {
        request.uri += '/index.html';
      }
      return request;
    }
  EOF
}

resource "aws_cloudfront_distribution" "cdn" {

  aliases = ["felix-hzv.dev", "www.felix-hzv.dev"]

  tags = {
    Application = "PERSONAL_WEBSITE"
    Environment = "production"
  }

  origin {
    domain_name = aws_s3_bucket.whoami_build.bucket_regional_domain_name
    origin_id   = "s3-whoami_build-origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.origin_access_identity.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_200" // Mid tier: Asia, Australia Europe, US, Canada

  default_cache_behavior {
    compress = true

    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-whoami_build-origin"

    min_ttl     = 0        # Minimum time to cache
    default_ttl = 86400    # 24 hours (default cache duration)
    max_ttl     = 31536000 # 1 year (max cache duration)

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite_uri.arn
    }
  }

  # SPA fallback: serve index.html for unknown paths so client-side router handles them
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
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

