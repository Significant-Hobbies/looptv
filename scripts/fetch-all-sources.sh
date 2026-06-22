#!/usr/bin/env bash
set -euo pipefail

# Fetch video metadata for ALL YouTube channels and save to data/sources/
# Skips channels that already have data (delete the file to re-fetch)
# Output: data/sources/<handle>.jsonl + data/sources/counts.txt

DATA_DIR="data/sources"
COUNTS_FILE="$DATA_DIR/counts.txt"
MIN_CACHE_ROWS_TO_TRUST="${MIN_CACHE_ROWS_TO_TRUST:-5}"
mkdir -p "$DATA_DIR"

jsonl_has_view_counts() {
  node --input-type=module -e "import fs from 'fs'; import { hasViewCountsInJsonl } from './scripts/catalog-quality.mjs'; process.exit(hasViewCountsInJsonl(process.argv[1], fs) ? 0 : 1);" "$1"
}

YTDLP_FETCH=(yt-dlp --dump-json --no-warnings)

# All YouTube handles from user subscriptions
HANDLES=(
  WelchLabs startuparchive_ pavelmavrin NitishRajput IAmMarkManson psychacks
  IBMTechnology backstagewithmillionaires GitHub appmasters TheDavidLinReport
  shanselman NVIDIA FitnessFAQs TomBilyeu TiffInTech GoogleDevelopers
  harvard wallstreetmillennial sciencechannel besmart DistroTube adamlyttleapps
  physicsgirl Sahil_Bloom BrilliantClassics freecodecamp Quant_Prof
  CMUDatabaseGroup eoglobal Computerphile GOTO- PringusMcDingus stanford
  HowItShouldHaveEnded TechWorldwithNana TheCodingTrain ImprovementPill
  veritasium BryanJohnson Lossfunk ycombinator crunchyroll ConorOKeefe
  bycloudAI aiDotEngineer HubermanLabClips stanfordonline StudioCtv
  business Psych2go TED Fireship MollyRocket ColdFusion BodyweightWarrior
  neuralink stanfordgsb TEDEd KRAZAM AswathDamodaranonValuation mitocw
  TwoMinutePapers 6.824 twoswap szymonozog7862 GPUMODE DEEPTITALESRA
  YaleCourses umarjamilai this.science YifanBTH Steve8708 NewYorkTimesEvents
  AsliEngineering deno_land introductiontocryptography4223 MichaelSambol
  janestreet ycrootaccess HonestlybyTanmayBhat Worthikids animatedai
  lostchannelx YannicKilcher beyondfireship pbsinfiniteseries BroScienceLife
  CRED_club statquest Charismaoncommand GarryTan TechTangents geohotarchive
  ThePrimeagen engineerguyvideo NITVShorts ByteByteGo codingtech
  FreedominThought DefogTech escaping.ordinary RachitJain TheMadrasTrader
  SystemDesignInterview hnasr JordanBPeterson RJFilmSchool WilliamFiset-videos
  BostonDynamics QuantaScienceChannel MinutePhysics sprouts CGPGrey
  Therackaracka MicrosoftResearch AndrejKarpathy 3blue1brown
  IMostlyBlameMyself BrickTechnology PrimerBlobs InsideBloomberg tesla
  wharton sentdex cultrepo SpanningTree NetworkChuck kurzgesagt
  SaturdayNightLive ComedyCentral TheOnion
)

TOTAL=${#HANDLES[@]}
DONE=0
SKIPPED=0

# Clear counts file for fresh run
> "$COUNTS_FILE"

for handle in "${HANDLES[@]}"; do
  DONE=$((DONE + 1))
  FILE="$DATA_DIR/${handle}.jsonl"

  if [ -f "$FILE" ] && [ -s "$FILE" ]; then
    COUNT=$(wc -l < "$FILE" | tr -d ' ')
    if [ "$COUNT" -ge "$MIN_CACHE_ROWS_TO_TRUST" ] && jsonl_has_view_counts "$FILE"; then
      echo "$handle|$COUNT" >> "$COUNTS_FILE"
      SKIPPED=$((SKIPPED + 1))
      printf "[%d/%d] @%-30s CACHED (%s videos)\n" "$DONE" "$TOTAL" "$handle" "$COUNT"
      continue
    fi
    printf "[%d/%d] @%-30s cached only %s videos, refetching..." "$DONE" "$TOTAL" "$handle" "$COUNT"
  else
    printf "[%d/%d] @%-30s fetching..." "$DONE" "$TOTAL" "$handle"
  fi

  "${YTDLP_FETCH[@]}" "https://www.youtube.com/@$handle/videos" > "$FILE" 2>/dev/null || true

  COUNT=$(wc -l < "$FILE" | tr -d ' ')
  echo "$handle|$COUNT" >> "$COUNTS_FILE"
  printf " %s videos\n" "$COUNT"
done

echo ""
echo "=== Summary ==="
echo "Fetched: $((DONE - SKIPPED)) channels"
echo "Cached: $SKIPPED channels"
echo "Total: $DONE channels"
echo ""
echo "Counts saved to: $COUNTS_FILE"
echo "JSONL data saved to: $DATA_DIR/"

# Print sorted counts
echo ""
echo "=== Top channels by video count ==="
sort -t'|' -k2 -rn "$COUNTS_FILE" | head -20 | while IFS='|' read -r h c; do
  printf "  @%-30s %s videos\n" "$h" "$c"
done
