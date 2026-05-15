import { promises as fs } from "node:fs";
import path from "node:path";

import stations from "../../../channels.config";

export const dynamic = "force-static";

interface CatalogVideo {
  id: string;
  title: string;
  duration: number;
  date: string;
  tags: string[];
  source?: string;
  viewCount?: number;
}

interface StationBlock {
  videos: CatalogVideo[];
  categoryVideoIds: Record<string, string[]>;
}

interface CatalogShape {
  lastUpdated: string;
  stations: Record<string, StationBlock>;
}

/**
 * /tags.json — programmatic dump of every NER-extracted tag in the
 * catalog with per-station counts. Powers third-party browsers and the
 * /tags UI page.
 */
export async function GET() {
  const catalogPath = path.join(process.cwd(), "public", "catalog.json");
  let catalog: CatalogShape;
  try {
    const raw = await fs.readFile(catalogPath, "utf8");
    catalog = JSON.parse(raw) as CatalogShape;
  } catch {
    return new Response(JSON.stringify({ tags: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stationIds = new Set(stations.map((s) => s.id));
  const counts = new Map<string, { tag: string; total: number; perStation: Record<string, number> }>();
  for (const [stationId, block] of Object.entries(catalog.stations)) {
    if (!stationIds.has(stationId)) continue;
    for (const v of block.videos) {
      for (const t of v.tags) {
        const key = t.toLowerCase();
        const entry = counts.get(key) ?? { tag: t, total: 0, perStation: {} };
        entry.total += 1;
        entry.perStation[stationId] = (entry.perStation[stationId] ?? 0) + 1;
        counts.set(key, entry);
      }
    }
  }
  const tags = [...counts.values()].sort((a, b) => b.total - a.total);

  return new Response(
    JSON.stringify(
      { generatedAt: new Date().toISOString(), catalogLastUpdated: catalog.lastUpdated, tags },
      null,
      2,
    ),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
