import { describe, expect, it } from 'vitest';

import stations from '../../channels.config';
import { markdownHandler, markdownRoutes } from './markdown-documents';
import { canonicalPublicUrl, PUBLIC_SURFACES, LOCAL_USER_PATHS } from './public-surfaces';

describe('public agent surfaces', () => {
  it('keeps every public HTML route unique', () => {
    const paths = [
      ...PUBLIC_SURFACES.map((surface) => surface.path),
      ...stations.map((station) => `/${station.id}`),
    ];
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toHaveLength(PUBLIC_SURFACES.length + stations.length);
    expect(paths.map(canonicalPublicUrl)).toEqual([
      'https://tv.significanthobbies.com/',
      ...paths.slice(1).map((path) => `https://tv.significanthobbies.com${path}/`),
    ]);
  });

  it('keeps the compact catalog aligned with static routes and the station family', async () => {
    const response = await markdownHandler(new Request('https://tv.significanthobbies.com/api/ai'));
    const catalog = (await response!.json()) as {
      robots: string;
      openapi: string;
      dataResources: Array<{ id: string; url: string }>;
      surfaces: Array<{ id: string; description: string; url: string; md: string | null }>;
    };
    const origin = 'https://tv.significanthobbies.com';
    expect(catalog.robots).toBe(`${origin}/robots.txt`);
    expect(catalog.openapi).toBe(`${origin}/openapi.json`);
    expect(catalog.dataResources.map((resource) => resource.id)).toEqual([
      'catalog',
      'stations',
      'tags',
    ]);
    for (const surface of PUBLIC_SURFACES) {
      const url = surface.path === '/' ? `${origin}/` : `${origin}${surface.path}/`;
      const expectedMarkdown =
        surface.path === '/' ? `${origin}/index.md` : `${origin}${surface.path}.md`;
      expect(catalog.surfaces).toContainEqual(
        expect.objectContaining({
          id: surface.path === '/' ? 'home' : surface.path.slice(1),
          description: surface.summary,
          url,
          md: expectedMarkdown,
        })
      );
    }
    for (const station of stations) {
      expect(catalog.surfaces).toContainEqual(
        expect.objectContaining({
          id: `station-${station.id}`,
          description: station.description,
          url: `${origin}/${station.id}/`,
          md: `${origin}/${station.id}.md`,
        })
      );
    }
  });
  it('excludes every local user view from published representations', () => {
    for (const path of LOCAL_USER_PATHS)
      expect(markdownRoutes.some((route) => route.path.replace(/\/$/, '') === path)).toBe(false);
  });
});
