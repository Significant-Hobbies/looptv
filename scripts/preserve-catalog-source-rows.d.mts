export function parseJsonl(contents: string): Array<Record<string, unknown>>;
export function preserveCatalogSourceRows(
  dataDir: string,
  stations: Array<{ id: string; sources: Array<Record<string, unknown>> }>,
  catalog: Record<string, unknown>,
  filesystem?: Record<string, unknown>
): number;
