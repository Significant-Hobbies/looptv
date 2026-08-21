import { useState, useCallback, useEffect, useRef } from 'react';
import type { Catalog, CatalogSummary } from '@/lib/types';
import {
  loadCatalog,
  loadCatalogSummary,
  refreshCatalog,
  refreshCatalogSummary,
  isNewCatalogVersion,
} from '@/lib/catalog';
import bundledCatalogSummary from '../../public/catalog-summary.json';

const INITIAL_CATALOG_SUMMARY = bundledCatalogSummary as CatalogSummary;

interface CatalogManagerOptions {
  setStatus: (status: string) => void;
}

interface FetchFns {
  setCatalog: (c: Catalog | null) => void;
  setCatalogSummary: (s: CatalogSummary | null) => void;
  setCatalogLoadFailed: (v: boolean) => void;
  setStatus: (s: string) => void;
}

function runFetchCatalog({
  setCatalog,
  setCatalogSummary,
  setCatalogLoadFailed,
  setStatus,
}: FetchFns) {
  loadCatalogSummary()
    .then((summary) => {
      setCatalogSummary(summary);
      setCatalogLoadFailed(false);
    })
    .catch(() => {});
  loadCatalog()
    .then((c) => {
      setCatalog(c);
      setStatus('');
      setCatalogLoadFailed(false);
    })
    .catch((err) => {
      console.error('TVApp: catalog load failed after retries', err);
      setCatalogLoadFailed(true);
      const isDev =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      setStatus(
        isDev
          ? 'No catalog found. Run: pnpm run build:catalog'
          : "Catalog couldn't load. Retry when you're back online."
      );
    });
}

export function useCatalogManager({ setStatus }: CatalogManagerOptions) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogSummary, setCatalogSummary] = useState<CatalogSummary | null>(
    INITIAL_CATALOG_SUMMARY
  );
  const [catalogLoadFailed, setCatalogLoadFailed] = useState(false);
  const [catalogRefreshing, setCatalogRefreshing] = useState(false);
  const catalogVersionRef = useRef<string | null>(INITIAL_CATALOG_SUMMARY.generatedAt ?? null);
  const catalogUpdateCheckRef = useRef(false);

  const fetchCatalog = useCallback(
    () => runFetchCatalog({ setCatalog, setCatalogSummary, setCatalogLoadFailed, setStatus }),
    [setStatus]
  );

  const refreshCatalogState = useCallback(async () => {
    if (catalogRefreshing) return;
    setCatalogRefreshing(true);
    try {
      const [summary, nextCatalog] = await Promise.all([refreshCatalogSummary(), refreshCatalog()]);
      setCatalogSummary(summary);
      setCatalog(nextCatalog);
      setCatalogLoadFailed(false);
      setStatus('');
    } catch (err) {
      console.error('TVApp: catalog refresh failed', err);
      setCatalogLoadFailed(true);
      setStatus("Catalog couldn't load. Retry when you're back online.");
    } finally {
      setCatalogRefreshing(false);
    }
  }, [catalogRefreshing, setStatus]);

  useEffect(() => {
    catalogVersionRef.current = catalog?.generatedAt ?? catalogSummary?.generatedAt ?? null;
  }, [catalog?.generatedAt, catalogSummary?.generatedAt]);

  const checkForCatalogUpdate = useCallback(async () => {
    if (catalogUpdateCheckRef.current) return;
    catalogUpdateCheckRef.current = true;
    try {
      const summary = await refreshCatalogSummary();
      const changed = isNewCatalogVersion(catalogVersionRef.current, summary.generatedAt);
      setCatalogSummary(summary);
      if (!changed) return;
      const nextCatalog = await refreshCatalog();
      setCatalog(nextCatalog);
      setCatalogLoadFailed(false);
      setStatus('');
    } catch (err) {
      console.error('TVApp: catalog update check failed', err);
    } finally {
      catalogUpdateCheckRef.current = false;
    }
  }, [setStatus]);

  useEffect(() => {
    const onFocus = () => void checkForCatalogUpdate();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkForCatalogUpdate();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [checkForCatalogUpdate]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return { catalog, catalogSummary, catalogLoadFailed, catalogRefreshing, refreshCatalogState };
}
