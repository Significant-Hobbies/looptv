import type { APIRoute } from 'astro';
import stations from '../../channels.config';
import { PUBLIC_SURFACES } from '@/lib/public-surfaces';

export const prerender = true;

const siteUrl = 'https://tv.significanthobbies.com';
export const GET: APIRoute = () => {
  const paths = [
    ...PUBLIC_SURFACES.map((surface) => surface.path),
    ...stations.map((station) => `/${station.id}`),
  ];
  const urls = paths
    .map(
      (path) => `  <url>
    <loc>${new URL(path, siteUrl).toString()}</loc>
    <changefreq>weekly</changefreq>
    <priority>${path === '/' ? '1.0' : '0.8'}</priority>
  </url>`
    )
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
    {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    }
  );
};
