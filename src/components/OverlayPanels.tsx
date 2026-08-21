import type { SearchProps, HealthProps, PlayerHealthProps } from './shared-types';
import Search from './Search';
import ChannelHealth from './ChannelHealth';

interface SearchOverlayProps {
  searchProps: SearchProps;
}

export function SearchOverlay({ searchProps }: SearchOverlayProps) {
  return (
    <Search
      videos={searchProps.videos}
      onSelect={searchProps.onSelect}
      onQueue={searchProps.onQueue}
      onClose={searchProps.onClose}
      visible={searchProps.visible}
      watchLater={{
        ids: searchProps.watchLaterIds,
        onToggle: searchProps.onToggleWatchLater,
      }}
    />
  );
}

interface HealthOverlayProps {
  healthProps: HealthProps | PlayerHealthProps;
  stations: typeof import('../../channels.config').default;
}

export function HealthOverlay({ healthProps, stations }: HealthOverlayProps) {
  return (
    <ChannelHealth
      visible={healthProps.visible}
      onClose={healthProps.onClose}
      stations={stations}
      catalog={healthProps.catalog}
      healthData={{
        embedHealth: healthProps.embedHealth,
        blockedSources: healthProps.blockedSources,
        quarantinedSources: healthProps.quarantinedSources,
      }}
      actions={{
        onToggleBlock: healthProps.onToggleBlock,
        onUnquarantine: healthProps.onUnquarantine,
      }}
    />
  );
}
