import type { APIRoute } from 'astro';
import { markdownHandler, markdownRoutes } from '@/lib/markdown-documents';
export function getStaticPaths() {
  return markdownRoutes.map((route) => ({
    params: { path: route.assetPath.slice(1, -3) },
    props: { url: route.md },
  }));
}
export const GET: APIRoute = async ({ props }) => (await markdownHandler(new Request(props.url)))!;
