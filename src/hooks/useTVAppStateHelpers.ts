import type { Dispatch, SetStateAction } from 'react';
import type { Catalog, CatalogSummary, Video } from '@/lib/types';
import {
  getVideosForStation,
  pickRandom,
  getCatalogFreshness,
  getSourceFreshness,
} from '@/lib/catalog';
import {
  markWatched,
  addWatchLater,
  removeWatchLater,
  removeSavedForPlayback,
  type EmbedHealthRecord,
} from '@/lib/watched';
import { derivePlaybackDiagnostic } from '@/lib/playback-diagnostics';
import { pickSmartMixVideo, type SmartMixProfile } from '@/lib/smartmix';
import type { PlayerHandle } from '@/components/Player';
import stations from '../../channels.config';

const SMART_MIX_ID = 'smart-mix';

export type SetWatchLaterIds = Dispatch<SetStateAction<Set<string>>>;

export function toggleWatchLaterId(
  id: string,
  watchLaterIds: Set<string>,
  setWatchLaterIds: SetWatchLaterIds
) {
  if (watchLaterIds.has(id)) {
    removeWatchLater(id);
    setWatchLaterIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  } else {
    addWatchLater(id);
    setWatchLaterIds((prev) => new Set([...prev, id]));
  }
}

interface VideoFilterOptions {
  skippedIds: Set<string>;
  hideWatched: boolean;
  watchedIds: Set<string>;
  blockedSources: Set<string>;
  quarantinedSources: Set<string>;
  activeSources: Set<string> | null;
}

function filterAvailableVideos(videos: Video[], opts: VideoFilterOptions): Video[] {
  return videos.filter(
    (v) =>
      !opts.skippedIds.has(v.id) &&
      (!opts.hideWatched || !opts.watchedIds.has(v.id)) &&
      (!v.source || !opts.blockedSources.has(v.source)) &&
      (!v.source || !opts.quarantinedSources.has(v.source)) &&
      (!opts.activeSources || !v.source || opts.activeSources.has(v.source))
  );
}

interface SmartMixPickParams {
  catalog: Catalog;
  profile: SmartMixProfile;
  hideWatched: boolean;
  watchedIds: Set<string>;
  blockedSources: Set<string>;
  quarantinedSources: Set<string>;
  excludeId: string | undefined;
  recentIds: Set<string>;
}

export function pickSmartMixCandidate(params: SmartMixPickParams) {
  return pickSmartMixVideo(params.catalog, params.profile, {
    watchedIds: params.hideWatched ? params.watchedIds : undefined,
    blockedSources: new Set([...params.blockedSources, ...params.quarantinedSources]),
    excludeId: params.excludeId,
    recentIds: params.recentIds,
  });
}

function collectVideos(
  catalog: Catalog,
  isSmartMix: boolean,
  activeStation: string,
  category: string
): Video[] {
  return isSmartMix
    ? Object.values(catalog.stations).flatMap((station) => station.videos)
    : getVideosForStation(catalog, activeStation, category);
}

function selectNextVideo(
  available: Video[],
  allVideos: Video[],
  smartPick: ReturnType<typeof pickSmartMixCandidate> | null,
  excludeId: string | undefined
): Video | null {
  const pool = available.length > 0 ? available : allVideos;
  return smartPick ? smartPick.video : pickRandom(pool, excludeId);
}

interface NextPreviewParams {
  catalog: Catalog;
  currentVideo: Video;
  activeStation: string;
  activeCategory: string;
  hideWatched: boolean;
  watchedIds: Set<string>;
  blockedSources: Set<string>;
  quarantinedSources: Set<string>;
  activeSources: Set<string> | null;
}

export function computeNextVideoPreview(params: NextPreviewParams): Video | null {
  const videos = getVideosForStation(params.catalog, params.activeStation, params.activeCategory);
  const pool = videos.filter(
    (v) =>
      v.id !== params.currentVideo.id &&
      (!params.hideWatched || !params.watchedIds.has(v.id)) &&
      (!v.source || !params.blockedSources.has(v.source)) &&
      (!v.source || !params.quarantinedSources.has(v.source)) &&
      (!params.activeSources || !v.source || params.activeSources.has(v.source))
  );
  const src = pool.length > 0 ? pool : videos.filter((v) => v.id !== params.currentVideo.id);
  return src.length > 0 ? src[Math.floor(Math.random() * src.length)] : null;
}

