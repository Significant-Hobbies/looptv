import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { APIRoute } from 'astro';
import stations from '../../channels.config';
import { tagSummaries } from '@/lib/tag-summary';
import type { Catalog } from '@/lib/types';

export const prerender = true;

export const GET: APIRoute = async () => {
  let catalog: Catalog;
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'public', 'catalog.json'), 'utf8');
    catalog = JSON.parse(raw) as Catalog;
  } catch {
    return new Response(JSON.stringify({ tags: [] }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const stationIds = new Set(stations.map((station) => station.id));
  const tags = tagSummaries(catalog, stationIds);
  return new Response(
    JSON.stringify(
      { generatedAt: new Date().toISOString(), catalogLastUpdated: catalog.lastUpdated, tags },
      null,
      2
    ),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
};
