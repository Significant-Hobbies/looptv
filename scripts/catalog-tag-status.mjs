import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function videoNeedsTagging(video) {
  return Boolean(video.description || !Array.isArray(video.tags) || video.tags.length <= 1);
}

export function videosNeedingTags(catalog) {
  const pending = [];
  for (const [stationId, station] of Object.entries(catalog.stations || {})) {
    for (const video of station.videos || []) {
      if (videoNeedsTagging(video)) pending.push({ stationId, video });
    }
  }
  return pending;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalogPath = process.argv[2] || 'public/catalog.json';
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  process.stdout.write(String(videosNeedingTags(catalog).length));
}
