import { z } from 'zod';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const YOUTUBE_HANDLE = /^@[A-Za-z0-9._-]+$/;

const CuratedVideoSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'video id must be a YouTube video id'),
  title: z.string().min(1),
  duration: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tags: z
    .array(z.string().trim().min(1))
    .min(2)
    .refine((tags) => new Set(tags).size > 1),
  source: z.string().min(1),
  viewCount: z.number().int().min(10_000),
  provenanceUrl: z.url({ protocol: /^https?$/ }),
});

const YouTubeSourceSchema = z
  .object({
    name: z.string().min(1, 'source name must be non-empty'),
    handle: z
      .string()
      .regex(YOUTUBE_HANDLE, 'YouTube handle must start with @ and contain only [A-Za-z0-9._-]'),
    channelId: z
      .string()
      .regex(/^UC[A-Za-z0-9_-]{22}$/, 'channelId must be a UC... YouTube channel id')
      .optional(),
    minDuration: z.number().int().nonnegative().optional(),
    maxDuration: z.number().int().nonnegative().optional(),
    topPercentile: z.number().min(0).max(100).optional(),
    maxVideos: z.number().int().positive().optional(),
  })
  .refine(
    (s) =>
      s.minDuration === undefined || s.maxDuration === undefined || s.minDuration <= s.maxDuration,
    { message: 'minDuration must be <= maxDuration' }
  );

export const StationConfigSchema = z
  .object({
    id: z.string().regex(KEBAB_CASE, 'station id must be kebab-case [a-z0-9-]'),
    name: z.string().min(1, 'station name must be non-empty'),
    description: z.string().min(1, 'station description must be non-empty'),
    sources: z.array(YouTubeSourceSchema),
    curatedVideos: z.array(CuratedVideoSchema).optional(),
  })
  .refine((station) => station.sources.length > 0 || (station.curatedVideos?.length ?? 0) > 0, {
    message: 'station must have at least one source or curated video',
  });

export const StationsConfigSchema = z
  .array(StationConfigSchema)
  .min(1, 'stations.json must contain at least one station')
  .refine((arr) => new Set(arr.map((s) => s.id)).size === arr.length, {
    message: 'station ids must be unique',
  });
