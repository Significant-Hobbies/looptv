import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { Catalog, CatalogSummary, Video } from '@/lib/types';
import type { EmbedHealthRecord } from '@/lib/watched';
import {
  getWatchedIds,
  getBlockedSources,
  getWatchLater,
  getSavedForPlayback,
  getSmartMixProfileRaw,
  setSmartMixProfileRaw as setSmartMixProfileRawImpl,
  getEmbedHealth,
  getQuarantinedSources,
  blockSource,
  unblockSource,
  unquarantineSource,
  addSavedForPlayback,
  removeSavedForPlayback,
  resetSmartMixProfile,
} from '@/lib/watched';
import {
  applyPreference,
  createSmartMixProfile,
  parseSmartMixProfile,
  serializeSmartMixProfile,
  type SmartMixProfile,
} from '@/lib/smartmix';
import {
  getDismissedPlaybackDiagnosticKey,
  persistDismissedPlaybackDiagnosticKey,
  playbackDiagnosticKey as getPlaybackDiagnosticKey,
} from '@/lib/playback-diagnostics';
import { ytErrorReason } from '@/lib/yt-errors';
import { trackActivated, trackCoreAction } from '@/lib/analytics';
import { useGlobalKeybindings } from './useGlobalKeybindings';
import { useCatalogManager } from './useCatalogManager';
import type { PlayerHandle } from '@/components/Player';
import stations from '../../channels.config';
import {
  toggleWatchLaterId,
  markWatchedIfNeeded,
  applyCategoryChange,
  buildStationConfig,
  collectAllVideos,
  computeNextVideoPreview,
  resolveSourceFreshness,
  computeCatalogFreshness,
  computePlaybackDiagnostic,
  countTotalVideos,
  SMART_MIX_ID,
  runPlayNext,
} from './useTVAppStateHelpers';

interface BaseState {
  activeStation: string;
  activeCategory: string;
  currentVideo: Video | null;
  status: string;
  mode: 'lobby' | 'playing';
  paused: boolean;
  muted: boolean;
  searchOpen: boolean;
  hideWatched: boolean;
  watchedIds: Set<string>;
  blockedSources: Set<string>;
  quarantinedSources: Set<string>;
  activeSources: Set<string> | null;
  showShortcuts: boolean;
  showGuide: boolean;
  showHealth: boolean;
  nextVideoPreview: Video | null;
  copied: boolean;
  watchLaterIds: Set<string>;
  savedForPlaybackIds: Set<string>;
  smartMixProfile: SmartMixProfile;
  smartMixReason: string;
  playbackIssue: { reason: string; skipped: number } | null;
  dismissedDiagnosticKey: string | null;
  embedHealth: Record<string, EmbedHealthRecord>;
  queueCount: number;
  hasHistory: boolean;
  mounted: boolean;
  isPlayAll: boolean;
  isSmartMix: boolean;
  config: ReturnType<typeof buildStationConfig>;
  categories: { id: string; name: string }[];
  catalog: Catalog | null;
  catalogSummary: CatalogSummary | null;
  catalogLoadFailed: boolean;
  catalogRefreshing: boolean;
  refreshCatalogState: () => Promise<void>;
  playerRef: React.RefObject<PlayerHandle | null>;
  queueRef: React.RefObject<Video[]>;
  skippedRef: React.RefObject<Set<string>>;
  blockedSourcesRef: React.RefObject<Set<string>>;
  quarantinedSourcesRef: React.RefObject<Set<string>>;
  historyRef: React.RefObject<Video[]>;
  retryTimeoutRef: React.RefObject<ReturnType<typeof setTimeout> | null>;
  setActiveStation: Dispatch<SetStateAction<string>>;
  setActiveCategory: Dispatch<SetStateAction<string>>;
  setCurrentVideo: Dispatch<SetStateAction<Video | null>>;
  setStatus: Dispatch<SetStateAction<string>>;
  setMode: Dispatch<SetStateAction<'lobby' | 'playing'>>;
  setPaused: Dispatch<SetStateAction<boolean>>;
  setMuted: Dispatch<SetStateAction<boolean>>;
  setSearchOpen: Dispatch<SetStateAction<boolean>>;
  setHideWatched: Dispatch<SetStateAction<boolean>>;
  setWatchedIds: Dispatch<SetStateAction<Set<string>>>;
  setBlockedSources: Dispatch<SetStateAction<Set<string>>>;
  setQuarantinedSources: Dispatch<SetStateAction<Set<string>>>;
  setActiveSources: Dispatch<SetStateAction<Set<string> | null>>;
  setShowShortcuts: Dispatch<SetStateAction<boolean>>;
  setShowGuide: Dispatch<SetStateAction<boolean>>;
  setShowHealth: Dispatch<SetStateAction<boolean>>;
  setNextVideoPreview: Dispatch<SetStateAction<Video | null>>;
  setCopied: Dispatch<SetStateAction<boolean>>;
  setWatchLaterIds: Dispatch<SetStateAction<Set<string>>>;
  setSavedForPlaybackIds: Dispatch<SetStateAction<Set<string>>>;
  setSmartMixProfile: Dispatch<SetStateAction<SmartMixProfile>>;
  setSmartMixReason: Dispatch<SetStateAction<string>>;
  setPlaybackIssue: Dispatch<SetStateAction<{ reason: string; skipped: number } | null>>;
  setDismissedDiagnosticKey: Dispatch<SetStateAction<string | null>>;
  setEmbedHealth: Dispatch<SetStateAction<Record<string, EmbedHealthRecord>>>;
  setQueueCount: Dispatch<SetStateAction<number>>;
  setHasHistory: Dispatch<SetStateAction<boolean>>;
  setSmartMixProfileRaw: (v: string) => void;
  setMounted: Dispatch<SetStateAction<boolean>>;
}

