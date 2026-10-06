import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function videoNeedsTagging(video) {
  return Boolean(video.description || !Array.isArray(video.tags) || video.tags.length <= 1);
}

export function videosNeedingTags(catalog) {
  const pending = [];
  for (const [stationId, station] of Object.entries(catalog.stations || {})) {
    for (const video of station.videos || []) {
      if (videoNeedsTagging(video)) pending.push({ stationId, video });
    }
  }
  return pending;
}

export function buildTaggingEvidenceReport(catalog) {
  const videos = Object.values(catalog.stations || {}).flatMap((station) => station.videos || []);
  const tagged = videos.filter((video) => Array.isArray(video.tags) && video.tags.length > 1);
  const modelAccepted = tagged.filter(
    (video) =>
      video.taggingEvidence?.origin === 'model' && video.taggingEvidence?.format === 'accepted'
  );
  const legacyUnknown = tagged.filter((video) => !video.taggingEvidence);

  return {
    totalVideos: videos.length,
    pendingVideos: videosNeedingTags(catalog).length,
    formatAcceptedModelVideos: modelAccepted.length,
    legacyGroundingUnknownVideos: legacyUnknown.length,
    modelGroundingUnknownVideos: modelAccepted.length,
    // No semantic-grounding verifier exists; accepted model output remains unknown.
    semanticGroundingUnknownVideos: tagged.length,
    semanticGroundingVerifiedVideos: 0,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const report = args.includes('--report');
  const catalogPath = args.find((arg) => arg !== '--report') || 'public/catalog.json';
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  if (report) {
    process.stdout.write(JSON.stringify(buildTaggingEvidenceReport(catalog)));
  } else {
    process.stdout.write(String(videosNeedingTags(catalog).length));
  }
}
