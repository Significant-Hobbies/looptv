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
  pages: Object.fromEntries(
    publicPages.map((page) => {
      const url = canonicalPublicUrl(page.path);
      const title = page.body.match(/^# (.+)$/m)?.[1] ?? page.title;
      const content = page.body.replace(/^# .+\n*/, '');
      const markdown = `# ${title}\n\n> ${page.summary}\n\nCanonical: ${url}\n\n${content}\n`;
      return [new URL(url).pathname, absoluteMarkdownLinks(markdown, url)];
    })
  ),
});
export const markdownRoutes = listMarkdownRoutes(manifest).map((route) => ({
  ...route,
  assetPath: new URL(route.md).pathname,
}));
export const markdownHandler = createAgentSurfaceHandler({
  manifest,
  listMarkdownRoutes: () => markdownRoutes,
});