function useMountEffect(b: BaseState) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters and refs are stable
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      b.setMounted(true);
      b.setWatchedIds(getWatchedIds());
      const blocked = getBlockedSources();
      b.blockedSourcesRef.current = blocked;
      b.setBlockedSources(blocked);
      b.setQuarantinedSources(getQuarantinedSources());
      b.quarantinedSourcesRef.current = getQuarantinedSources();
      b.setWatchLaterIds(new Set(getWatchLater()));
      b.setSavedForPlaybackIds(new Set(getSavedForPlayback()));
      b.setEmbedHealth(getEmbedHealth());
      b.setDismissedDiagnosticKey(getDismissedPlaybackDiagnosticKey());
      const raw = getSmartMixProfileRaw();
      if (raw) {
        try {
          b.setSmartMixProfile(parseSmartMixProfile(raw));
        } catch {
          b.setSmartMixProfile(createSmartMixProfile());
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref sync
  useEffect(() => {
    b.blockedSourcesRef.current = b.blockedSources;
  }, [b.blockedSources]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref sync
  useEffect(() => {
    b.quarantinedSourcesRef.current = b.quarantinedSources;
  }, [b.quarantinedSources]);
}

function usePlaybackCore(b: BaseState) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters and refs are stable
  const maybeMarkWatched = useCallback(
    (video: Video | null, forceWatched = false) =>
      markWatchedIfNeeded({
        video,
        forceWatched,
        playerRef: b.playerRef,
        activeStation: b.activeStation,
        setSavedForPlaybackIds: b.setSavedForPlaybackIds,
        setWatchedIds: b.setWatchedIds,
      }),
    [b.activeStation]
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters and refs are stable
  const transitionToVideo = useCallback(
    (next: Video, reason: string) => {
      maybeMarkWatched(b.currentVideo);
      if (b.currentVideo) {
        b.historyRef.current.push(b.currentVideo);
        b.setHasHistory(true);
      }
      b.setCurrentVideo(next);
      b.setSmartMixReason(reason);
      b.setStatus('');
      b.setPaused(false);
    },
    [b.currentVideo, maybeMarkWatched]
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters and refs are stable
  const playNext = useCallback(
    (cat?: string) => {
      if (!b.catalog) return;
      runPlayNext(
        {
          catalog: b.catalog,
          isSmartMix: b.isSmartMix,
          activeStation: b.activeStation,
          activeCategory: b.activeCategory,
          hideWatched: b.hideWatched,
          watchedIds: b.watchedIds,
          activeSources: b.activeSources,
          smartMixProfile: b.smartMixProfile,
          currentVideo: b.currentVideo,
          skippedRef: b.skippedRef,
          blockedSourcesRef: b.blockedSourcesRef,
          quarantinedSourcesRef: b.quarantinedSourcesRef,
          historyRef: b.historyRef,
          queueRef: b.queueRef,
          retryTimeoutRef: b.retryTimeoutRef,
          setQueueCount: b.setQueueCount,
          setStatus: b.setStatus,
          transitionToVideo,
        },
        cat
      );
    },
    [
      b.catalog,
      b.activeStation,
      b.activeCategory,
      b.currentVideo,
      b.hideWatched,
      b.watchedIds,
      b.activeSources,
      transitionToVideo,
      b.isSmartMix,
      b.smartMixProfile,
    ]
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters and refs are stable
  const playPrev = useCallback(() => {
    if (b.retryTimeoutRef.current) {
      clearTimeout(b.retryTimeoutRef.current);
      b.retryTimeoutRef.current = null;
    }
    maybeMarkWatched(b.currentVideo);
    const prev = b.historyRef.current.pop();
    if (prev) {
      b.setCurrentVideo(prev);
      b.setStatus('');
      b.setPaused(false);
    }
    b.setHasHistory(b.historyRef.current.length > 0);
  }, [b.currentVideo, maybeMarkWatched]);
  return { maybeMarkWatched, transitionToVideo, playNext, playPrev };
}

function usePlaybackActions(b: BaseState, core: ReturnType<typeof usePlaybackCore>) {
  const { maybeMarkWatched, playNext } = core;
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters and refs are stable
  const playVideo = useCallback(
    (video: Video) => {
      maybeMarkWatched(b.currentVideo);
      if (b.currentVideo) {
        b.historyRef.current.push(b.currentVideo);
        b.setHasHistory(true);
      }
      b.setCurrentVideo(video);
      b.setStatus('');
      b.setPaused(false);
      b.setSearchOpen(false);
      b.setMode('playing');
    },
    [b.currentVideo, maybeMarkWatched]
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters and refs are stable
  const switchToStation = useCallback(
    (stationId: string) => {
      maybeMarkWatched(b.currentVideo);
      b.skippedRef.current.clear();
      b.historyRef.current = [];
      b.setHasHistory(false);
      b.setActiveStation(stationId);
      b.setActiveSources(null);
      b.setCurrentVideo(null);
      b.setShowGuide(false);
    },
    [b.currentVideo, maybeMarkWatched]
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters and refs are stable
  const handleCategoryChange = useCallback(
    (id: string) =>
      applyCategoryChange({
        id,
        catalog: b.catalog,
        activeStation: b.activeStation,
        hideWatched: b.hideWatched,
        watchedIds: b.watchedIds,
        currentVideo: b.currentVideo,
        historyRef: b.historyRef,
        setHasHistory: b.setHasHistory,
        setCurrentVideo: b.setCurrentVideo,
        setStatus: b.setStatus,
        setPaused: b.setPaused,
        setActiveCategory: b.setActiveCategory,
        skippedRef: b.skippedRef,
      }),
    [b.catalog, b.activeStation, b.currentVideo, b.hideWatched, b.watchedIds]
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters are stable
  const startPlaying = useCallback(() => {
    b.setMode('playing');
    playNext();
  }, [playNext]);
  return { playVideo, switchToStation, handleCategoryChange, startPlaying };
}

function usePlaybackEffects(
  b: BaseState,
  pb: ReturnType<typeof usePlaybackCore> & ReturnType<typeof usePlaybackActions>
) {
  useEffect(() => {
    if (b.mode === 'playing' && b.catalog && !b.currentVideo) pb.playNext();
  }, [b.mode, b.catalog, b.currentVideo, pb.playNext]);
  useEffect(() => {
    if (b.mode === 'playing' && b.currentVideo) {
      trackActivated();
      trackCoreAction('video_played');
    }
  }, [b.mode, b.currentVideo]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters and refs are stable
  useEffect(() => {
    if (!b.catalog || !b.currentVideo || b.isSmartMix) {
      b.setNextVideoPreview(null);
      return;
    }
    b.setNextVideoPreview(
      computeNextVideoPreview({
        catalog: b.catalog,
        currentVideo: b.currentVideo,
        activeStation: b.activeStation,
        activeCategory: b.activeCategory,
        hideWatched: b.hideWatched,
        watchedIds: b.watchedIds,
        blockedSources: b.blockedSources,
        quarantinedSources: b.quarantinedSources,
        activeSources: b.activeSources,
      })
    );
  }, [
    b.catalog,
    b.currentVideo,
    b.activeStation,
    b.activeCategory,
    b.hideWatched,
    b.watchedIds,
    b.blockedSources,
    b.quarantinedSources,
    b.activeSources,
    b.isSmartMix,
  ]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup only
  useEffect(
    () => () => {
      if (b.retryTimeoutRef.current) {
        clearTimeout(b.retryTimeoutRef.current);
        b.retryTimeoutRef.current = null;
      }
    },
    []
  );
}

function useSourceCallbacks(
  b: BaseState,
  pb: ReturnType<typeof usePlaybackCore> & ReturnType<typeof usePlaybackActions>
) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters are stable
  const syncBlocked = useCallback((n: Set<string>) => {
    b.blockedSourcesRef.current = n;
    b.setBlockedSources(n);
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters are stable
  const syncQuarantined = useCallback((n: Set<string>) => {
    b.quarantinedSourcesRef.current = n;
    b.setQuarantinedSources(n);
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters and refs are stable
  const handleToggleBlock = useCallback(
    (source: string) => {
      if (b.blockedSources.has(source)) {
        unblockSource(source);
        const n = new Set(b.blockedSourcesRef.current);
        n.delete(source);
        syncBlocked(n);
      } else {
        blockSource(source);
        const n = new Set(b.blockedSourcesRef.current);
        n.add(source);
        syncBlocked(n);
      }
    },
    [b.blockedSources, syncBlocked]
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters and refs are stable
  const handleUnquarantine = useCallback(
    (source: string) => {
      unquarantineSource(source);
      const n = new Set(b.quarantinedSourcesRef.current);
      n.delete(source);
      syncQuarantined(n);
    },
    [syncQuarantined]
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters and refs are stable
  const handleError = useCallback(
    (code: number) => {
      const reason = ytErrorReason(code);
      if (b.currentVideo) b.skippedRef.current.add(b.currentVideo.id);
      b.setEmbedHealth(getEmbedHealth());
      b.setQuarantinedSources(getQuarantinedSources());
      b.quarantinedSourcesRef.current = getQuarantinedSources();
      b.setPlaybackIssue((prev) => ({ reason, skipped: (prev?.skipped ?? 0) + 1 }));
      b.setStatus(`Skipped: ${reason}. Trying next...`);
      if (b.retryTimeoutRef.current) clearTimeout(b.retryTimeoutRef.current);
      b.retryTimeoutRef.current = setTimeout(() => {
        b.retryTimeoutRef.current = null;
        pb.playNext();
      }, 500);
    },
    [b.currentVideo, pb.playNext]
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters are stable
  const updateSmartPreference = useCallback(
    (p: 'favorite' | 'dislike') => {
      if (!b.currentVideo) return;
      const n = applyPreference(b.smartMixProfile, b.currentVideo, p);
      b.setSmartMixProfile(n);
      b.setSmartMixProfileRaw(serializeSmartMixProfile(n));
      if (p === 'dislike') pb.playNext();
    },
    [b.currentVideo, pb.playNext, b.smartMixProfile]
  );
  return { handleToggleBlock, handleUnquarantine, handleError, updateSmartPreference };
}

function useMiscCallbacks(
  b: BaseState,
  pb: ReturnType<typeof usePlaybackCore> & ReturnType<typeof usePlaybackActions>
) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters are stable
  const toggleSavedForPlayback = useCallback(() => {
    if (!b.currentVideo) return;
    if (b.savedForPlaybackIds.has(b.currentVideo.id)) {
      removeSavedForPlayback(b.currentVideo.id);
      b.setSavedForPlaybackIds((p) => {
        const n = new Set(p);
        n.delete(b.currentVideo!.id);
        return n;
      });
    } else {
      addSavedForPlayback(b.currentVideo.id);
      b.setSavedForPlaybackIds((p) => new Set([...p, b.currentVideo!.id]));
    }
  }, [b.currentVideo, b.savedForPlaybackIds]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters are stable
  const handleCopyLink = useCallback(() => {
    if (!b.currentVideo) return;
    navigator.clipboard.writeText(`https://youtube.com/watch?v=${b.currentVideo.id}`);
    b.setCopied(true);
    setTimeout(() => b.setCopied(false), 2000);
  }, [b.currentVideo]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters are stable
  const handleSmartMixExport = useCallback(() => {
    navigator.clipboard.writeText(serializeSmartMixProfile(b.smartMixProfile));
    b.setCopied(true);
    setTimeout(() => b.setCopied(false), 2000);
  }, [b.smartMixProfile]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters are stable
  const handleSmartMixImport = useCallback(() => {
    const raw = window.prompt('Paste Smart Mix profile JSON');
    if (!raw) return;
    try {
      const n = parseSmartMixProfile(raw);
      b.setSmartMixProfile(n);
      b.setSmartMixProfileRaw(serializeSmartMixProfile(n));
    } catch {
      b.setStatus('Invalid Smart Mix profile JSON');
    }
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters are stable
  const handleSmartMixReset = useCallback(() => {
    resetSmartMixProfile();
    b.setSmartMixProfile(createSmartMixProfile());
    b.setSmartMixReason('');
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters are stable
  const handleBackToLobby = useCallback(() => {
    pb.maybeMarkWatched(b.currentVideo);
    b.setMode('lobby');
    b.setCurrentVideo(null);
    b.setEmbedHealth(getEmbedHealth());
    b.setQuarantinedSources(getQuarantinedSources());
  }, [b.currentVideo, pb.maybeMarkWatched]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref is stable
  const handlePlayPause = useCallback(() => {
    b.playerRef.current?.togglePlay();
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref is stable
  const handleToggleMute = useCallback(() => {
    b.playerRef.current?.toggleMute();
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters are stable
  const handlePlayerReady = useCallback(() => {
    b.setStatus('');
    b.setPlaybackIssue(null);
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters are stable
  const handlePlayerPlay = useCallback(() => {
    b.setPlaybackIssue(null);
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters are stable
  const enqueueVideo = useCallback((v: Video) => {
    b.queueRef.current.push(v);
    b.setQueueCount(b.queueRef.current.length);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }, []);
  return {
    toggleSavedForPlayback,
    handleCopyLink,
    handleSmartMixExport,
    handleSmartMixImport,
    handleSmartMixReset,
    handleBackToLobby,
    handlePlayPause,
    handleToggleMute,
    handlePlayerReady,
    handlePlayerPlay,
    enqueueVideo,
    toggleFullscreen,
  };
}

function useDiagnostics(b: BaseState) {
  const allVideos = collectAllVideos(b.catalog, b.isPlayAll, b.isSmartMix, b.activeStation);
  const catalogLoaded = b.catalog !== null;
  const unwatchedCount = allVideos.filter((v) => !b.watchedIds.has(v.id)).length;
  const catalogFreshness = useMemo(
    () => computeCatalogFreshness(b.mounted, b.catalog, b.catalogSummary),
    [b.mounted, b.catalog, b.catalogSummary]
  );
  const currentSourceFreshness = useMemo(
    () => resolveSourceFreshness(b.currentVideo, b.catalog),
    [b.catalog, b.currentVideo]
  );
  const playbackDiagnostic = useMemo(
    () =>
      computePlaybackDiagnostic({
        mounted: b.mounted,
        catalogLoaded,
        catalogLoadFailed: b.catalogLoadFailed,
        catalogFreshness,
        currentVideo: b.currentVideo,
        currentSourceFreshness,
        embedHealth: b.embedHealth,
        quarantinedSources: b.quarantinedSources,
        playbackIssue: b.playbackIssue,
      }),
    [
      b.mounted,
      catalogLoaded,
      b.catalogLoadFailed,
      catalogFreshness,
      b.currentVideo,
      currentSourceFreshness,
      b.embedHealth,
      b.quarantinedSources,
      b.playbackIssue,
    ]
  );
  const playbackDiagnosticKey = getPlaybackDiagnosticKey(playbackDiagnostic);
  const visiblePlaybackDiagnostic =
    playbackDiagnosticKey !== b.dismissedDiagnosticKey ? playbackDiagnostic : null;
  const totalCatalogVideos = countTotalVideos(b.catalog, b.catalogSummary);
  // biome-ignore lint/correctness/useExhaustiveDependencies: b setters are stable
  const dismissPlaybackDiagnostic = useCallback(() => {
    if (!playbackDiagnosticKey) return;
    b.setDismissedDiagnosticKey(playbackDiagnosticKey);
    persistDismissedPlaybackDiagnosticKey(playbackDiagnosticKey);
  }, [playbackDiagnosticKey]);
  return {
    allVideos,
    unwatchedCount,
    catalogLoaded,
    catalogFreshness,
    visiblePlaybackDiagnostic,
    totalCatalogVideos,
    dismissPlaybackDiagnostic,
  };
}

export function useTVAppState({ initialChannel }: { initialChannel?: string }) {
  const b = useBaseState({ initialChannel });
  useMountEffect(b);
  const core = usePlaybackCore(b);
  const actions = usePlaybackActions(b, core);
  const pb = { ...core, ...actions };
  usePlaybackEffects(b, pb);
  const sc = useSourceCallbacks(b, pb);
  const mc = useMiscCallbacks(b, pb);
  const ec = { ...sc, ...mc };
  const diag = useDiagnostics(b);
  useGlobalKeybindings(
    {
      mode: b.mode,
      searchOpen: b.searchOpen,
      categories: b.categories,
      startPlaying: pb.startPlaying,
      playNext: pb.playNext,
      playPrev: pb.playPrev,
      handleCategoryChange: pb.handleCategoryChange,
      togglePlay: () => b.setPaused((p) => !p),
      toggleMute: () => b.setMuted((m) => !m),
      toggleShortcuts: () => b.setShowShortcuts((s) => !s),
      toggleGuide: () => b.setShowGuide((g) => !g),
      toggleHealth: () => b.setShowHealth((s) => !s),
      toggleHideWatched: () => b.setHideWatched((h) => !h),
      openSearch: () => b.setSearchOpen(true),
      closeSearch: () => b.setSearchOpen(false),
      closeOverlays: () => {
        b.setSearchOpen(false);
        b.setShowShortcuts(false);
        b.setShowGuide(false);
        b.setShowHealth(false);
      },
      toggleFullscreen: ec.toggleFullscreen,
    },
    b.playerRef
  );
  return {
    ...b,
    ...pb,
    ...ec,
    ...diag,
    toggleWatchLaterId: (id: string) => toggleWatchLaterId(id, b.watchLaterIds, b.setWatchLaterIds),
  };
}

export type TVAppState = ReturnType<typeof useTVAppState>;
function useCoreState(initialChannel?: string) {
  const [activeStation, setActiveStation] = useState(initialChannel || stations[0].id);
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [status, setStatus] = useState<string>('Loading...');
  const [mode, setMode] = useState<'lobby' | 'playing'>('lobby');
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hideWatched, setHideWatched] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [nextVideoPreview, setNextVideoPreview] = useState<Video | null>(null);
  const [copied, setCopied] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [hasHistory, setHasHistory] = useState(false);
  const [mounted, setMounted] = useState(false);
  return {
    activeStation,
    setActiveStation,
    activeCategory,
    setActiveCategory,
    currentVideo,
    setCurrentVideo,
    status,
    setStatus,
    mode,
    setMode,
    paused,
    setPaused,
    muted,
    setMuted,
    searchOpen,
    setSearchOpen,
    hideWatched,
    setHideWatched,
    showShortcuts,
    setShowShortcuts,
    showGuide,
    setShowGuide,
    showHealth,
    setShowHealth,
    nextVideoPreview,
    setNextVideoPreview,
    copied,
    setCopied,
    queueCount,
    setQueueCount,
    hasHistory,
    setHasHistory,
    mounted,
    setMounted,
  };
}

function useCollectionState() {
  const [watchedIds, setWatchedIds] = useState<Set<string>>(() => new Set());
  const [blockedSources, setBlockedSources] = useState<Set<string>>(() => new Set());
  const [quarantinedSources, setQuarantinedSources] = useState<Set<string>>(() => new Set());
  const [activeSources, setActiveSources] = useState<Set<string> | null>(null);
  const [watchLaterIds, setWatchLaterIds] = useState<Set<string>>(() => new Set());
  const [savedForPlaybackIds, setSavedForPlaybackIds] = useState<Set<string>>(() => new Set());
  return {
    watchedIds,
    setWatchedIds,
    blockedSources,
    setBlockedSources,
    quarantinedSources,
    setQuarantinedSources,
    activeSources,
    setActiveSources,
    watchLaterIds,
    setWatchLaterIds,
    savedForPlaybackIds,
    setSavedForPlaybackIds,
  };
}

function useSmartMixState() {
  const [smartMixProfile, setSmartMixProfile] = useState<SmartMixProfile>(() =>
    createSmartMixProfile()
  );
  const [smartMixReason, setSmartMixReason] = useState('');
  const [playbackIssue, setPlaybackIssue] = useState<{ reason: string; skipped: number } | null>(
    null
  );
  const [dismissedDiagnosticKey, setDismissedDiagnosticKey] = useState<string | null>(null);
  const [embedHealth, setEmbedHealth] = useState<Record<string, EmbedHealthRecord>>(() => ({}));
  return {
    smartMixProfile,
    setSmartMixProfile,
    smartMixReason,
    setSmartMixReason,
    playbackIssue,
    setPlaybackIssue,
    dismissedDiagnosticKey,
    setDismissedDiagnosticKey,
    embedHealth,
    setEmbedHealth,
  };
}

function useRefs() {
  const queueRef = useRef<Video[]>([]);
  const skippedRef = useRef(new Set<string>());
  const blockedSourcesRef = useRef(new Set<string>());
  const quarantinedSourcesRef = useRef(new Set<string>());
  const historyRef = useRef<Video[]>([]);
  const playerRef = useRef<PlayerHandle>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return {
    queueRef,
    skippedRef,
    blockedSourcesRef,
    quarantinedSourcesRef,
    historyRef,
    playerRef,
    retryTimeoutRef,
  };
}

function useBaseState({ initialChannel }: { initialChannel?: string }): BaseState {
  const core = useCoreState(initialChannel);
  const coll = useCollectionState();
  const sm = useSmartMixState();
  const refs = useRefs();
  const { catalog, catalogSummary, catalogLoadFailed, catalogRefreshing, refreshCatalogState } =
    useCatalogManager({ setStatus: core.setStatus });
  const isPlayAll = core.activeStation === 'all';
  const isSmartMix = core.activeStation === SMART_MIX_ID;
  const config = buildStationConfig(core.activeStation, isSmartMix, isPlayAll);
  const categories = useMemo(() => [{ id: 'all', name: 'All' }], []);
  return Object.assign(core, coll, sm, refs, {
    isPlayAll,
    isSmartMix,
    config,
    categories,
    catalog,
    catalogSummary,
    catalogLoadFailed,
    catalogRefreshing,
    refreshCatalogState,
    setSmartMixProfileRaw: setSmartMixProfileRawImpl,
  });
}
