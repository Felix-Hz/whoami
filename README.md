<p align="center"><img src="public/favicon.svg" width="72" height="72" alt=""></p>

<h1 align="center">whoami</h1>

<p align="center">building for humans. simple > complex.</p>

---

The source of [felix-hzv.dev](https://felix-hzv.dev): who I am, what I write, the photographs I take and the things I build. It's a static site, prerendered at build time, with writing and photographs edited in Sanity Studio rather than in this repository.

## Contents

- [What's here](#whats-here)
- [Run it locally](#run-it-locally)
- [Content](#content)
- [Deployment](#deployment)
- [Infrastructure](#infrastructure)
- [Design](#design)

## What's here

| Path | What it is |
|---|---|
| `src/` | the site: Preact, Vite and Tailwind, prerendered to static HTML |
| `studio/` | the Sanity Studio for posts and photographs |
| `scripts/` | content fetch, prerender, feeds, social images, favicon, font subsetting and the photo pipeline |
| `infra/` | Terraform for the bucket, CDN, DNS and the CI role |
| `fonts/` | source fonts; the subsets the site ships are generated from these |

## Run it locally

Needs Node and pnpm (the version is pinned in `package.json`).

```sh
pnpm install
pnpm dev          # the site and the studio side by side
pnpm dev:site     # the site alone
```

`pnpm dev` fetches drafts from Sanity, so draft posts appear locally. Without access to Sanity it falls back to the last content fetched.

```sh
pnpm lint
pnpm typecheck
pnpm build        # fetch content, type-check, build and prerender into dist/
```

## Content

Posts and photographs live in Sanity, not in this repo. Publishing in the studio rebuilds and redeploys the site on its own.

Photographs are prepared locally by `scripts/photos.py`: it strips metadata, resizes them and uploads them to a private bucket served through the site's own CDN, then creates the matching document in Sanity. No full-resolution original is ever public.

## Deployment

| When | What happens |
|---|---|
| A pull request is opened or updated | lint, type-check and build, behind a single `ci-ok` check |
| A change reaches `main` | the site is built, infrastructure applied, files synced and the CDN cache cleared |
| A change to `studio/` reaches `main` | the studio is redeployed |
| Content is published in Sanity | the site is rebuilt and redeployed |

Dependency updates from Dependabot merge themselves once `ci-ok` passes.

## Infrastructure

The site is served from S3 through CloudFront, with DNS on Cloudflare. Everything, including the role CI uses to deploy, is described in Terraform under `infra/`; see its README for planning and applying changes by hand.

## Design

The site sets the design system I use across my projects: one cobalt ink on paper, Newsreader for reading, JetBrains Mono for the margins and Departure Mono for the wordmark. Its tokens live at the top of `src/index.css`. The favicon is the wordmark's `$` and cursor drawn on a 16-pixel grid; `pnpm exec tsx scripts/favicon.ts` regenerates it.
