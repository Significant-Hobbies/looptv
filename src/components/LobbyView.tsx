import type { Dispatch, SetStateAction } from 'react';
import type { Catalog, Video } from '@/lib/types';
import { getSourceFreshness } from '@/lib/catalog';
import { isEmbedUnhealthy, getEmbedBlockRate } from '@/lib/source-health';
import Link from './AppLink';
import { SearchOverlay, HealthOverlay } from './OverlayPanels';
import type { BannerActions, SearchProps, HealthProps } from './shared-types';
import PlaybackDiagnosticsBanner from './PlaybackDiagnosticsBanner';

interface StationConfig {
  id: string;
  name: string;
  description: string;
  sources: { name: string; handle: string }[];
}

export interface LobbyViewProps {
  config: StationConfig;
  activeSources: Set<string> | null;
  setActiveSources: Dispatch<SetStateAction<Set<string> | null>>;
  catalog: Catalog | null;
  allVideos: Video[];
  unwatchedCount: number;
  catalogLoaded: boolean;
  catalogFreshness: { state: string; label: string };
  visiblePlaybackDiagnostic: ReturnType<
    typeof import('@/lib/playback-diagnostics').derivePlaybackDiagnostic
  > | null;
  catalogRefreshing: boolean;
  bannerActions: BannerActions;
  categories: { id: string; name: string }[];
  activeCategory: string;
  setActiveCategory: (id: string) => void;
  startPlaying: () => void;
  setSearchOpen: (v: boolean) => void;
  embedHealth: Record<string, EmbedHealthRecord>;
  quarantinedSources: Set<string>;
  searchProps: SearchProps;
  healthProps: HealthProps;
}

interface SourceChipStatus {
  isActive: boolean;
  isStale: boolean;
  isQuarantined: boolean;
  isUnhealthy: boolean;
}

interface SourceChipProps {
  source: { name: string; handle: string };
  status: SourceChipStatus;
  title: string | undefined;
  onClick: () => void;
}

