/*   _______             ______              __  */
/*  / ___/ /__  __ _____/ / __/______  ___  / /_ */
/* / /__/ / _ \/ // / _  / _// __/ _ \/ _ \/ __/ */
/* \___/_/\___/\_,_/\_,_/_/ /_/  \___/_//_/\__/  */

resource "aws_acm_certificate" "cert" { // SSL cert
  provider          = aws.cloudfront_provider
  domain_name       = "felix-hzv.dev"
  validation_method = "DNS"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
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

resource "aws_cloudfront_distribution" "cdn" {
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
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
