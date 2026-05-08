import type { Catalog, Video } from "./types";

export interface SmartMixProfile {
  favorites: string[];
  dislikes: string[];
  sourceWeights: Record<string, number>;
  tagWeights: Record<string, number>;
  lastUpdated: string;
}

export interface SmartMixPick {
  video: Video | null;
  reason: string;
  score: number;
}

const DEFAULT_PROFILE: SmartMixProfile = {
  favorites: [],
  dislikes: [],
  sourceWeights: {},
  tagWeights: {},
  lastUpdated: "",
};

export function createSmartMixProfile(input?: Partial<SmartMixProfile>): SmartMixProfile {
  return {
    ...DEFAULT_PROFILE,
    ...input,
    favorites: [...(input?.favorites ?? [])],
    dislikes: [...(input?.dislikes ?? [])],
    sourceWeights: { ...(input?.sourceWeights ?? {}) },
    tagWeights: { ...(input?.tagWeights ?? {}) },
  };
}

export function allCatalogVideos(catalog: Catalog): Video[] {
  return Object.values(catalog.stations).flatMap((station) => station.videos);
}

export function pickSmartMixVideo(
  catalog: Catalog,
  profile: SmartMixProfile,
  options: {
    watchedIds?: Set<string>;
    blockedSources?: Set<string>;
    excludeId?: string;
    recentIds?: Set<string>;
  } = {}
): SmartMixPick {
  const disliked = new Set(profile.dislikes);
  const candidates = allCatalogVideos(catalog).filter((video) => {
    if (video.id === options.excludeId) return false;
    if (options.recentIds?.has(video.id)) return false;
    if (options.watchedIds?.has(video.id)) return false;
    if (disliked.has(video.id)) return false;
    if (video.source && options.blockedSources?.has(video.source)) return false;
    return true;
  });

  if (candidates.length === 0) return { video: null, reason: "No Smart Mix candidates match the current filters.", score: 0 };

  const ranked = candidates
    .map((video) => ({ video, ...scoreVideo(video, profile) }))
    .sort((a, b) => b.score - a.score || (b.video.viewCount ?? 0) - (a.video.viewCount ?? 0));

  const topBand = ranked.slice(0, Math.min(12, ranked.length));
  const winner = topBand[Math.floor(Math.random() * topBand.length)];
  return winner;
}

export function scoreVideo(video: Video, profile: SmartMixProfile): { score: number; reason: string } {
  let score = Math.log10((video.viewCount ?? 1000) + 10);
  const reasons: string[] = [];

  if (profile.favorites.includes(video.id)) {
    score += 20;
    reasons.push("favorited video");
  }

  if (video.source && profile.sourceWeights[video.source]) {
    const sourceScore = profile.sourceWeights[video.source];
    score += sourceScore * 3;
    reasons.push(`${video.source} source match`);
  }

  const tagMatches = (video.tags ?? []).filter((tag) => (profile.tagWeights[tag] ?? 0) > 0).slice(0, 3);
  for (const tag of tagMatches) score += profile.tagWeights[tag] * 2;
  if (tagMatches.length > 0) reasons.push(`tag match: ${tagMatches.join(", ")}`);

  if (video.duration >= 180 && video.duration <= 900) {
    score += 1;
    reasons.push("lean-back length");
  }

  return {
    score,
    reason: reasons.length > 0 ? reasons.join("; ") : "high catalog rank with no disliked signals",
  };
}

export function applyPreference(profile: SmartMixProfile, video: Video, preference: "favorite" | "dislike"): SmartMixProfile {
  const next = createSmartMixProfile(profile);
  next.lastUpdated = new Date().toISOString();

  if (preference === "favorite") {
    next.favorites = unique([...next.favorites, video.id]);
    next.dislikes = next.dislikes.filter((id) => id !== video.id);
    if (video.source) next.sourceWeights[video.source] = (next.sourceWeights[video.source] ?? 0) + 1;
    for (const tag of video.tags ?? []) next.tagWeights[tag] = (next.tagWeights[tag] ?? 0) + 1;
  } else {
    next.dislikes = unique([...next.dislikes, video.id]);
    next.favorites = next.favorites.filter((id) => id !== video.id);
    if (video.source) next.sourceWeights[video.source] = (next.sourceWeights[video.source] ?? 0) - 1;
    for (const tag of video.tags ?? []) next.tagWeights[tag] = (next.tagWeights[tag] ?? 0) - 1;
  }

  return next;
}

export function serializeSmartMixProfile(profile: SmartMixProfile): string {
  return JSON.stringify(profile);
}

export function parseSmartMixProfile(raw: string): SmartMixProfile {
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid Smart Mix profile.");
  return createSmartMixProfile(parsed);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
