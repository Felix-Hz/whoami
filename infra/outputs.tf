// Outputs --> 

output "bucket_name" {
  value = aws_s3_bucket.whoami_build.bucket
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.cdn.domain_name
}
