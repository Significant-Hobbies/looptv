import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import stations from '../../channels.config';
import summary from '../../public/catalog-summary.json';
import { publicComponentMarkdown } from './public-component-markdown';
import { homeMarkdown, stationMarkdown } from './public-data-markdown';
import type { Catalog } from './types';

describe('public source parity', () => {
  it('keeps complete legal clauses and original dates', () => {
    const privacy = publicComponentMarkdown('/privacy');
    expect(privacy).toContain('Last updated: 2026-08-31.');
    expect(privacy).toContain('Clear them at any time');
    expect(privacy).toContain('Microsoft Clarity');
    expect(privacy).toContain('`youtube.com`');
    const terms = publicComponentMarkdown('/terms');
    expect(terms).toContain('Last updated: 2026-05-15.');
    expect(terms).toContain('personal and commercial purposes');
    expect(terms).toContain('YouTube error 101/150');
  });

  it('uses current shared counts and keeps all source channels', () => {
    expect(publicComponentMarkdown('/about')).toContain(summary.totalVideos.toLocaleString());
    expect(homeMarkdown()).toContain(`${stations.length} topic stations`);
    const channels = publicComponentMarkdown('/channels');
    for (const station of stations)
      for (const source of station.sources) {
        expect(channels).toContain(source.name);
        expect(channels).toContain(`https://www.youtube.com/${source.handle}`);
      }
  });

  it('includes every checked-in public station video', () => {
    const catalog = JSON.parse(readFileSync('public/catalog.json', 'utf8')) as Catalog;
    for (const station of stations) {
      const markdown = stationMarkdown(station);
      for (const video of catalog.stations[station.id]?.videos ?? []) {
        expect(markdown).toContain(`https://www.youtube.com/watch?v=${video.id}`);
      }
    }
  });
});
