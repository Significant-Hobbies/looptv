#!/usr/bin/env bash
set -euo pipefail

# Fetch yt-dlp JSONL metadata for LoopTV sources into data/sources/
#
# Usage:
#   ./scripts/fetch-sources.sh              # all handles (respect cache)
#   ./scripts/fetch-sources.sh --fresh      # ignore cache age
#
# Sharding (for parallel CI jobs):
#   SHARD_INDEX=0 SHARD_TOTAL=4 ./scripts/fetch-sources.sh

DATA_DIR="data/sources"
FRESH="${1:-}"
MIN_CACHE_ROWS_TO_TRUST="${MIN_CACHE_ROWS_TO_TRUST:-5}"
CACHE_MAX_AGE_DAYS="${CACHE_MAX_AGE_DAYS:-13}"
FETCH_CONCURRENCY="${FETCH_CONCURRENCY:-6}"
SHARD_INDEX="${SHARD_INDEX:-}"
SHARD_TOTAL="${SHARD_TOTAL:-}"

mkdir -p "$DATA_DIR"

jsonl_has_view_counts() {
  node --input-type=module -e "import fs from 'fs'; import { hasViewCountsInJsonl } from './scripts/catalog-quality.mjs'; process.exit(hasViewCountsInJsonl(process.argv[1], fs) ? 0 : 1);" "$1"
}

cache_is_fresh() {
  local file="$1"
  local mtime now age max_age
  if stat -c %Y "$file" >/dev/null 2>&1; then
    mtime=$(stat -c %Y "$file")
  else
    mtime=$(stat -f %m "$file")
  fi
  now=$(date +%s)
  age=$(( (now - mtime) / 86400 ))
  max_age="$CACHE_MAX_AGE_DAYS"
  [ "$age" -le "$max_age" ]
}

fetch_handle() {
  local handle="$1"
  local safe cached count cached_count

  safe=$(echo "$handle" | tr -d '@')
  cached="$DATA_DIR/${safe}.jsonl"

  if [ "$FRESH" != "--fresh" ] && [ -f "$cached" ] && [ -s "$cached" ]; then
    count=$(wc -l < "$cached" | tr -d ' ')
    if [ "$count" -ge "$MIN_CACHE_ROWS_TO_TRUST" ] && jsonl_has_view_counts "$cached" && cache_is_fresh "$cached"; then
      printf "  @%-30s CACHED (%s videos)\n" "$safe" "$count"
      return 0
    fi
  fi

  if [ -f "$cached" ] && [ -s "$cached" ]; then
    cached_count=$(wc -l < "$cached" | tr -d ' ')
    printf "  @%-30s refetching (was %s videos)..." "$safe" "$cached_count"
  else
    printf "  @%-30s fetching..." "$safe"
  fi

  if ! yt-dlp --dump-json --no-warnings --match-filter "view_count >= 10000" \
    "https://www.youtube.com/${handle}/videos" > "${cached}.tmp" 2>/dev/null; then
    : > "${cached}.tmp"
  fi

  count=$(wc -l < "${cached}.tmp" | tr -d ' ')

  if [ "$count" -gt 0 ] && jsonl_has_view_counts "${cached}.tmp"; then
    mv "${cached}.tmp" "$cached"
    printf " %s videos\n" "$count"
    return 0
  fi

  rm -f "${cached}.tmp"
  if [ -f "$cached" ] && [ -s "$cached" ]; then
    printf " fetch failed, kept cache (%s videos)\n" "$cached_count"
    return 0
  fi

  printf " fetch failed, no cache\n"
}

export -f fetch_handle jsonl_has_view_counts cache_is_fresh
export DATA_DIR FRESH MIN_CACHE_ROWS_TO_TRUST CACHE_MAX_AGE_DAYS

if [ -n "$SHARD_INDEX" ] && [ -n "$SHARD_TOTAL" ]; then
  HANDLES=$(node scripts/shard-handles.mjs "$SHARD_INDEX" "$SHARD_TOTAL")
  SHARD_LABEL="shard ${SHARD_INDEX}/${SHARD_TOTAL}"
else
  HANDLES=$(node -e "
    const stations = require('./stations.json');
    const handles = new Set();
    for (const s of stations) for (const src of s.sources) handles.add(src.handle);
    console.log([...handles].sort().join('\n'));
  ")
  SHARD_LABEL="all handles"
fi

HANDLE_COUNT=$(echo "$HANDLES" | sed '/^$/d' | wc -l | tr -d ' ')

echo "Fetch scope: $SHARD_LABEL ($HANDLE_COUNT channels)"
echo "Concurrency: $FETCH_CONCURRENCY | cache max age: ${CACHE_MAX_AGE_DAYS}d"
echo ""

echo "$HANDLES" | sed '/^$/d' | xargs -P "$FETCH_CONCURRENCY" -I {} bash -c 'fetch_handle "$@"' _ {}

echo "Fetch done."
