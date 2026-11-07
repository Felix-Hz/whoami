/*   _______             ______             */
/*  / ___/ /__  __ _____/ / _/ /__ ________ */
/* / /__/ / _ \/ // / _  / _/ / _ `/ __/ -_)*/
/* \___/_/\___/\_,_/\_,_/_//_/\_,_/_/  \__/ */

# felix-hzv.dev DNS on Cloudflare. DNS-only throughout: CloudFront and privateemail.com
# terminate TLS, and a proxied CNAME to a mail host breaks IMAP and SMTP clients.

locals {
  site_hosts = toset(["felix-hzv.dev", "www.felix-hzv.dev"])
}

resource "cloudflare_dns_record" "site" {
  for_each = local.site_hosts

  zone_id = var.cloudflare_zone_id
  name    = each.value
  # Cloudflare answers an apex CNAME with flattened A/AAAA records
  type    = "CNAME"
  content = aws_cloudfront_distribution.cdn.domain_name
  ttl     = 1
  proxied = false
  comment = "whoami site (CloudFront)"
}

resource "cloudflare_dns_record" "mx" {
  for_each = toset(["mx1.privateemail.com", "mx2.privateemail.com"])

  zone_id  = var.cloudflare_zone_id
  name     = "felix-hzv.dev"
  type     = "MX"
  content  = each.value
  priority = 10
  ttl      = 300
  comment  = "mail (privateemail.com)"
}

resource "cloudflare_dns_record" "spf" {
  zone_id = var.cloudflare_zone_id
  name    = "felix-hzv.dev"
  type    = "TXT"
  content = "\"v=spf1 include:spf.privateemail.com ~all\""
  ttl     = 300
  comment = "mail (privateemail.com)"
}

# The certificate itself is created outside Terraform (var.acm_certificate_arn); ACM renews
# only while this record resolves.
resource "cloudflare_dns_record" "acm_validation" {
  zone_id = var.cloudflare_zone_id
  name    = "_2a55439a80d7ed89dda744aa955c3a49.felix-hzv.dev"
  type    = "CNAME"
  content = "_d85b470bcd57dd7b854afb3bb8682019.xlfgrmvvlj.acm-validations.aws"
  ttl     = 300
  proxied = false
  comment = "ACM validation for the CloudFront certificate"
}
