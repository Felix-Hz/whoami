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
  alias  = "app_provider"
  region = "ap-southeast-2" // Sydney
}


provider "aws" {
  alias  = "cloudfront_provider"
  region = "us-east-1" // CloudFront requires ACM certs issued in `us-east-1`
}
