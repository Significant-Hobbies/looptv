// Tag videos through an explicitly configured free-provider/local endpoint.
// Usage: node scripts/tag-videos.mjs [catalog_path]

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import fs from 'node:fs';
import { videosNeedingTags } from './catalog-tag-status.mjs';
import {
  buildUserPrompt,
  createStationBatches,
  getSystemPrompt,
  getTaggingProfileId,
} from './tagging-prompts.mjs';
import { normalizeBatchTags } from './tag-result.mjs';

const CATALOG_PATH = process.argv[2] || 'public/catalog.json';
const AI_BASE_URL = process.env.AI_BASE_URL?.replace(/\/+$/, '');
const AI_API_KEY = process.env.AI_API_KEY;
const BATCH_SIZE = 15;
const CONCURRENCY_PER_MODEL = 2;

const MODELS = (process.env.AI_MODELS || process.env.AI_MODEL || '')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);
const MAX_BATCH_ATTEMPTS = Math.max(2, MODELS.length * 2);
const JSON_ARRAY_RE = /\[[\s\S]*\]/;

async function fetchAndParse(model, systemPrompt, prompt, videos) {
  const provider = createOpenAICompatible({
    name: 'looptv-direct',
    baseURL: AI_BASE_URL,
    apiKey: AI_API_KEY,
  });
  const result = await generateText({
    model: provider.chatModel(model),
    system: systemPrompt,
    prompt,
    temperature: 0.1,
    maxRetries: 0,
  });
  const content = result.text;
  const match = content.match(JSON_ARRAY_RE);
  if (!match) throw new Error('No JSON array in response');
  return { tags: normalizeBatchTags(videos, JSON.parse(match[0])) };
}

async function callModel(model, stationId, videos, retries = 2) {
  const prompt = buildUserPrompt(videos);
  const systemPrompt = getSystemPrompt(stationId);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fetchAndParse(model, systemPrompt, prompt, videos);
      if (result.retry) {
        await sleep(3000 + Math.random() * 2000);
        continue;
      }
      return result.tags;
    } catch {
      if (attempt < retries) {
        await sleep(2000);
        continue;
      }
      return null;
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processQueue(model, batches, results, stats) {
  while (true) {
    const batch = batches.pop();
    if (!batch) break;
    batch.attempts = (batch.attempts ?? 0) + 1;

    const tags = await callModel(model, batch.stationId, batch.videos);
    if (tags) {
      for (let i = 0; i < batch.videos.length; i++) {
        const video = batch.videos[i];
        results.set(video.id, tags[i]);
      }
      stats.success += batch.videos.length;
    } else {
      stats.retries += 1;
      if (batch.attempts >= MAX_BATCH_ATTEMPTS) {
        stats.failed += batch.videos.length;
      } else {
        batches.unshift(batch);
      }
    }

    const total = stats.success + stats.failed;
    if (total % 100 < BATCH_SIZE || batches.length === 0) {
      const pct = Math.round((stats.success / stats.total) * 100);
      process.stdout.write(
        `\r  Tagged: ${stats.success}/${stats.total} (${pct}%) | Queue: ${batches.length} | Retries: ${stats.retries}`
      );
    }

    await sleep(3200);
  }
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

async function main() {
  if (!AI_BASE_URL || !AI_API_KEY || MODELS.length === 0) {
    throw new Error('AI_BASE_URL, AI_API_KEY, and AI_MODEL or AI_MODELS are required');
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));

  const needsTagging = videosNeedingTags(catalog);

  console.log(`Videos needing tags: ${needsTagging.length}`);
  console.log(`Profiles: ${summarizeProfiles(needsTagging)}`);
  console.log(`Endpoint: ${new URL(AI_BASE_URL).host}`);
  console.log(`Models: ${MODELS.length} (${MODELS.join(', ')})`);
  console.log(
    `Batch size: ${BATCH_SIZE}, Concurrency: ${MODELS.length * CONCURRENCY_PER_MODEL} workers`
  );
  console.log(`Max attempts per batch: ${MAX_BATCH_ATTEMPTS}`);

  if (needsTagging.length === 0) {
    console.log('Nothing to tag!');
    return;
  }

  const batches = createStationBatches(needsTagging, BATCH_SIZE);

  for (let i = batches.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [batches[i], batches[j]] = [batches[j], batches[i]];
  }

  console.log(`Batches: ${batches.length}`);
  console.log(
    `Estimated time: ~${Math.ceil(((batches.length / (MODELS.length * CONCURRENCY_PER_MODEL)) * 3.5) / 60)} minutes\n`
  );

  const results = new Map();
  const stats = { success: 0, failed: 0, retries: 0, total: needsTagging.length };
  const startTime = Date.now();

  const workers = [];
  for (const model of MODELS) {
    for (let i = 0; i < CONCURRENCY_PER_MODEL; i++) {
      workers.push(processQueue(model, batches, results, stats));
    }
  }

  await Promise.all(workers);

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n\nDone in ${elapsed}s. Tagged ${results.size}/${needsTagging.length} videos.`);

  let applied = 0;
  for (const station of Object.values(catalog.stations)) {
    for (const video of station.videos) {
      const tags = results.get(video.id);
      if (tags) {
        video.tags = tags;
        applied++;
      }
      delete video.description;
    }
  }

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog));
  const sizeKB = Math.round(fs.statSync(CATALOG_PATH).size / 1024);
  console.log(`Applied ${applied} tag updates. Output: ${CATALOG_PATH} (${sizeKB}KB)`);

  if (stats.failed > 0) {
    console.error(`Warning: ${stats.failed} videos failed tagging after retries.`);
    process.exitCode = 1;
  }
}

main().catch(console.error);
