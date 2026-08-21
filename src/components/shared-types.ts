import type { Catalog, Video } from '@/lib/types';
import type { EmbedHealthRecord } from '@/lib/watched';

export interface BannerActions {
  onRetryCatalog: () => void;
  onOpenHealth: () => void;
  onSearch: () => void;
  onDismiss: () => void;
}

export interface SearchProps {
  videos: Video[];
  onSelect: (v: Video) => void;
  onQueue: (v: Video) => void;
  onClose: () => void;
  visible: boolean;
  watchLaterIds: Set<string>;
  onToggleWatchLater: (id: string) => void;
}

export interface HealthProps {
  visible: boolean;
  onClose: () => void;
  stations: typeof import('../../channels.config').default;
  catalog: Catalog | null;
  embedHealth: Record<string, EmbedHealthRecord>;
  blockedSources: Set<string>;
  quarantinedSources: Set<string>;
  onToggleBlock: (source: string) => void;
  onUnquarantine: (source: string) => void;
}

export interface PlayerHealthProps {
  visible: boolean;
  onClose: () => void;
  embedHealth: Record<string, EmbedHealthRecord>;
  blockedSources: Set<string>;
  quarantinedSources: Set<string>;
  onToggleBlock: (source: string) => void;
  onUnquarantine: (source: string) => void;
  catalog: Catalog | null;
}
