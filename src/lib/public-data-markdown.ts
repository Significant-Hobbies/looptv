import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import stations from '../../channels.config';
import { changelogIntro, releases, repository } from '@/content/changelog';
import { randomStationMessage, tagIntro } from '@/content/public-copy';
import { homeContent } from './home-content';
import { tagSummaries } from './tag-summary';
import type { Catalog, StationConfig } from './types';
import { PUBLIC_ORIGIN } from './public-surfaces';

const link = (value: { label: string; href: string }) =>
  `[${value.label}](${new URL(value.href, PUBLIC_ORIGIN).href})`;
const cell = (value: string | number) => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const publicCatalog = JSON.parse(readFileSync(resolve('public/catalog.json'), 'utf8')) as Catalog;
const catalog = () => publicCatalog;
const label = (value: string) => cell(value.replace(/[\\[\]]/g, '\\$&'));

export function homeMarkdown(): string {
  const { hero, sections, closing } = homeContent();
  const lines = [
    hero.eyebrow,
    `## ${hero.title}`,
    hero.lede,
    link(hero.primary),
    link(hero.secondary),
    hero.note,
    `![${hero.screen.alt}](${new URL(hero.screen.src, PUBLIC_ORIGIN).href})`,
  ];
  for (const section of sections) {
    lines.push(`## ${section.title}`);
    if (section.eyebrow) lines.push(section.eyebrow);
    if (section.kind === 'statement')
      for (const row of section.rows ?? []) lines.push(`### ${row.title}`, row.body);
    else if (section.kind === 'faq')
      for (const item of section.items ?? []) lines.push(`### ${item.q}`, item.a);
    else throw new Error(`Unmapped public gallery section: ${section.kind}`);
  }
  lines.push(`## ${closing.title}`, link(closing.primary), closing.note);
  return lines.join('\n\n');
}

export function changelogMarkdown(): string {
  return [
    '# Changelog',
    'Product history',
    changelogIntro,
    `[Roadmap](${repository}/issues)`,
    `[GitHub repository](${repository})`,
    ...releases.map(
      (release) =>
        `## ${release.title}\n\n${release.date}\n\n${release.outcomes.map((outcome) => `- ${outcome}`).join('\n')}`
    ),
  ].join('\n\n');
}

export function tagsMarkdown(): string {
  const tags = tagSummaries(catalog());
  return [
    '# Tags',
    tagIntro,
    'The initial public view shows the 80 most frequent tags. Filtering and selecting a tag uses the same public catalog.',
    '| Tag | Videos | Stations |',
    '| --- | --- | --- |',
    ...tags.slice(0, 80).map(
      (tag) =>
        `| ${cell(tag.tag)} | ${tag.total} | ${Object.entries(tag.perStation)
          .map(([id, count]) => `[${id}](${PUBLIC_ORIGIN}/${id}/): ${count}`)
          .join(', ')} |`
    ),
    '',
    `[Complete public catalog](${PUBLIC_ORIGIN}/catalog.json)`,
  ].join('\n');
}

export function randomMarkdown(): string {
  return `# Random station\n\n${randomStationMessage}\n\n${stations.map((station) => `- [${station.name}](${PUBLIC_ORIGIN}/${station.id}/): ${station.description}`).join('\n')}`;
}

export function stationMarkdown(station: StationConfig): string {
  const source = catalog();
  const videos = source.stations[station.id]?.videos ?? [];
  return [
    `# ${station.name}`,
    station.description,
    '## Curated sources',
    ...station.sources.map(
      (item) => `- [${item.name}](https://www.youtube.com/${item.handle}): ${item.handle}`
    ),
    '## Public video catalog',
    `Catalog last updated: ${source.lastUpdated}. ${videos.length} videos. Playback choices and watched state remain browser-local.`,
    [
      '| Video | Channel | Duration (seconds) | Date | Views | Tags |',
      '| --- | --- | --- | --- | --- | --- |',
      ...videos.map(
        (video) =>
          `| [${label(video.title)}](https://www.youtube.com/watch?v=${video.id}) | ${cell(video.source ?? '—')} | ${video.duration} | ${video.date || '—'} | ${video.viewCount ?? '—'} | ${cell(video.tags.join(', '))} |`
      ),
    ].join('\n'),
    '',
    `[Public catalog JSON](${PUBLIC_ORIGIN}/catalog.json)`,
  ].join('\n\n');
}
