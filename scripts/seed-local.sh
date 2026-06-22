#!/usr/bin/env bash
# One-shot local catalog seed: fetch sources → build catalog → optional AI tag.
# Usage: ./scripts/seed-local.sh [--fresh]
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FRESH="${1:-}"
FETCH_CONCURRENCY="${FETCH_CONCURRENCY:-3}"

echo "=== LoopTV local seed $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo "Concurrency: $FETCH_CONCURRENCY"
echo ""

if [ "$FRESH" = "--fresh" ]; then
  bash scripts/fetch-sources.sh --fresh
else
  bash scripts/fetch-sources.sh
fi

echo ""
echo "=== Building catalog ==="
bash scripts/build-catalog.sh --process-only

if [ -z "${FAGW_API_KEY:-}" ] && command -v infisical >/dev/null 2>&1; then
  INFISICAL_ROOT="${INFISICAL_ROOT:-$ROOT/../knowledge-base/cloudflare/worker}"
  if [ -f "$INFISICAL_ROOT/.infisical.json" ]; then
    FAGW_API_KEY="$(cd "$INFISICAL_ROOT" && infisical secrets get Free_ai --plain 2>/dev/null || true)"
    export FAGW_API_KEY
  fi
fi

if [ -n "${FAGW_API_KEY:-}" ]; then
  echo ""
  echo "=== Tagging via free-AI gateway ==="
  export FAGW_PROJECT_ID="${FAGW_PROJECT_ID:-looptv}"
  node scripts/smoke-tag-gateway.mjs
  node scripts/tag-videos.mjs
else
  echo ""
  echo "Skipping AI tag (FAGW_API_KEY not set; Infisical Free_ai unavailable)."
  echo "After fetch: infisical secrets get Free_ai --plain | xargs -I{} env FAGW_API_KEY={} node scripts/tag-videos.mjs"
fi

node -e "
const c=require('./public/catalog.json');
let t=0,m=0,v=0;
for(const s of Object.values(c.stations)) for(const x of s.videos){
  t++; if((x.tags||[]).length>1)m++; if((x.viewCount||0)>0)v++;
}
console.log('\n=== Seed complete ===');
console.log(JSON.stringify({lastUpdated:c.lastUpdated,total:t,tagged:m,withViewCount:v},null,2));
"
