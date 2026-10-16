# studio

Sanity Studio for felix-hzv.dev (project `4qw0kd9q`, dataset `production`).

- `pnpm dev` from the repo root runs it on http://localhost:3333 next to the site.
- `pnpm typegen` from the repo root regenerates `src/generated/sanity.types.ts` after schema or query changes.
- Pushing changes under `studio/` to `main` deploys the hosted studio (see `.github/workflows/studio-deploy.yml`).
