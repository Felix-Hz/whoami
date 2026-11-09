# ── GitHub Actions roles (OIDC) ──

locals {
  github_repository = "Felix-Hz/whoami"
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_policy_document" "github_assume" {
  for_each = {
    plan   = ["repo:${local.github_repository}:pull_request"]
    apply  = ["repo:${local.github_repository}:environment:PROD"]
    deploy = ["repo:${local.github_repository}:environment:PROD"]
  }

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = each.value
    }
  }
}

# Plans on pull requests run with -lock=false, so read-only is enough.
resource "aws_iam_role" "terraform_plan" {
  name               = "whoami-terraform-plan"
  assume_role_policy = data.aws_iam_policy_document.github_assume["plan"].json
}

resource "aws_iam_role_policy_attachment" "terraform_plan_read_only" {
  role       = aws_iam_role.terraform_plan.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# Applies IAM changes, so needs full admin.
resource "aws_iam_role" "terraform_apply" {
  name               = "whoami-terraform-apply"
  assume_role_policy = data.aws_iam_policy_document.github_assume["apply"].json
}

resource "aws_iam_role_policy_attachment" "terraform_apply_admin" {
  role       = aws_iam_role.terraform_apply.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_role" "deploy" {
  name               = "whoami-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_assume["deploy"].json
}

data "aws_iam_policy_document" "deploy" {
  statement {
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = [aws_s3_bucket.whoami_build.arn]
  }

  statement {
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.whoami_build.arn}/*"]
  }

  statement {
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [aws_cloudfront_distribution.cdn.arn]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "site-sync-and-invalidate"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}

output "terraform_plan_role_arn" {
  value = aws_iam_role.terraform_plan.arn
}

output "terraform_apply_role_arn" {
  value = aws_iam_role.terraform_apply.arn
}

output "deploy_role_arn" {
  value = aws_iam_role.deploy.arn
}
