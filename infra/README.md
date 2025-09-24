# How to

```hcl
// write intended stack to binary
AWS_PROFILE=<profile> terraform plan -out=proposed-infra

// human readable of the infra-to-build
AWS_PROFILE=<profile> terraform show proposed-infra

// ship it ->
AWS_PROFILE=<profile> terraform apply "proposed-infra"
```