function SourceChip(props: SourceChipProps) {
  const { source, status, title, onClick } = props;
  return (
    <button
      key={source.handle}
      title={title}
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs transition-colors flex items-center gap-1 ${
        status.isActive ? 'bg-white/15 text-white/70' : 'bg-white/5 text-white/20 line-through'
      }`}
    >
      {source.name}
      {status.isStale && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400/80 shrink-0"
          aria-label="stale"
        />
      )}
      {status.isQuarantined && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/80 shrink-0"
          aria-label="quarantined"
        />
      )}
      {status.isUnhealthy && !status.isQuarantined && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400/80 shrink-0"
          aria-label="embed issues"
        />
      )}
    </button>
  );
}

function buildSourceChipTitle(
  freshnessState: string,
  freshnessLabel: string,
  isQuarantined: boolean,
  isUnhealthy: boolean,
  blockRate: number | null
): string | undefined {
  return (
    [
      freshnessState !== 'unknown' ? freshnessLabel : null,
      isQuarantined ? 'Auto-quarantined for embed failures' : null,
      isUnhealthy && blockRate !== null ? `${Math.round(blockRate * 100)}% embed blocks` : null,
    ]
      .filter(Boolean)
      .join(' · ') || undefined
  );
}

function SourceChips({
  config,
  activeSources,
  setActiveSources,
  catalog,
  embedHealth,
  quarantinedSources,
}: {
  config: StationConfig;
  activeSources: Set<string> | null;
  setActiveSources: Dispatch<SetStateAction<Set<string> | null>>;
  catalog: Catalog | null;
  embedHealth: Record<string, EmbedHealthRecord>;
  quarantinedSources: Set<string>;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5 mb-3 max-w-xl">
      {config.sources.map((s) => {
        const isActive = !activeSources || activeSources.has(s.name);
        const handle = s.handle.replace('@', '');
        const meta = catalog?.sourceMeta?.[handle];
        const freshness = getSourceFreshness(meta);
        const isStale = freshness.state === 'stale';
        const health = embedHealth[s.name];
        const isUnhealthy = isEmbedUnhealthy(health);
        const blockRate = getEmbedBlockRate(health);
        const isQuarantined = quarantinedSources.has(s.name);
        const title = buildSourceChipTitle(
          freshness.state,
          freshness.label,
          isQuarantined,
          isUnhealthy,
          blockRate
        );
        return (
          <SourceChip
            key={s.handle}
            source={s}
            status={{ isActive, isStale, isQuarantined, isUnhealthy }}
            title={title}
            onClick={() => {
              setActiveSources((prev) => {
                const allNames = new Set(config.sources.map((src) => src.name));
                if (!prev) {
                  allNames.delete(s.name);
                  return allNames;
                }
                const next = new Set(prev);
                if (next.has(s.name)) {
                  next.delete(s.name);
                  return next.size === 0 ? null : next;
                }
                next.add(s.name);
                return next.size === allNames.size ? null : next;
              });
            }}
          />
        );
      })}
    </div>
  );
}

function LobbyHeader(props: LobbyViewProps) {
  const {
    config,
    activeSources,
    setActiveSources,
    catalog,
    allVideos,
    unwatchedCount,
    catalogLoaded,
    catalogFreshness,
    visiblePlaybackDiagnostic,
    embedHealth,
    quarantinedSources,
  } = props;
  return (
    <div className="text-center mb-8">
      <h1 className="text-white text-4xl font-bold tracking-tight mb-2">{config.name}</h1>
      {config.sources.length > 1 && (
        <SourceChips
          config={config}
          activeSources={activeSources}
          setActiveSources={setActiveSources}
          catalog={catalog}
          embedHealth={embedHealth}
          quarantinedSources={quarantinedSources}
        />
      )}
      <p className="text-white/40 text-sm">
        {allVideos.length > 0
          ? `${unwatchedCount.toLocaleString()} unwatched of ${allVideos.length.toLocaleString()}`
          : catalogLoaded
            ? 'No videos'
            : 'Loading...'}
      </p>
      {!visiblePlaybackDiagnostic && catalogFreshness.state !== 'loading' && (
        <p className="text-xs mt-2 text-white/25">{catalogFreshness.label}</p>
      )}
    </div>
  );
}

function CategoryBar({
  categories,
  activeCategory,
  setActiveCategory,
}: {
  categories: LobbyViewProps['categories'];
  activeCategory: string;
  setActiveCategory: LobbyViewProps['setActiveCategory'];
}) {
  if (categories.length <= 1) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-2xl">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => setActiveCategory(cat.id)}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            cat.id === activeCategory
              ? 'bg-white text-black font-medium'
              : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

function LobbyActions({
  allVideos,
  startPlaying,
  setSearchOpen,
}: {
  allVideos: LobbyViewProps['allVideos'];
  startPlaying: LobbyViewProps['startPlaying'];
  setSearchOpen: LobbyViewProps['setSearchOpen'];
}) {
  return (
    <>
      <div className="flex items-center gap-4">
        <button
          onClick={startPlaying}
          disabled={allVideos.length === 0}
          className="bg-red-600 hover:bg-red-500 disabled:bg-white/10 disabled:text-white/30 text-white text-lg font-semibold px-8 py-3.5 rounded-xl transition-colors flex items-center gap-3"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Play
        </button>
        <button
          onClick={() => setSearchOpen(true)}
          disabled={allVideos.length === 0}
          className="bg-white/10 hover:bg-white/15 disabled:opacity-30 text-white text-lg px-6 py-3.5 rounded-xl transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          Search
        </button>
      </div>
      <div className="text-white/20 text-xs text-center mt-10">
        <kbd className="bg-white/5 px-1.5 py-0.5 rounded">Space</kbd> Play &nbsp;&middot;&nbsp;
        <kbd className="bg-white/5 px-1.5 py-0.5 rounded">/</kbd> Search
      </div>
    </>
  );
}

export default function LobbyView(props: LobbyViewProps) {
  const {
    allVideos,
    visiblePlaybackDiagnostic,
    catalogRefreshing,
    bannerActions,
    categories,
    activeCategory,
    setActiveCategory,
    startPlaying,
    setSearchOpen,
    searchProps,
    healthProps,
  } = props;

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6">
      <Link
        href="/"
        className="absolute top-6 left-6 text-white/30 hover:text-white/60 transition-colors text-sm flex items-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All channels
      </Link>

      <LobbyHeader {...props} />

      {visiblePlaybackDiagnostic && (
        <div className="mb-6 w-full max-w-xl">
          <PlaybackDiagnosticsBanner
            diagnostic={visiblePlaybackDiagnostic}
            refreshing={catalogRefreshing}
            variant="inline"
            actions={bannerActions}
          />
        </div>
      )}

      <CategoryBar
        categories={categories}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
      />

      <LobbyActions
        allVideos={allVideos}
        startPlaying={startPlaying}
        setSearchOpen={setSearchOpen}
      />

      <SearchOverlay searchProps={searchProps} />
      <HealthOverlay healthProps={healthProps} stations={healthProps.stations} />
    </div>
  );
}
