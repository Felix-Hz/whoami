# How to

```hcl
// write intended stack to binary
AWS_PROFILE=<profile> terraform plan -out=tfplan

// get some infra costs breakdown
infracost breakdown --path tfplan

// ship it ->
AWS_PROFILE=<profile> terraform apply tfplan
```