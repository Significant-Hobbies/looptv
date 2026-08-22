import { useTVAppState, type TVAppState } from '@/hooks/useTVAppState';
import type { RailState, RailActions } from './ControlRail';
import type { BannerActions, SearchProps, HealthProps } from './shared-types';
import LobbyView from './LobbyView';
import PlayerView from './PlayerView';
import stations from '../../channels.config';

function buildBannerActions(s: TVAppState): BannerActions {
  return {
    onRetryCatalog: s.refreshCatalogState,
    onOpenHealth: () => s.setShowHealth(true),
    onSearch: () => s.setSearchOpen(true),
    onDismiss: s.dismissPlaybackDiagnostic,
  };
}

function buildSearchProps(s: TVAppState): SearchProps {
  return {
    videos: s.allVideos,
    onSelect: s.playVideo,
    onQueue: s.enqueueVideo,
    onClose: () => s.setSearchOpen(false),
    visible: s.searchOpen,
    watchLaterIds: s.watchLaterIds,
    onToggleWatchLater: s.toggleWatchLaterId,
  };
}

function buildHealthProps(s: TVAppState): HealthProps {
  return {
    visible: s.showHealth,
    onClose: () => s.setShowHealth(false),
    stations,
    catalog: s.catalog,
    embedHealth: s.embedHealth,
    blockedSources: s.blockedSources,
    quarantinedSources: s.quarantinedSources,
    onToggleBlock: s.handleToggleBlock,
    onUnquarantine: s.handleUnquarantine,
  };
}

function buildPlayerHealthProps(s: TVAppState) {
  return {
    visible: s.showHealth,
    onClose: () => s.setShowHealth(false),
    embedHealth: s.embedHealth,
    blockedSources: s.blockedSources,
    quarantinedSources: s.quarantinedSources,
    onToggleBlock: s.handleToggleBlock,
    onUnquarantine: s.handleUnquarantine,
    catalog: s.catalog,
  };
}

function buildControlState(s: TVAppState): RailState {
  return {
    stationName: s.config.name,
    currentVideo: s.currentVideo,
    paused: s.paused,
    muted: s.muted,
    hasHistory: s.hasHistory,
    queueCount: s.queueCount,
    status: s.status || undefined,
    hideWatched: s.hideWatched,
    watchLaterActive: s.currentVideo ? s.watchLaterIds.has(s.currentVideo.id) : false,
    savedForPlayback: s.currentVideo ? s.savedForPlaybackIds.has(s.currentVideo.id) : false,
    guideOpen: s.showGuide,
    isSmartMix: s.isSmartMix,
    smartMixReason: s.smartMixReason,
    nextVideoPreview: s.nextVideoPreview,
    copied: s.copied,
    smartMixFavorite: s.currentVideo
      ? s.smartMixProfile.favorites.includes(s.currentVideo.id)
      : false,
    smartMixDisliked: s.currentVideo
      ? s.smartMixProfile.dislikes.includes(s.currentVideo.id)
      : false,
  };
}

function buildControlActions(s: TVAppState): RailActions {
  return {
    onBack: s.handleBackToLobby,
    onPlayPause: s.handlePlayPause,
    onPrev: s.playPrev,
    onNext: () => s.playNext(),
    onSearch: () => s.setSearchOpen(true),
    onToggleWatchLater: () => {
      if (s.currentVideo) s.toggleWatchLaterId(s.currentVideo.id);
    },
    onToggleGuide: () => s.setShowGuide((g) => !g),
    onToggleMute: s.handleToggleMute,
    onToggleHideWatched: () => s.setHideWatched((h) => !h),
    onToggleSavedForPlayback: s.toggleSavedForPlayback,
    onCopyLink: s.handleCopyLink,
    onFullscreen: s.toggleFullscreen,
    onOpenHealth: () => s.setShowHealth(true),
    onOpenShortcuts: () => s.setShowShortcuts(true),
    onSmartMixFavorite: () => s.updateSmartPreference('favorite'),
    onSmartMixDislike: () => s.updateSmartPreference('dislike'),
    onSmartMixExport: s.handleSmartMixExport,
    onSmartMixImport: s.handleSmartMixImport,
    onSmartMixReset: s.handleSmartMixReset,
  };
}

export default function TVApp({ initialChannel }: { initialChannel?: string }) {
  const s = useTVAppState({ initialChannel });

  if (s.mode === 'lobby') {
    return (
      <LobbyView
        config={s.config}
        activeSources={s.activeSources}
        setActiveSources={s.setActiveSources}
        catalog={s.catalog}
        allVideos={s.allVideos}
        unwatchedCount={s.unwatchedCount}
        catalogLoaded={s.catalogLoaded}
        catalogFreshness={s.catalogFreshness}
        visiblePlaybackDiagnostic={s.visiblePlaybackDiagnostic}
        catalogRefreshing={s.catalogRefreshing}
        bannerActions={buildBannerActions(s)}
        categories={s.categories}
        activeCategory={s.activeCategory}
        setActiveCategory={s.setActiveCategory}
        startPlaying={s.startPlaying}
        setSearchOpen={s.setSearchOpen}
        embedHealth={s.embedHealth}
        quarantinedSources={s.quarantinedSources}
        searchProps={buildSearchProps(s)}
        healthProps={buildHealthProps(s)}
      />
    );
  }

  return (
    <PlayerView
      currentVideo={s.currentVideo}
      playerRef={s.playerRef}
      playerCallbacks={{
        onEnded: s.playNext,
        onError: s.handleError,
        onReady: s.handlePlayerReady,
        onPlay: s.handlePlayerPlay,
        onPause: () => s.setPaused(true),
      }}
      status={s.status}
      catalogLoaded={s.catalogLoaded}
      visiblePlaybackDiagnostic={s.visiblePlaybackDiagnostic}
      catalogRefreshing={s.catalogRefreshing}
      bannerActions={buildBannerActions(s)}
      controlState={buildControlState(s)}
      controlActions={buildControlActions(s)}
      searchProps={buildSearchProps(s)}
      healthProps={buildPlayerHealthProps(s)}
      showGuide={s.showGuide}
      setShowGuide={s.setShowGuide}
      setShowHealth={s.setShowHealth}
      showShortcuts={s.showShortcuts}
      setShowShortcuts={s.setShowShortcuts}
      activeStation={s.activeStation}
      switchToStation={s.switchToStation}
      totalCatalogVideos={s.totalCatalogVideos}
      catalog={s.catalog}
      catalogSummary={s.catalogSummary}
    />
  );
}
