#!/usr/bin/env bash
# Wait for seed-local.sh, finish tagging/build gaps, test, commit catalog.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOG="/tmp/looptv-overnight.log"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG"; }

count_ok() {
  node -e "
    const s = require('./stations.json');
    const fs = require('fs');
    const h = [...new Set(s.flatMap(x => x.sources.map(y => y.handle.replace(/^@/,''))))];
    const ok = h.filter(x => fs.existsSync('data/sources/'+x+'.jsonl') && fs.statSync('data/sources/'+x+'.jsonl').size > 0).length;
    console.log(ok + '/' + h.length);
  "
}

missing_handles() {
  node -e "
    const s = require('./stations.json');
    const fs = require('fs');
    const h = [...new Set(s.flatMap(x => x.sources.map(y => y.handle.replace(/^@/,''))))].sort();
    console.log(h.filter(x => !fs.existsSync('data/sources/'+x+'.jsonl') || fs.statSync('data/sources/'+x+'.jsonl').size === 0).join('\n'));
  "
}

load_fagw() {
  if [ -n "${FAGW_API_KEY:-}" ]; then return 0; fi
  if ! command -v infisical >/dev/null 2>&1; then return 1; fi
  local INFISICAL_ROOT="${INFISICAL_ROOT:-$ROOT/../knowledge-base/cloudflare/worker}"
  [ -f "$INFISICAL_ROOT/.infisical.json" ] || return 1
  FAGW_API_KEY="$(cd "$INFISICAL_ROOT" && infisical secrets get Free_ai --plain 2>/dev/null || true)"
  export FAGW_API_KEY
  [ -n "$FAGW_API_KEY" ]
}

run_tagging() {
  load_fagw || { log "ERROR: cannot load FAGW_API_KEY from Infisical"; return 1; }
  export FAGW_PROJECT_ID="${FAGW_PROJECT_ID:-looptv}"
  log "Running gateway smoke test..."
  node scripts/smoke-tag-gateway.mjs >>"$LOG" 2>&1 || return 1
  log "Tagging videos..."
  node scripts/tag-videos.mjs >>"$LOG" 2>&1
}

log "=== Overnight watcher started ==="

# Poll until seed-local exits (max ~8h)
WAIT_SEC=0
MAX_WAIT=28800
while pgrep -f "bash scripts/seed-local.sh" >/dev/null 2>&1; do
  log "Seed running: $(count_ok) channels"
  sleep 300
  WAIT_SEC=$((WAIT_SEC + 300))
  if [ "$WAIT_SEC" -ge "$MAX_WAIT" ]; then
    log "WARN: max wait reached; proceeding with finish steps"
    break
  fi
done

log "Seed process done or timed out"

# Retry any still-missing channels sequentially (gentle on YouTube)
MISSING="$(missing_handles)"
if [ -n "$MISSING" ]; then
  log "Retrying $(echo "$MISSING" | wc -l | tr -d ' ') missing channels sequentially..."
  export YT_DLP_SLEEP_INTERVAL="${YT_DLP_SLEEP_INTERVAL:-3}"
  while IFS= read -r safe; do
    [ -z "$safe" ] && continue
    log "  fetch @$safe"
    node scripts/fetch-channel.mjs "@$safe" >>"$LOG" 2>&1 || true
    sleep 15
  done <<< "$MISSING"
fi

STILL="$(missing_handles)"
if [ -n "$STILL" ]; then
  log "WARN: still missing after retry: $(echo "$STILL" | tr '\n' ' ')"
else
  log "All 149 channels have source JSONL"
fi

# Build catalog if not done
if ! grep -q "=== Seed complete ===" /tmp/looptv-seed.log 2>/dev/null; then
  log "Building catalog..."
  bash scripts/build-catalog.sh --process-only >>"$LOG" 2>&1 || { log "ERROR: catalog build failed"; exit 1; }
fi

# Tag if seed skipped it or catalog is newer than last tag pass
if grep -q "Skipping AI tag" /tmp/looptv-seed.log 2>/dev/null || ! grep -q "=== Tagging via free-AI gateway ===" /tmp/looptv-seed.log 2>/dev/null; then
  log "Running AI tagging (seed skipped or pre-infisical run)..."
  run_tagging || log "WARN: tagging failed — catalog still committable"
else
  log "Tagging already ran in seed"
fi

log "Running tests..."
pnpm test >>"$LOG" 2>&1 || { log "ERROR: tests failed"; exit 1; }

if git diff --quiet public/catalog.json 2>/dev/null && git diff --cached --quiet public/catalog.json 2>/dev/null; then
  log "No catalog.json changes to commit"
  exit 0
fi

NEW_COUNT=$(node -e "const d=JSON.parse(require('fs').readFileSync('public/catalog.json','utf8')); console.log(Object.values(d.stations).reduce((s,st)=>s+st.videos.length,0))")
log "Committing catalog: ${NEW_COUNT} videos"
git add public/catalog.json
[ -f public/catalog-summary.json ] && git add public/catalog-summary.json
git commit -m "Update catalog: ${NEW_COUNT} videos

Local seed via residential IP (YouTube blocks CI fetch).
Automated overnight build + AI gateway tagging."

git push origin main >>"$LOG" 2>&1
log "=== Done: pushed catalog with ${NEW_COUNT} videos ==="