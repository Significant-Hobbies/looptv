// Restore enriched tags from historical catalog.json commits by YouTube video ID.
// Usage: node scripts/restore-catalog-tags.mjs [catalog_path] [--ref <git-ref> ...]

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REFS = ["c90a757", "25901a1"];

export function slugifyTag(tag) {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function buildTagIndex(catalog) {
  const index = new Map();
  for (const station of Object.values(catalog.stations || {})) {
    for (const video of station.videos || []) {
      if (video.tags?.length > 1) {
        index.set(video.id, video.tags);
      }
    }
  }
  return index;
}

export function mergeTagIndexes(indexes) {
  const merged = new Map();
  for (const index of indexes) {
    for (const [id, tags] of index) {
      if (!merged.has(id)) merged.set(id, tags);
    }
  }
  return merged;
}

export function applyRestoredTags(catalog, tagIndex, sourceNamesByStation) {
  let restored = 0;
  let alreadyTagged = 0;
  let stillUntagged = 0;

  for (const [stationId, station] of Object.entries(catalog.stations)) {
    const sourceNames = sourceNamesByStation.get(stationId) ?? new Set();

    for (const video of station.videos) {
      if (video.tags?.length > 1) {
        alreadyTagged += 1;
        continue;
      }

      const saved = tagIndex.get(video.id);
      if (!saved?.length) {
        stillUntagged += 1;
        continue;
      }

      const tags = new Set(saved);
      if (video.source) tags.add(video.source);
      tags.delete("");
      video.tags = [...tags].slice(0, 20);
      restored += 1;
    }

    station.categoryVideoIds = deriveCategoryVideoIds(station.videos, sourceNames);
  }

  return { restored, alreadyTagged, stillUntagged };
}

export function deriveCategoryVideoIds(videos, sourceNames) {
  const tagCounts = new Map();
  for (const video of videos) {
    for (const tag of video.tags || []) {
      if (sourceNames.has(tag)) continue;
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  const minCount = Math.max(10, Math.floor(videos.length / 200));
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .filter(([, count]) => count >= minCount)
    .slice(0, 15);

  const categoryVideoIds = {};
  for (const [tag] of topTags) {
    categoryVideoIds[slugifyTag(tag)] = videos
      .filter((video) => video.tags?.includes(tag))
      .map((video) => video.id);
  }

  return categoryVideoIds;
}

function loadGitCatalog(ref) {
  const raw = execSync(`git show ${ref}:public/catalog.json`, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(raw);
}

function loadSourceNamesByStation() {
  const stations = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "stations.json"), "utf8"),
  );
  const map = new Map();
  for (const station of stations) {
    map.set(station.id, new Set(station.sources.map((src) => src.name)));
  }
  return map;
}

function parseArgs(argv) {
  const refs = [];
  let catalogPath = "public/catalog.json";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--ref") {
      refs.push(argv[++i]);
    } else if (!arg.startsWith("-")) {
      catalogPath = arg;
    }
  }

  return {
    catalogPath,
    refs: refs.length > 0 ? refs : DEFAULT_REFS,
  };
}

function main() {
  const { catalogPath, refs } = parseArgs(process.argv.slice(2));
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const sourceNamesByStation = loadSourceNamesByStation();

  const indexes = refs.map((ref) => {
    console.log(`Loading tag snapshot ${ref}...`);
    const snapshot = loadGitCatalog(ref);
    const index = buildTagIndex(snapshot);
    console.log(`  ${index.size} enriched videos`);
    return index;
  });

  const tagIndex = mergeTagIndexes(indexes);
  console.log(`Merged tag index: ${tagIndex.size} videos`);

  const stats = applyRestoredTags(catalog, tagIndex, sourceNamesByStation);
  catalog.lastUpdated = new Date().toISOString();

  fs.writeFileSync(catalogPath, JSON.stringify(catalog));

  const sizeKB = Math.round(fs.statSync(catalogPath).size / 1024);
  console.log(
    `Restored ${stats.restored} videos (${stats.alreadyTagged} already tagged, ${stats.stillUntagged} still placeholder-only).`,
  );
  console.log(`Wrote ${catalogPath} (${sizeKB}KB)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
