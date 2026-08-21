import type { Catalog, CatalogSummary, Video } from '@/lib/types';
import type { PlayerHandle } from './Player';
import type { RailState, RailActions } from './ControlRail';
import type { BannerActions, SearchProps, PlayerHealthProps } from './shared-types';
import { SearchOverlay, HealthOverlay } from './OverlayPanels';
import Player from './Player';
import PlaybackDiagnosticsBanner from './PlaybackDiagnosticsBanner';
import ControlRail from './ControlRail';
import stations from '../../channels.config';

const SMART_MIX_ID = 'smart-mix';

const SHORTCUTS: [string, string][] = [
  ['Space', 'Play / Pause'],
  ['N / →', 'Next video'],
  ['P / ←', 'Previous video'],
  ['M', 'Mute / Unmute'],
  ['F', 'Fullscreen'],
  ['G', 'Channel guide'],
  ['H', 'Channel health'],
  ['W', 'Toggle watched filter'],
  ['/', 'Search'],
  ['?', 'This help'],
  ['Esc', 'Close overlay'],
];

interface GuideEntry {
  id: string;
  name: string;
  count: number | null;
}

function ChannelGuideRow({
  id,
  name,
  count,
  isActive,
  onClick,
}: {
  id: string;
  name: string;
  count: number | null;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      key={id}
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
    >
      <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-white/60'}`}>
        {name}
      </span>
      <span className="flex items-center gap-2">
        {count != null && <span className="text-white/25 text-xs">{count.toLocaleString()}</span>}
        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
      </span>
    </button>
  );
}

interface ChannelGuideProps {
  showGuide: boolean;
  setShowGuide: (v: boolean) => void;
  setShowHealth: (v: boolean) => void;
  activeStation: string;
  switchToStation: (id: string) => void;
  catalogInfo: {
    totalCatalogVideos: number;
    catalog: Catalog | null;
    catalogSummary: CatalogSummary | null;
  };
}

