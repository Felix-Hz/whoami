/*    ________ */
/*   / __/_  / */
/*  _\ \_/_ <  */
/* /___/____/  */

resource "aws_s3_bucket" "whoami_build" {
  bucket = "felix-hzv.dev"
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