interface MarkWatchedParams {
  video: Video | null;
  forceWatched: boolean;
  playerRef: React.RefObject<PlayerHandle | null>;
  activeStation: string;
  setSavedForPlaybackIds: Dispatch<SetStateAction<Set<string>>>;
  setWatchedIds: Dispatch<SetStateAction<Set<string>>>;
}

export function markWatchedIfNeeded(params: MarkWatchedParams) {
  const { video, forceWatched, playerRef, activeStation, setSavedForPlaybackIds, setWatchedIds } =
    params;
  if (!video) return;
  const progress = playerRef.current?.getWatchProgress() ?? 0;
  if (forceWatched || progress >= 0.5) {
    markWatched(video.id, video.duration, activeStation, video.source || '');
    removeSavedForPlayback(video.id);
    setSavedForPlaybackIds((prev) => {
      if (!prev.has(video.id)) return prev;
      const next = new Set(prev);
      next.delete(video.id);
      return next;
    });
    setWatchedIds((prev) => {
      if (prev.has(video.id)) return prev;
      return new Set([...prev, video.id]);
    });
  }
}

interface CategoryChangeParams {
  id: string;
  catalog: Catalog | null;
  activeStation: string;
  hideWatched: boolean;
  watchedIds: Set<string>;
  currentVideo: Video | null;
  historyRef: React.RefObject<Video[]>;
  setHasHistory: (v: boolean) => void;
  setCurrentVideo: (v: Video) => void;
  setStatus: (s: string) => void;
  setPaused: (v: boolean) => void;
  setActiveCategory: (id: string) => void;
  skippedRef: React.RefObject<Set<string>>;
}

export function applyCategoryChange(params: CategoryChangeParams) {
  params.setActiveCategory(params.id);
  params.skippedRef.current.clear();
  if (!params.catalog) return;
  const videos = getVideosForStation(params.catalog, params.activeStation, params.id);
  const available = params.hideWatched
    ? videos.filter((v) => !params.watchedIds.has(v.id))
    : videos;
  const next = pickRandom(available.length > 0 ? available : videos);
  if (!next) return;
  if (params.currentVideo) {
    params.historyRef.current.push(params.currentVideo);
    params.setHasHistory(true);
  }
  params.setCurrentVideo(next);
  params.setStatus('');
  params.setPaused(false);
}

export function resolveSourceFreshness(currentVideo: Video | null, catalog: Catalog | null) {
  if (!currentVideo?.source || !catalog) return undefined;
  const handle = stations
    .flatMap((st) => st.sources)
    .find((s) => s.name === currentVideo.source)
    ?.handle.replace('@', '');
  return getSourceFreshness(handle ? catalog.sourceMeta?.[handle] : undefined);
}

export function buildStationConfig(activeStation: string, isSmartMix: boolean, isPlayAll: boolean) {
  if (isSmartMix) {
    return {
      id: SMART_MIX_ID,
      name: 'Smart Mix',
      description: 'Personalized from favorites, dislikes, sources, tags, and local watch signals',
      sources: [] as { name: string; handle: string }[],
    };
  }
  if (isPlayAll) {
    return {
      id: 'all',
      name: 'All Stations',
      description: 'Shuffle across all stations',
      sources: [] as { name: string; handle: string }[],
    };
  }
  return stations.find((s) => s.id === activeStation) ?? stations[0];
}

export function collectAllVideos(
  catalog: Catalog | null,
  isPlayAll: boolean,
  isSmartMix: boolean,
  activeStation: string
): Video[] {
  if (isPlayAll || isSmartMix) {
    return Object.values(catalog?.stations ?? {}).flatMap((s) => s.videos);
  }
  return catalog?.stations?.[activeStation]?.videos ?? [];
}

export function computeCatalogFreshness(
  mounted: boolean,
  catalog: Catalog | null,
  catalogSummary: CatalogSummary | null
) {
  if (!mounted) {
    return {
      state: 'loading' as const,
      label: 'Checking catalog freshness...',
      ageDays: null,
      updatedAt: null,
    };
  }
  return getCatalogFreshness(
    catalog?.lastUpdated ?? catalogSummary?.lastUpdated,
    new Date(),
    catalog?.refreshStatus ?? catalogSummary?.refreshStatus
  );
}