function ChannelGuide(props: ChannelGuideProps) {
  const { showGuide, setShowGuide, setShowHealth, activeStation, switchToStation, catalogInfo } =
    props;
  if (!showGuide) return null;
  const guideEntries: GuideEntry[] = [
    { id: 'all', name: 'Play All', count: catalogInfo.totalCatalogVideos },
    { id: SMART_MIX_ID, name: 'Smart Mix', count: null },
  ];
  return (
    <div className="fixed inset-0 z-[100] flex">
      <div className="absolute inset-0 bg-black/50" onClick={() => setShowGuide(false)} />
      <div className="relative flex flex-col bg-zinc-950 border-r border-white/10 w-64 overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <span className="text-white text-sm font-semibold">Channels</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowGuide(false);
                setShowHealth(true);
              }}
              className="text-white/40 hover:text-white text-xs flex items-center gap-1 hover:bg-white/10 px-2 py-1 rounded transition-colors"
              title="Channel Health (H)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Health
            </button>
            <kbd className="text-white/25 text-xs font-mono bg-white/5 px-1.5 py-0.5 rounded">
              G
            </kbd>
          </div>
        </div>
        <div className="py-1">
          {guideEntries.map((entry) => (
            <ChannelGuideRow
              key={entry.id}
              id={entry.id}
              name={entry.name}
              count={entry.count}
              isActive={activeStation === entry.id}
              onClick={() => switchToStation(entry.id)}
            />
          ))}
          <div className="h-px bg-white/5 mx-4 my-1" />
          {stations.map((st) => {
            const count =
              catalogInfo.catalog?.stations?.[st.id]?.videos?.length ??
              catalogInfo.catalogSummary?.stations?.[st.id]?.videoCount ??
              0;
            return (
              <ChannelGuideRow
                key={st.id}
                id={st.id}
                name={st.name}
                count={count > 0 ? count : null}
                isActive={activeStation === st.id}
                onClick={() => switchToStation(st.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ShortcutsHelp({
  showShortcuts,
  setShowShortcuts,
}: {
  showShortcuts: boolean;
  setShowShortcuts: (v: boolean) => void;
}) {
  if (!showShortcuts) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => setShowShortcuts(false)}
      />
      <div className="relative bg-zinc-900 rounded-xl border border-white/10 p-6 max-w-sm w-full mx-4">
        <h2 className="text-white text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
        <div className="space-y-2 text-sm">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-white/50">{desc}</span>
              <kbd className="bg-white/10 text-white/70 px-2 py-0.5 rounded text-xs font-mono">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export interface PlayerViewProps {
  currentVideo: Video | null;
  playerRef: React.RefObject<PlayerHandle | null>;
  playerCallbacks: {
    onEnded: () => void;
    onError: (code: number) => void;
    onReady: () => void;
    onPlay: () => void;
    onPause: () => void;
  };
  status: string;
  catalogLoaded: boolean;
  visiblePlaybackDiagnostic: ReturnType<
    typeof import('@/lib/playback-diagnostics').derivePlaybackDiagnostic
  > | null;
  catalogRefreshing: boolean;
  bannerActions: BannerActions;
  controlState: RailState;
  controlActions: RailActions;
  searchProps: SearchProps;
  healthProps: PlayerHealthProps;
  showGuide: boolean;
  setShowGuide: (v: boolean) => void;
  setShowHealth: (v: boolean) => void;
  showShortcuts: boolean;
  setShowShortcuts: (v: boolean) => void;
  activeStation: string;
  switchToStation: (id: string) => void;
  totalCatalogVideos: number;
  catalog: Catalog | null;
  catalogSummary: CatalogSummary | null;
}

export default function PlayerView(props: PlayerViewProps) {
  const {
    currentVideo,
    playerRef,
    playerCallbacks,
    status,
    catalogLoaded,
    visiblePlaybackDiagnostic,
    catalogRefreshing,
    bannerActions,
    controlState,
    controlActions,
    searchProps,
    healthProps,
    showGuide,
    setShowGuide,
    setShowHealth,
    showShortcuts,
    setShowShortcuts,
    activeStation,
    switchToStation,
    totalCatalogVideos,
    catalog,
    catalogSummary,
  } = props;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <div className="relative flex-1 min-h-0">
        {currentVideo && (
          <Player
            ref={playerRef}
            videoId={currentVideo.id}
            source={currentVideo.source}
            callbacks={playerCallbacks}
          />
        )}
        {!currentVideo && (
          <div className="absolute inset-0 bg-black flex items-center justify-center px-6">
            <div className="text-center max-w-sm">
              <p className="text-white text-base font-medium mb-2">
                {status || (catalogLoaded ? 'No playable video selected' : 'Loading channel...')}
              </p>
              <p className="text-white/45 text-sm">
                {catalogLoaded
                  ? 'Try another channel or search the catalog for something playable.'
                  : 'The catalog is loading before playback can start.'}
              </p>
            </div>
          </div>
        )}
        {visiblePlaybackDiagnostic && (
          <PlaybackDiagnosticsBanner
            diagnostic={visiblePlaybackDiagnostic}
            refreshing={catalogRefreshing}
            actions={bannerActions}
          />
        )}
      </div>

      <ControlRail state={controlState} actions={controlActions} />

      <SearchOverlay searchProps={searchProps} />

      <ChannelGuide
        showGuide={showGuide}
        setShowGuide={setShowGuide}
        setShowHealth={setShowHealth}
        activeStation={activeStation}
        switchToStation={switchToStation}
        catalogInfo={{ totalCatalogVideos, catalog, catalogSummary }}
      />

      <ShortcutsHelp showShortcuts={showShortcuts} setShowShortcuts={setShowShortcuts} />

      <HealthOverlay healthProps={healthProps} stations={stations} />
    </div>
  );
}
