export function videoNeedsTagging(video: { description?: unknown; tags?: unknown }): boolean;
export function videosNeedingTags(catalog: {
  stations?: Record<string, { videos?: Array<Record<string, unknown>> }>;
}): Array<{ stationId: string; video: Record<string, unknown> }>;

export function buildTaggingEvidenceReport(catalog: {
  stations?: Record<string, { videos?: Array<Record<string, unknown>> }>;
}): {
  totalVideos: number;
  pendingVideos: number;
  formatAcceptedModelVideos: number;
  legacyGroundingUnknownVideos: number;
  modelGroundingUnknownVideos: number;
  semanticGroundingUnknownVideos: number;
  semanticGroundingVerifiedVideos: number;
};
