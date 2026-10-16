#!/usr/bin/env bash
# Fails if dev-only authoring code or a secret ended up in the production build.
# Prints file names only, never the matched values.
set -euo pipefail

dir="${1:-dist}"
fail=0

markers=(__authoring __AUTHORING_STUDIO_URL__ intent/create intent/edit authoring-toolbar authoring-draft-badge)
token_vars=(SANITY_PREVIEW_TOKEN GITHUB_TOKEN SANITY_API_TOKEN SANITY_AUTH_TOKEN SANITY_AGENT_MANAGEMENT)

# Locally, take token values from .env when they aren't already in the environment
if [ -f .env ]; then
  while IFS='=' read -r key value; do
    for name in "${token_vars[@]}"; do
      if [ "$key" = "$name" ] && [ -z "${!name:-}" ]; then
        value="${value%\"}"
        printf -v "$name" '%s' "${value#\"}"
      fi
    done
  done < .env
fi

for marker in "${markers[@]}"; do
  if files=$(grep -rlF -- "$marker" "$dir"); then
    echo "::error::authoring marker '$marker' found in: $files"
    fail=1
  fi
done

for name in "${token_vars[@]}"; do
  value="${!name:-}"
  if [ "${#value}" -ge 8 ] && files=$(grep -rlF -- "$value" "$dir"); then
    echo "::error::value of $name found in: $files"
    fail=1
  fi
done

# Token shapes: GitHub fine-grained and classic tokens, Sanity API tokens (sk + long key)
shapes='github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|(^|[^A-Za-z0-9+/])sk[A-Za-z0-9]{70,}'
if files=$(grep -rlE -- "$shapes" "$dir"); then
  echo "::error::token-shaped string found in: $files"
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo "Authoring leak check failed: dev-only code or a secret is in $dir/"
  exit 1
fi
echo "Authoring leak check passed: no authoring markers or tokens in $dir/"
