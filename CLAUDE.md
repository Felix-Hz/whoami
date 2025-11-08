# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website built with Preact, Vite, and Tailwind CSS v4. Deployed to AWS via CloudFront + S3 using Terraform infrastructure-as-code.

## Tech Stack

- **Frontend**: Preact (React alternative), Vite build tool, Tailwind CSS v4
- **Infrastructure**: Terraform, AWS (S3, CloudFront, Route53)
- **Linting/Formatting**: Biome (replaces ESLint + Prettier)
- **Package Manager**: pnpm

## Development Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Type checking (without emit)
pnpm typecheck

# Linting/formatting check
pnpm lint

# Auto-fix linting/formatting issues
pnpm lint:fix

# Preview production build locally
pnpm preview
```

## Architecture

### Frontend Structure

- **src/main.tsx**: Application entry point, renders App component
- **src/app.tsx**: Single-page layout with all components defined in one file (Header, Content, Footer, Logo, Socials, MyFace, GetInTouch)
- **src/assets/**: Static assets including ASCII art face and custom fonts
- **Path alias**: `@` maps to `./src` (configured in vite.config.ts)

### Component Organization

All components are currently in `src/app.tsx` as a single-file application. Components use:

- Preact functional components with TypeScript
- Tailwind CSS for styling (v4 with Vite plugin)
- react-icons for iconography

### Infrastructure (infra/)

Terraform manages AWS infrastructure:

- **S3 bucket**: Static site hosting (felix-hzv.dev)
- **CloudFront**: CDN with custom domain, HTTPS, and caching (24hr default TTL)
- **Route53**: DNS management for apex and www domains
- **Backend**: S3 backend for Terraform state (config in backend.conf)

#### Terraform Workflow

```bash
# Plan infrastructure changes
AWS_PROFILE=<profile> terraform plan -out=tfplan

# Cost estimation (requires infracost CLI)
infracost breakdown --path tfplan

# Apply changes
AWS_PROFILE=<profile> terraform apply tfplan
```

**Important**: `TF_VAR_acm_certificate_arn` must be set (ACM certificate managed outside Terraform).

## CI/CD

### Build & Deploy Workflow (main branch)

1. **Build**: Installs deps with pnpm, runs `pnpm build`, uploads dist artifact
2. **Infrastructure**: Runs Terraform to ensure infrastructure is up-to-date
3. **Deploy**: Syncs dist/ to S3 bucket, CloudFront serves updated content

### Linting Workflow (PRs)

Runs on pull requests:

- TypeScript type checking (`pnpm tsc --noEmit`)
- Biome linting/formatting checks (`biome ci .`)

## Configuration Files

- **biome.json**: Linter and formatter config
  - Line width: 120
  - Quote style: double quotes
  - Auto-organize imports enabled
  - Complexity threshold: 15
- **tsconfig.json**: TypeScript project references
- **tsconfig.app.json**: App-specific TS config (src/)
- **tsconfig.node.json**: Node-specific TS config (vite.config.ts)
- **vite.config.ts**: Vite configuration with Preact and Tailwind plugins

## Important Notes

- Use **pnpm** not npm/yarn (lock file is pnpm-lock.yaml)
- Use **Biome** for linting, not ESLint
- All infrastructure changes should go through Terraform (infra/ directory)
- The site is a single-page application with no routing
- Node.js version 22 is used in CI (reference for local development)
