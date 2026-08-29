import fs from 'node:fs';

import { describe, expect, it } from 'vitest';

import stations from '../../channels.config';
import { canonicalPublicUrl, PUBLIC_SURFACES } from './public-surfaces';

describe('public agent surfaces', () => {
  it('keeps every public HTML route unique', () => {
    const paths = [
      ...PUBLIC_SURFACES.map((surface) => surface.path),
      ...stations.map((station) => `/${station.id}`),
    ];
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toHaveLength(30);
    expect(paths.map(canonicalPublicUrl)).toEqual([
      'https://tv.significanthobbies.com/',
      ...paths.slice(1).map((path) => `https://tv.significanthobbies.com${path}/`),
    ]);
  });

  it('keeps the compact catalog aligned with static routes and the station family', () => {
    const catalog = JSON.parse(fs.readFileSync('public/api-ai.json', 'utf8')) as {
      surfaces: Array<{ url: string; md: string | null }>;
    };
    const origin = 'https://tv.significanthobbies.com';
    for (const surface of PUBLIC_SURFACES) {
      const url = surface.path === '/' ? `${origin}/` : `${origin}${surface.path}`;
      const expectedMarkdown =
        surface.path === '/' ? `${origin}/index.md` : `${origin}${surface.path}.md`;
      expect(catalog.surfaces).toContainEqual(
        expect.objectContaining({ url, md: expectedMarkdown })
      );
    }
    for (const station of stations) {
      expect(catalog.surfaces).toContainEqual(
        expect.objectContaining({
          url: `${origin}/${station.id}`,
          md: `${origin}/${station.id}.md`,
        })
      );
    }
  });
});
