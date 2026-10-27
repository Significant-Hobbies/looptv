import stations from '../../channels.config';
import home from '@/content/home.json';
import { createAgentSurfaceManifest } from './agent-surfaces/manifest.mjs';
import { createAgentSurfaceHandler } from './agent-surfaces/handler.mjs';
import { listMarkdownRoutes } from './agent-surfaces/documents.mjs';
import { absoluteMarkdownLinks } from './agent-surfaces/format.mjs';
import {
  PUBLIC_ORIGIN,
  PUBLIC_SURFACES,
  LOCAL_USER_PATHS,
  canonicalPublicUrl,
} from './public-surfaces';
import { publicComponentMarkdown } from './public-component-markdown';
import {
  homeMarkdown,
  changelogMarkdown,
  tagsMarkdown,
  randomMarkdown,
  stationMarkdown,
} from './public-data-markdown';

const renderers: Record<string, () => string> = {
  '/': homeMarkdown,
  '/changelog': changelogMarkdown,
  '/tags': tagsMarkdown,
  '/random': randomMarkdown,
};
const publicPages = PUBLIC_SURFACES.map((surface) => {
  const body = renderers[surface.path]?.() ?? publicComponentMarkdown(surface.path);
  if (!body) throw new Error(`Public page lacks a source renderer: ${surface.path}`);
  return { ...surface, body };
});
for (const station of stations)
  publicPages.push({
    path: `/${station.id}`,
    title: station.name,
    summary: station.description,
    body: stationMarkdown(station),
  });

export const markdownIdentity = {
  openapi: `${PUBLIC_ORIGIN}/openapi.json`,
  name: 'LoopTV',
  url: PUBLIC_ORIGIN,
  summary: home.page.description,
  contact: 'https://github.com/Significant-Hobbies/looptv/issues',
  trainingAllowed: true,
  excludedPaths: [...LOCAL_USER_PATHS, '/api/', '/admin', '/auth', '/dashboard'],
};
const manifest = createAgentSurfaceManifest({
  ...markdownIdentity,
  sitemap: `${PUBLIC_ORIGIN}/sitemap.xml`,
  auth: {
    public: true,
    notes:
      'LoopTV has no accounts. Device-local history, playlists, and preferences are never exposed as public records.',
  },
  surfaces: publicPages.map((page) => ({
    id:
      page.path === '/'
        ? 'home'
        : stations.some((station) => page.path === `/${station.id}`)
          ? `station-${page.path.slice(1)}`
          : page.path.slice(1).replaceAll('/', '-'),
    url: canonicalPublicUrl(page.path),
    md: `${PUBLIC_ORIGIN}${page.path === '/' ? '/index.md' : `${page.path}.md`}`,
    kind: 'static',
    description: page.summary,
  })),
  pages: Object.fromEntries(
    publicPages.map((page) => {
      const url = canonicalPublicUrl(page.path);
      const title = page.title;
      const content = page.body.replace(/^# (.+)$/m, (_heading, text) =>
        text === title ? '' : `## ${text}`
      );
      const markdown = `# ${title}\n\n> ${page.summary}\n\nCanonical: ${url}\n\n${content}\n`;
      return [new URL(url).pathname, absoluteMarkdownLinks(markdown, url)];
    })
  ),
});
Object.assign(manifest.catalog, {
  robots: `${PUBLIC_ORIGIN}/robots.txt`,
  openapi: markdownIdentity.openapi,
  dataResources: [
    {
      id: 'catalog',
      url: `${PUBLIC_ORIGIN}/catalog.json`,
      kind: 'json',
      description: 'Checked-in public video catalog',
    },
    {
      id: 'stations',
      url: `${PUBLIC_ORIGIN}/stations.json`,
      kind: 'json',
      description: 'Public station configuration',
    },
    {
      id: 'tags',
      url: `${PUBLIC_ORIGIN}/tags.json`,
      kind: 'json',
      description: 'Generated public tag summary',
    },
  ],
});
export const markdownRoutes = listMarkdownRoutes(manifest).map((route) => ({
  ...route,
  assetPath: new URL(route.md).pathname,
}));
export const markdownHandler = createAgentSurfaceHandler({
  manifest,
  listMarkdownRoutes: () => markdownRoutes,
});
