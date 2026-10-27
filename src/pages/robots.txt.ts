import type { APIRoute } from 'astro';
import { LOCAL_USER_PATHS, PUBLIC_ORIGIN } from '@/lib/public-surfaces';
const crawlers = [
  '*',
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Googlebot',
  'Bingbot',
];
export const GET: APIRoute = () =>
  new Response(
    [
      '# Keep in sync with llms.txt and ai.txt.',
      ...crawlers.map((crawler) =>
        [
          `User-agent: ${crawler}`,
          'Allow: /',
          ...[...LOCAL_USER_PATHS, '/api/', '/admin/', '/auth/', '/dashboard/'].map(
            (path) => `Disallow: ${path}`
          ),
          'Allow: /api/md',
          'Allow: /api/ai',
          '',
        ].join('\n')
      ),
      `Sitemap: ${PUBLIC_ORIGIN}/sitemap.xml`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
