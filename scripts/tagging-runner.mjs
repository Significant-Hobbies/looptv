import { videosNeedingTags } from './catalog-tag-status.mjs';
import { normalizeBatchTags } from './tag-result.mjs';
import { buildUserPrompt, createStationBatches, getSystemPrompt } from './tagging-prompts.mjs';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffleBatches(batches, random = Math.random) {
  for (let i = batches.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [batches[i], batches[j]] = [batches[j], batches[i]];
  }
  return batches;
}

async function callBatchWithRetries(batch, model, requestBatch, requestRetries, sleepFn) {
  for (let attempt = 0; attempt <= requestRetries; attempt++) {
    try {
      const rawTags = await requestBatch({
        model,
        stationId: batch.stationId,
        videos: batch.videos,
        systemPrompt: getSystemPrompt(batch.stationId),
        prompt: buildUserPrompt(batch.videos),
      });
      return normalizeBatchTags(batch.videos, rawTags);
    } catch {
      if (attempt < requestRetries) await sleepFn(2000);
    }
  }
  return null;
}

/**
 * Production tag queue with an injected request boundary for deterministic tests.
 * requestBatch returns the raw JSON-decoded tag arrays from one model request.
 */
export async function runTagging({
  catalog,
  models,
  requestBatch,
  batchSize = 15,
  concurrencyPerModel = 2,
  maxBatchAttempts = Math.max(2, models.length * 2),
  requestRetries = 2,
  sleepFn = delay,
  random = Math.random,
  shuffle = true,
  onProgress = () => {},
}) {
  if (!Array.isArray(models) || models.length === 0) {
    throw new Error('At least one tagging model is required');
  }
  if (typeof requestBatch !== 'function') {
    throw new Error('A batch request function is required');
  }

  const pending = videosNeedingTags(catalog);
  const pendingIds = new Set(pending.map(({ video }) => video.id));
  const batches = createStationBatches(pending, batchSize);
  if (shuffle) shuffleBatches(batches, random);

  const results = new Map();
  const failedIds = new Set();
  const stats = { retries: 0, total: pending.length };

  async function processQueue(model) {
    while (true) {
      const batch = batches.pop();
      if (!batch) return;
      batch.attempts = (batch.attempts || 0) + 1;

      const tags = await callBatchWithRetries(batch, model, requestBatch, requestRetries, sleepFn);
      if (tags) {
        for (let i = 0; i < batch.videos.length; i++) {
          results.set(batch.videos[i].id, tags[i]);
          failedIds.delete(batch.videos[i].id);
        }
      } else {
        stats.retries += 1;
        if (batch.attempts >= maxBatchAttempts) {
          for (const video of batch.videos) failedIds.add(video.id);
        } else {
          batches.unshift(batch);
        }
      }

      const processed = results.size + failedIds.size;
      if (processed % 100 < batchSize || batches.length === 0) {
        onProgress({
          success: results.size,
          total: stats.total,
          queuedBatches: batches.length,
          retries: stats.retries,
        });
      }
      await sleepFn(3200);
    }
  }

  const workers = [];
  for (const model of models) {
    for (let i = 0; i < concurrencyPerModel; i++) workers.push(processQueue(model));
  }
  await Promise.all(workers);

  for (const station of Object.values(catalog.stations || {})) {
    for (const video of station.videos || []) {
      const tags = results.get(video.id);
      if (!tags) continue;
      video.tags = tags;
      video.taggingEvidence = {
        origin: 'model',
        format: 'accepted',
        semanticGrounding: 'unknown',
      };
      delete video.description;
    }
  }

  const remainingIds = new Set(videosNeedingTags(catalog).map(({ video }) => video.id));
  const unresolvedIds = [...pendingIds].filter((id) => remainingIds.has(id));
  return {
    total: pending.length,
    tagged: results.size,
    retries: stats.retries,
    failedIds: unresolvedIds.filter((id) => failedIds.has(id)),
    pendingIds: unresolvedIds,
  };
}
