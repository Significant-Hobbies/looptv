import { validateCatalogVideo } from './catalog-quality.mjs';

function validateCuratedVideo(video) {
  validateCatalogVideo(video, 'in curated config');
  const validTags =
    Array.isArray(video.tags) &&
    video.tags.every((tag) => typeof tag === 'string' && tag.trim()) &&
    new Set(video.tags).size > 1;
  let validProvenance = false;
  try {
    const url = new URL(video.provenanceUrl);
    validProvenance = ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
  } catch {}
  const validText = ['title', 'source'].every(
    (field) => typeof video[field] === 'string' && video[field].trim()
  );
  if (
    !/^[A-Za-z0-9_-]{11}$/.test(video.id) ||
    !validText ||
    !Number.isInteger(video.viewCount) ||
    !Number.isInteger(video.duration) ||
    video.duration <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(video.date) ||
    !validTags ||
    !validProvenance
  ) {
    throw new Error(`Invalid curated video ${video.id}`);
  }
}

function updateDisplacedSourceCounts(catalog, stations, stationsConfig, curatedIds) {
  const sourceMeta = { ...catalog.sourceMeta };
  for (const station of stationsConfig) {
    for (const source of station.sources) {
      const removed = (catalog.stations[station.id]?.videos || []).some(
        (video) => curatedIds.has(video.id) && !video.provenanceUrl && video.source === source.name
      );
      const handle = source.handle.replace(/^@/, '');
      if (removed && sourceMeta[handle]) {
        sourceMeta[handle] = {
          ...sourceMeta[handle],
          selectedCount: (stations[station.id]?.videos || []).filter(
            (video) => video.source === source.name && !video.provenanceUrl
          ).length,
        };
      }
    }
  }
  return sourceMeta;
}

export function mergeCuratedVideos(catalog, stationsConfig, previousCatalog = catalog) {
  const curatedIds = new Set();
  for (const station of stationsConfig) {
    for (const video of station.curatedVideos || []) {
      validateCuratedVideo(video);
      if (curatedIds.has(video.id)) throw new Error(`Duplicate curated video ${video.id}`);
      curatedIds.add(video.id);
    }
  }
  const priorVideos = new Map(
    [previousCatalog, catalog].flatMap((input) =>
      Object.values(input.stations || {}).flatMap((station) =>
        station.videos.map((video) => [video.id, video])
      )
    )
  );
  const stations = Object.fromEntries(
    Object.entries(catalog.stations).map(([id, station]) => [
      id,
      {
        ...station,
        videos: station.videos.filter((video) => !curatedIds.has(video.id)),
        categoryVideoIds: Object.fromEntries(
          Object.entries(station.categoryVideoIds || {}).map(([category, ids]) => [
            category,
            ids.filter((id) => !curatedIds.has(id)),
          ])
        ),
      },
    ])
  );
  const sourceMeta = updateDisplacedSourceCounts(catalog, stations, stationsConfig, curatedIds);
  let added = 0;
  let existing = 0;
  for (const station of stationsConfig) {
    for (const curated of station.curatedVideos || []) {
      const prior = priorVideos.get(curated.id);
      const { id, title, duration, date, tags, source, viewCount, provenanceUrl } = curated;
      const video = {
        id,
        title,
        duration,
        date,
        tags: [...new Set(tags)],
        source,
        viewCount,
        provenanceUrl,
      };
      stations[station.id] ??= { videos: [], categoryVideoIds: {} };
      stations[station.id].videos.push(video);
      if (prior) existing++;
      else added++;
    }
  }
  return {
    catalog: { ...catalog, stations, ...(catalog.sourceMeta ? { sourceMeta } : {}) },
    added,
    existing,
  };
}
