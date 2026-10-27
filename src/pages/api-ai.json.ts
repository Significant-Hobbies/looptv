import type { APIRoute } from 'astro';
import { markdownHandler } from '@/lib/markdown-documents';
import { PUBLIC_ORIGIN } from '@/lib/public-surfaces';
export const GET: APIRoute = async () =>
  (await markdownHandler(new Request(`${PUBLIC_ORIGIN}/api/ai`)))!;
