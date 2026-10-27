import type { Catalog } from './types';

export interface TagSummary {
  tag: string;
  total: number;
  perStation: Record<string, number>;
}

export function tagSummaries(catalog: Catalog, stationIds?: ReadonlySet<string>): TagSummary[] {
  const counts = new Map<string, TagSummary>();
  for (const [stationId, station] of Object.entries(catalog.stations)) {
    if (stationIds && !stationIds.has(stationId)) continue;
    for (const video of station.videos) {
      for (const tag of video.tags) {
        const key = tag.toLowerCase();
        const entry = counts.get(key) ?? { tag, total: 0, perStation: {} };
        entry.total += 1;
        entry.perStation[stationId] = (entry.perStation[stationId] ?? 0) + 1;
        counts.set(key, entry);
      }
    }
  }
  return [...counts.values()].sort((left, right) => right.total - left.total);
}
