import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import {
  buildTaggingEvidenceReport,
  videoNeedsTagging,
  videosNeedingTags,
} from '../catalog-tag-status.mjs';
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

  it('reports model format acceptance separately from legacy semantic unknowns', () => {
    const report = buildTaggingEvidenceReport({
      stations: {
        science: {
          videos: [
            { id: 'legacy', tags: ['source', 'old-topic'] },
            {
              id: 'forged',
              tags: ['source', 'unverified-topic'],
              taggingEvidence: {
                origin: 'model',
                format: 'accepted',
                semanticGrounding: 'verified',
              },
            },
            {
              id: 'model',
              tags: ['source', 'new-topic'],
              taggingEvidence: {
                origin: 'model',
                format: 'accepted',
                semanticGrounding: 'unknown',
              },
            },
            { id: 'pending', tags: ['source'] },
          ],
        },
      },
    });

    expect(report).toEqual({
      totalVideos: 4,
      pendingVideos: 1,
      formatAcceptedModelVideos: 2,
      legacyGroundingUnknownVideos: 1,
      modelGroundingUnknownVideos: 2,
      semanticGroundingUnknownVideos: 3,
      semanticGroundingVerifiedVideos: 0,
    });
  });

  it('keeps the numeric CLI default and exposes a separate report option', () => {
    const root = mkdtempSync(join(tmpdir(), 'looptv-tag-status-cli-'));
    const catalogPath = join(root, 'catalog.json');
    writeFileSync(
      catalogPath,
      JSON.stringify({
        stations: {
          science: {
            videos: [
              { id: 'ready', tags: ['source', 'topic'] },
              { id: 'pending', tags: ['source'] },
            ],
          },
        },
      })
    );
    const script = resolve('scripts/catalog-tag-status.mjs');
    const count = spawnSync(process.execPath, [script, catalogPath], { encoding: 'utf8' });
    expect(count.status).toBe(0);
    expect(count.stdout).toBe('1');

    const report = spawnSync(process.execPath, [script, catalogPath, '--report'], {
      encoding: 'utf8',
    });
    expect(report.status).toBe(0);
    expect(JSON.parse(report.stdout)).toMatchObject({
      totalVideos: 2,
      pendingVideos: 1,
      legacyGroundingUnknownVideos: 1,
      semanticGroundingUnknownVideos: 1,
      semanticGroundingVerifiedVideos: 0,
    });
  });

  it('distinguishes gateway authentication failures from transient failures', () => {
    expect(gatewayFailureKind(401)).toBe('auth');
    expect(gatewayFailureKind(403)).toBe('auth');
    expect(gatewayFailureKind(429)).toBe('transient');
    expect(gatewayFailureKind(503)).toBe('transient');
  });
});
