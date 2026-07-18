---
title: Deploy (job)
description: Cloudflare Pages production and preview deploys.
---

# Deploy to Cloudflare Pages

**File:** `.github/workflows/deploy.yml`
**Triggers:** `workflow_dispatch` (production) + `pull_request` (preview)

## Production (`deploy-production`)

- **When:** `workflow_dispatch` only (manual). Pushing to `main` does **not**
  auto-deploy — deploys are intentional.
- **Steps:** checkout → setup Node 22 → pnpm install (frozen lockfile,
  `--ignore-scripts`) → `pnpm cf:build` →
  `wrangler-action@v3` →
  `pages deploy out --project-name=looptv --branch=main --commit-dirty=true` →
  smoke `https://tv.significanthobbies.com` with `curl --fail --retry 3`.
- **Secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

## Preview (`deploy-preview`)

- **When:** `pull_request` (any PR).
- **Steps:** same build →
  `pages deploy out --project-name=looptv --branch=pr-<N> --commit-dirty=true` →
  comment `Preview: https://pr-<N>.looptv.pages.dev` on the PR.
- **Permissions:** `contents: read`, `pull-requests: write` (for the comment).

## Local deploy

```bash
pnpm deploy    # = pnpm cf:build && wrangler pages deploy out --project-name=looptv
```

See [deployment.md](../deployment.md) for the broader deploy context and
[setup.md](../../development/setup.md) for local prerequisites.
