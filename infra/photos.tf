# ── Gallery images ──

# Written only by scripts/photos.py from a local SSO session; CI never touches it. Keys are random
# per upload and never overwritten, so there is nothing for versioning to protect.
resource "aws_s3_bucket" "photos" {
  bucket = "felix-hzv-dev-photos"
}

resource "aws_s3_bucket_public_access_block" "photos" {
  bucket = aws_s3_bucket.photos.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "photos" {
  bucket = aws_s3_bucket.photos.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_cloudfront_origin_access_control" "photos" {
  name                              = "felix-hzv-dev-photos"
  description                       = "CloudFront reads gallery images"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Only img/* is readable, and only through this distribution. Without s3:ListBucket a missing key
# answers 403, which the distribution's SPA fallback turns into index.html.
data "aws_iam_policy_document" "photos" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.photos.arn}/img/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.cdn.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "photos" {
  bucket = aws_s3_bucket.photos.id
  policy = data.aws_iam_policy_document.photos.json

  depends_on = [aws_s3_bucket_public_access_block.photos]
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

output "photos_bucket" {
  value = aws_s3_bucket.photos.bucket
}