interface DiagnosticParams {
  mounted: boolean;
  catalogLoaded: boolean;
  catalogLoadFailed: boolean;
  catalogFreshness: ReturnType<typeof computeCatalogFreshness>;
  currentVideo: Video | null;
  currentSourceFreshness: ReturnType<typeof resolveSourceFreshness>;
  embedHealth: Record<string, EmbedHealthRecord>;
  quarantinedSources: Set<string>;
  playbackIssue: { reason: string; skipped: number } | null;
}

export function computePlaybackDiagnostic(params: DiagnosticParams) {
  if (!params.mounted) return null;
  return derivePlaybackDiagnostic({
    catalogLoaded: params.catalogLoaded,
    catalogLoadFailed: params.catalogLoadFailed,
    catalogFreshness: params.catalogFreshness,
    currentSource: params.currentVideo?.source,
    sourceFreshness: params.currentSourceFreshness,
    embedHealth: params.currentVideo?.source
      ? params.embedHealth[params.currentVideo.source]
      : undefined,
    isQuarantined: params.currentVideo?.source
      ? params.quarantinedSources.has(params.currentVideo.source)
      : false,
    skipStreak: params.playbackIssue?.skipped ?? 0,
    lastSkipReason: params.playbackIssue?.reason,
  });
}

export function countTotalVideos(
  catalog: Catalog | null,
  catalogSummary: CatalogSummary | null
): number {
  return (
    (catalog && Object.values(catalog.stations).reduce((n, s) => n + s.videos.length, 0)) ||
    catalogSummary?.totalVideos ||
    0
  );
}

export { SMART_MIX_ID };

export interface PlayNextParams {
  catalog: Catalog;
  isSmartMix: boolean;
  activeStation: string;
  activeCategory: string;
  hideWatched: boolean;
  watchedIds: Set<string>;
  activeSources: Set<string> | null;
  smartMixProfile: SmartMixProfile;
  currentVideo: Video | null;
  skippedRef: React.RefObject<Set<string>>;
  blockedSourcesRef: React.RefObject<Set<string>>;
  quarantinedSourcesRef: React.RefObject<Set<string>>;
  historyRef: React.RefObject<Video[]>;
  queueRef: React.RefObject<Video[]>;
  retryTimeoutRef: React.RefObject<ReturnType<typeof setTimeout> | null>;
  setQueueCount: Dispatch<SetStateAction<number>>;
  setStatus: Dispatch<SetStateAction<string>>;
  transitionToVideo: (v: Video, r: string) => void;
}

export function runPlayNext(params: PlayNextParams, cat?: string) {
  const p = params;
  if (p.retryTimeoutRef.current) {
    clearTimeout(p.retryTimeoutRef.current);
    p.retryTimeoutRef.current = null;
  }
  if (p.queueRef.current.length > 0) {
    const q = p.queueRef.current.shift()!;
    p.setQueueCount(p.queueRef.current.length);
    p.transitionToVideo(q, '');
    return;
  }
  const videos = collectVideos(p.catalog, p.isSmartMix, p.activeStation, cat || p.activeCategory);
  const available = filterAvailableVideos(videos, {
    skippedIds: p.skippedRef.current,
    hideWatched: p.hideWatched,
    watchedIds: p.watchedIds,
    blockedSources: p.blockedSourcesRef.current,
    quarantinedSources: p.quarantinedSourcesRef.current,
    activeSources: p.activeSources,
  });
  if (available.length < 5) {
    if (p.hideWatched && videos.length > 5)
      p.setStatus(`Almost all watched! ${available.length} left`);
    p.skippedRef.current.clear();
  }
  const recentIds = new Set(p.historyRef.current.slice(-12).map((v) => v.id));
  const smartPick = p.isSmartMix
    ? pickSmartMixCandidate({
        catalog: p.catalog,
        profile: p.smartMixProfile,
        hideWatched: p.hideWatched,
        watchedIds: p.watchedIds,
        blockedSources: p.blockedSourcesRef.current,
        quarantinedSources: p.quarantinedSourcesRef.current,
        excludeId: p.currentVideo?.id,
        recentIds,
      })
    : null;
  const next = selectNextVideo(available, videos, smartPick, p.currentVideo?.id);
  if (next) p.transitionToVideo(next, smartPick?.reason ?? '');
  else p.setStatus('No unwatched videos in this category');
}
