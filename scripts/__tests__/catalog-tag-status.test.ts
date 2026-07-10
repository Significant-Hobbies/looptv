import { describe, expect, it } from 'vitest';
import { videoNeedsTagging, videosNeedingTags } from '../catalog-tag-status.mjs';
import { gatewayFailureKind } from '../smoke-tag-gateway.mjs';

describe('catalog tagging status', () => {
  it('counts descriptions and source-only tags as pending', () => {
    const catalog = {
      stations: {
        science: {
          videos: [
            { id: 'ready', tags: ['source', 'physics'] },
            { id: 'description', tags: ['source', 'physics'], description: 'new' },
            { id: 'source-only', tags: ['source'] },
            { id: 'missing-tags' },
            { id: 'null-tags', tags: null },
            { id: 'invalid-tags', tags: 'source' },
          ],
        },
      },
    };

    expect(videoNeedsTagging(catalog.stations.science.videos[0])).toBe(false);
    expect(videosNeedingTags(catalog).map(({ video }) => video.id)).toEqual([
      'description',
      'source-only',
      'missing-tags',
      'null-tags',
      'invalid-tags',
    ]);
  });

  it('distinguishes gateway authentication failures from transient failures', () => {
    expect(gatewayFailureKind(401)).toBe('auth');
    expect(gatewayFailureKind(403)).toBe('auth');
    expect(gatewayFailureKind(429)).toBe('transient');
    expect(gatewayFailureKind(503)).toBe('transient');
  });
});
