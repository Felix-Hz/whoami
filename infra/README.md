# How to

```hcl
// write intended stack to binary
AWS_PROFILE=<profile> terraform plan -out=proposed-infra

// get some infra costs breakdown
infracost breakdown --path proposed-infra

// ship it ->
AWS_PROFILE=<profile> terraform apply "proposed-infra"
```