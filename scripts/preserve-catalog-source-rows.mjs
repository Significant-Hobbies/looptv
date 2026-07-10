import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogFallbackRows, mergeCatalogFallbackRows } from './fetch-channel.mjs';

export function parseJsonl(contents) {
  return contents
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

export function preserveCatalogSourceRows(dataDir, stations, catalog, filesystem = fs) {
  let preservedSources = 0;
  for (const station of stations) {
    for (const source of station.sources) {
      const safe = source.handle.replace(/^@/, '');
      const filePath = path.join(dataDir, `${safe}.jsonl`);
      const liveRows = filesystem.existsSync(filePath)
        ? parseJsonl(filesystem.readFileSync(filePath, 'utf8'))
        : [];
      const fallbackRows = catalogFallbackRows(catalog, { ...source, stationId: station.id });
      if (fallbackRows.length === 0) continue;
      const merged = mergeCatalogFallbackRows(liveRows, fallbackRows);
      filesystem.writeFileSync(filePath, `${merged.map(JSON.stringify).join('\n')}\n`);
      preservedSources += 1;
    }
  }
  return preservedSources;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dataDir = process.argv[2] || 'data/sources';
  const stations = JSON.parse(fs.readFileSync('stations.json', 'utf8'));
  const catalog = JSON.parse(fs.readFileSync('public/catalog.json', 'utf8'));
  const count = preserveCatalogSourceRows(dataDir, stations, catalog);
  console.log(`Preserved checked-in rows for ${count} represented sources.`);
}
