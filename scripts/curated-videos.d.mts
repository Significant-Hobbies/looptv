import type { Catalog, StationConfig } from '../src/lib/types';

export function mergeCuratedVideos(
  catalog: Catalog,
  stationsConfig: StationConfig[],
  previousCatalog?: Catalog
): { catalog: Catalog; added: number; existing: number };
