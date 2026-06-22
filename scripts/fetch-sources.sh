#!/usr/bin/env bash
set -euo pipefail

# Fetch yt-dlp JSONL metadata for LoopTV sources into data/sources/
#
# Fast path per channel:
#   1) flat-playlist listing (seconds)
#   2) full metadata for small channels, or a bounded popular sample for mega channels
#
# Usage:
#   ./scripts/fetch-sources.sh              # all handles (respect cache)
#   ./scripts/fetch-sources.sh --fresh      # ignore cache age
#
# Sharding (for parallel CI jobs):
#   SHARD_INDEX=0 SHARD_TOTAL=4 ./scripts/fetch-sources.sh

DATA_DIR="data/sources"
FRESH="${1:-}"
FETCH_CONCURRENCY="${FETCH_CONCURRENCY:-8}"
SHARD_INDEX="${SHARD_INDEX:-}"
SHARD_TOTAL="${SHARD_TOTAL:-}"

mkdir -p "$DATA_DIR"

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
FRESH_FLAG=""
if [ "$FRESH" = "--fresh" ]; then
  FRESH_FLAG="--fresh"
fi

echo "Fetch scope: $SHARD_LABEL ($HANDLE_COUNT channels)"
echo "Concurrency: $FETCH_CONCURRENCY"
echo ""

fetch_one() {
  node scripts/fetch-channel.mjs "$1" $FRESH_FLAG
}

export -f fetch_one
export FRESH_FLAG

echo "$HANDLES" | sed '/^$/d' | xargs -P "$FETCH_CONCURRENCY" -I {} bash -c 'fetch_one "$@"' _ {}

echo "Fetch done."
