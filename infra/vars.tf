variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate created in the AWS Console (us-east-1)"
  type        = string
  default     = ""
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for felix-hzv.dev"
  type        = string
}
