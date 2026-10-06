// Tag videos through an explicitly configured free-provider/local endpoint.
// Usage: node scripts/tag-videos.mjs [catalog_path]

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTaggingEvidenceReport, videosNeedingTags } from './catalog-tag-status.mjs';
import { createStationBatches, getTaggingProfileId } from './tagging-prompts.mjs';
import { runTagging } from './tagging-runner.mjs';

const CATALOG_PATH = process.argv[2] || 'public/catalog.json';
const AI_BASE_URL = process.env.AI_BASE_URL?.replace(/\/+$/, '');
const AI_API_KEY = process.env.AI_API_KEY;
const AI_PROJECT_ID = process.env.AI_PROJECT_ID || 'looptv';
const BATCH_SIZE = 15;
const CONCURRENCY_PER_MODEL = 2;

const MODELS = (process.env.AI_MODELS || process.env.AI_MODEL || '')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);
const MAX_BATCH_ATTEMPTS = Math.max(2, MODELS.length * 2);
const JSON_ARRAY_RE = /\[[\s\S]*\]/;

async function requestBatch({ model, systemPrompt, prompt }) {
  const provider = createOpenAICompatible({
    name: 'looptv-direct',
    baseURL: AI_BASE_URL,
    apiKey: AI_API_KEY,
    headers: { 'X-Gateway-Project-Id': AI_PROJECT_ID },
  });
  const result = await generateText({
    model: provider.chatModel(model),
    system: systemPrompt,
    prompt,
    temperature: 0.1,
    maxRetries: 0,
  });
  const match = result.text.match(JSON_ARRAY_RE);
  if (!match) throw new Error('No JSON array in response');
  return JSON.parse(match[0]);
}

function summarizeProfiles(items) {
  const counts = new Map();
  for (const item of items) {
    const profileId = getTaggingProfileId(item.stationId);
    counts.set(profileId, (counts.get(profileId) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([profileId, count]) => `${profileId}=${count}`)
    .join(', ');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!AI_BASE_URL || !AI_API_KEY || MODELS.length === 0) {
    throw new Error('AI_BASE_URL, AI_API_KEY, and AI_MODEL or AI_MODELS are required');
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  const needsTagging = videosNeedingTags(catalog);

  console.log(`Videos needing tags: ${needsTagging.length}`);
  console.log(`Profiles: ${summarizeProfiles(needsTagging)}`);
  console.log(`Endpoint: ${new URL(AI_BASE_URL).host}`);
  console.log(`Models: ${MODELS.length}`);
  console.log(
    `Batch size: ${BATCH_SIZE}, Concurrency: ${MODELS.length * CONCURRENCY_PER_MODEL} workers`
  );
  console.log(`Max attempts per batch: ${MAX_BATCH_ATTEMPTS}`);
  console.log(
    JSON.stringify({
      event: 'tagging-evidence-before',
      report: buildTaggingEvidenceReport(catalog),
    })
  );

  if (needsTagging.length === 0) {
    console.log('Nothing to tag!');
    return;
  }

  const batchCount = createStationBatches(needsTagging, BATCH_SIZE).length;
  console.log(`Batches: ${batchCount}`);
  console.log(
    `Estimated time: ~${Math.ceil((batchCount / (MODELS.length * CONCURRENCY_PER_MODEL) * 3.5) / 60)} minutes\n`
  );

  const startTime = Date.now();
  const result = await runTagging({
    catalog,
    models: MODELS,
    requestBatch,
    batchSize: BATCH_SIZE,
    concurrencyPerModel: CONCURRENCY_PER_MODEL,
    maxBatchAttempts: MAX_BATCH_ATTEMPTS,
    sleepFn: sleep,
    onProgress: ({ success, total, queuedBatches, retries }) => {
      const pct = total === 0 ? 100 : Math.round((success / total) * 100);
      process.stdout.write(
        `\r  Tagged: ${success}/${total} (${pct}%) | Queue: ${queuedBatches} | Retries: ${retries}`
      );
    },
  });

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n\nDone in ${elapsed}s. Tagged ${result.tagged}/${result.total} videos.`);

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog));
  const sizeKB = Math.round(fs.statSync(CATALOG_PATH).size / 1024);
  console.log(`Output: ${CATALOG_PATH} (${sizeKB}KB)`);
  console.log(
    JSON.stringify({
      event: 'tagging-evidence-after',
      report: buildTaggingEvidenceReport(catalog),
      failedVideoIds: result.failedIds,
      pendingVideoIds: result.pendingIds,
    })
  );

  if (result.failedIds.length > 0 || result.pendingIds.length > 0) {
    console.error(
      `Warning: ${result.failedIds.length} videos failed tagging after retries; ${result.pendingIds.length} videos remain pending.`
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
