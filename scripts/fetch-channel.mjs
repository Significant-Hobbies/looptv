// Fast per-channel fetch: flat playlist listing, then enrich a bounded popular sample.
// Usage: node scripts/fetch-channel.mjs @handle [--fresh]

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import {
  MAX_VIDEOS_PER_SOURCE,
  hasViewCountsInJsonl,
  resolveTopPercentile,
} from "./catalog-quality.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data", "sources");
const STATIONS_PATH = path.join(__dirname, "..", "stations.json");

const MIN_CACHE_ROWS = Number(process.env.MIN_CACHE_ROWS_TO_TRUST || 5);
const CACHE_MAX_AGE_DAYS = Number(process.env.CACHE_MAX_AGE_DAYS || 13);
const SMALL_CHANNEL_ENRICH_ALL = Number(process.env.SMALL_CHANNEL_ENRICH_ALL || 100);
const BATCH_ENRICH_SIZE = Number(process.env.BATCH_ENRICH_SIZE || 25);

export function findSourceByHandle(handle) {
  const normalized = handle.replace(/^@/, "");
  const stations = JSON.parse(fs.readFileSync(STATIONS_PATH, "utf8"));
  for (const station of stations) {
    for (const src of station.sources) {
      if (src.handle.replace(/^@/, "") === normalized) {
        return src;
      }
    }
  }
  return { name: normalized, handle, minDuration: 60, maxDuration: 3600 };
}

export function filterFlatByDuration(flatVideos, minDur, maxDur) {
  return flatVideos.filter((video) => {
    const duration = video.duration || 0;
    return duration >= minDur && duration <= maxDur;
  });
}

/** How many full-metadata rows to pull for large channels (popular sort). */
export function computeEnrichBudget(filteredCount, source) {
  if (filteredCount <= SMALL_CHANNEL_ENRICH_ALL) return filteredCount;
  const pct = resolveTopPercentile(source, filteredCount) / 100;
  const target = Math.min(
    MAX_VIDEOS_PER_SOURCE,
    Math.max(1, Math.ceil(filteredCount * pct)),
  );
  return Math.min(filteredCount, Math.max(250, target * 2));
}

function cacheIsFresh(filePath) {
  const mtimeMs = fs.statSync(filePath).mtimeMs;
  const ageDays = (Date.now() - mtimeMs) / 86_400_000;
  return ageDays <= CACHE_MAX_AGE_DAYS;
}

function matchFilter(minDur, maxDur) {
  return ["--match-filter", `view_count >= 10000 & duration >= ${minDur} & duration <= ${maxDur}`];
}

function runYtDlpLines(args) {
  const result = spawnSync("yt-dlp", args, {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !result.stdout?.trim()) {
    throw new Error(result.stderr?.slice(0, 400) || `yt-dlp exited ${result.status}`);
  }
  const rows = [];
  for (const line of result.stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed));
    } catch {
      // --ignore-errors can emit non-JSON noise for broken entries
    }
  }
  return rows;
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""));
}

export function fetchChannel(handle, { fresh = false } = {}) {
  const source = findSourceByHandle(handle);
  const safe = handle.replace(/^@/, "");
  const outputPath = path.join(DATA_DIR, `${safe}.jsonl`);
  const minDur = source.minDuration ?? 60;
  const maxDur = source.maxDuration ?? 3600;
  const channelUrl = `https://www.youtube.com/${handle.startsWith("@") ? handle : `@${handle}`}/videos`;

  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (
    !fresh &&
    fs.existsSync(outputPath) &&
    fs.statSync(outputPath).size > 0
  ) {
    const cachedLines = fs.readFileSync(outputPath, "utf8").trim().split("\n").filter(Boolean).length;
    if (
      cachedLines >= MIN_CACHE_ROWS &&
      hasViewCountsInJsonl(outputPath, fs) &&
      cacheIsFresh(outputPath)
    ) {
      console.log(`  @${safe.padEnd(30)} CACHED (${cachedLines} videos)`);
      return { handle: safe, mode: "cached", count: cachedLines };
    }
  }

  const flat = runYtDlpLines([
    "--flat-playlist",
    "--dump-json",
    "--no-warnings",
    channelUrl,
  ]);
  const durationFiltered = filterFlatByDuration(flat, minDur, maxDur);
  const budget = computeEnrichBudget(durationFiltered.length, source);

  let enriched;
  let mode;
  if (durationFiltered.length === 0) {
    enriched = [];
    mode = "empty";
  } else if (durationFiltered.length <= SMALL_CHANNEL_ENRICH_ALL) {
    mode = "batch-all";
    enriched = [];
    for (let i = 0; i < durationFiltered.length; i += BATCH_ENRICH_SIZE) {
      const batch = durationFiltered.slice(i, i + BATCH_ENRICH_SIZE);
      const urls = batch.map((video) => `https://www.youtube.com/watch?v=${video.id}`);
      const rows = runYtDlpLines([
        "--dump-json",
        "--no-warnings",
        "--ignore-errors",
        ...matchFilter(minDur, maxDur),
        ...urls,
      ]);
      enriched.push(...rows);
    }
  } else {
    mode = "popular-sample";
    enriched = runYtDlpLines([
      "--dump-json",
      "--no-warnings",
      "--ignore-errors",
      "--playlist-end",
      String(budget),
      ...matchFilter(minDur, maxDur),
      `${channelUrl}?view=0&sort=p`,
    ]);
  }

  if (enriched.length > 0 && enriched.every((row) => typeof row.view_count === "number")) {
    const deduped = [...new Map(enriched.map((row) => [row.id, row])).values()];
    writeJsonl(outputPath, deduped);
    console.log(
      `  @${safe.padEnd(30)} ${mode} flat=${flat.length} dur=${durationFiltered.length} enriched=${deduped.length}`,
    );
    return { handle: safe, mode, count: deduped.length };
  }

  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    const cachedLines = fs.readFileSync(outputPath, "utf8").trim().split("\n").filter(Boolean).length;
    console.log(`  @${safe.padEnd(30)} enrich failed, kept cache (${cachedLines} videos)`);
    return { handle: safe, mode: "cache-fallback", count: cachedLines };
  }

  console.log(`  @${safe.padEnd(30)} enrich failed, no cache`);
  return { handle: safe, mode: "failed", count: 0 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const fresh = args.includes("--fresh");
  const handleArg = args.find((arg) => arg.startsWith("@") && !arg.endsWith(".mjs"));
  if (!handleArg || handleArg.endsWith(".mjs")) {
    console.error("Usage: node scripts/fetch-channel.mjs @handle [--fresh]");
    process.exit(1);
  }
  try {
    fetchChannel(handleArg.startsWith("@") ? handleArg : `@${handleArg}`, { fresh });
  } catch (error) {
    console.error(`  @${handleArg.replace(/^@/, "")} ERROR: ${error.message}`);
    process.exit(1);
  }
}
