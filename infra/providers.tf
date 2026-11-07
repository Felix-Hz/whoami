terraform {

  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.68"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-southeast-2" // Sydney
}

# Reads CLOUDFLARE_API_TOKEN from the environment
provider "cloudflare" {}
