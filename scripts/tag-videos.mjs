// Tag videos using free AI gateway with parallel multi-model requests
// Usage: node scripts/tag-videos.mjs [catalog_path]

import fs from "fs";

const CATALOG_PATH = process.argv[2] || "public/catalog.json";
const GATEWAY = "https://free-ai-gateway.sarthakagrawal927.workers.dev/v1/chat/completions";
const API_KEY = process.env.FAGW_API_KEY || "x";
const BATCH_SIZE = 15;
const CONCURRENCY_PER_MODEL = 2;

const MODELS = [
  "gemini-2.5-flash",
  "groq-llama-70b",
  "sambanova-llama-70b",
  "nvidia-llama-70b",
  "cerebras-gpt-oss-120b",
  "workers-ai-llama-3.3-70b",
  "openrouter-llama-70b-free",
];
const MAX_BATCH_ATTEMPTS = Math.max(2, MODELS.length * 2);

const SYSTEM_PROMPT = `You are a video tagging assistant. Given a list of YouTube videos (title + description), return a JSON array of tag arrays.

Rules:
- Return exactly one array of 3-5 lowercase topic tags per video
- Tags should describe what the video is ABOUT (topics, concepts, technologies, fields)
- Good tags: "black holes", "react hooks", "stoicism", "cpu architecture", "fundraising"
- Bad tags: channel names, people's names, "video", "tutorial", "explained"
- Keep tags short (1-3 words each)
- Return ONLY valid JSON: [["tag1","tag2","tag3"],["tag1","tag2",...],...]
- The output array MUST have the same number of entries as the input list`;

function buildPrompt(videos) {
  const items = videos.map(
    (v, i) => `${i + 1}. ${v.title}${v.description ? ` — ${v.description.slice(0, 200)}` : ""}`
  );
  return items.join("\n");
}

async function callModel(model, videos, retries = 2) {
  const prompt = buildPrompt(videos);
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(GATEWAY, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
        }),
      });

      if (res.status === 429) {
        await sleep(3000 + Math.random() * 2000);
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text.slice(0, 200)}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Extract JSON array from response
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("No JSON array in response");

      const tags = JSON.parse(match[0]);
      if (!Array.isArray(tags) || tags.length !== videos.length) {
        throw new Error(`Expected ${videos.length} tag arrays, got ${tags.length}`);
      }

      return tags;
    } catch (err) {
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

    const tags = await callModel(model, batch.videos);
    if (tags) {
      for (let i = 0; i < batch.videos.length; i++) {
        const video = batch.videos[i];
        const videoTags = new Set([video.source || "", ...tags[i]]);
        videoTags.delete("");
        results.set(video.id, [...videoTags].slice(0, 10));
      }
      stats.success += batch.videos.length;
    } else {
      stats.retries += 1;
      if (batch.attempts >= MAX_BATCH_ATTEMPTS) {
        stats.failed += batch.videos.length;
      } else {
        // Put back for another model to try.
        batches.unshift(batch);
      }
    }

    const total = stats.success + stats.failed;
    if (total % 100 < BATCH_SIZE || batches.length === 0) {
      const pct = Math.round((stats.success / stats.total) * 100);
      process.stdout.write(`\r  Tagged: ${stats.success}/${stats.total} (${pct}%) | Queue: ${batches.length} | Retries: ${stats.retries}`);
    }

    // Rate limit spacing
    await sleep(3200);
  }
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf-8"));

  // Collect videos needing tags
  const needsTagging = [];
  for (const [stationId, station] of Object.entries(catalog.stations)) {
    for (const video of station.videos) {
      if (video.description || (video.tags && video.tags.length <= 1)) {
        needsTagging.push(video);
      }
    }
  }

  console.log(`Videos needing tags: ${needsTagging.length}`);
  console.log(`Models: ${MODELS.length} (${MODELS.join(", ")})`);
  console.log(`Batch size: ${BATCH_SIZE}, Concurrency: ${MODELS.length * CONCURRENCY_PER_MODEL} workers`);
  console.log(`Max attempts per batch: ${MAX_BATCH_ATTEMPTS}`);

  if (needsTagging.length === 0) {
    console.log("Nothing to tag!");
    return;
  }

  // Create batches
  const batches = [];
  for (let i = 0; i < needsTagging.length; i += BATCH_SIZE) {
    batches.push({ videos: needsTagging.slice(i, i + BATCH_SIZE) });
  }

  // Shuffle batches for even distribution
  for (let i = batches.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [batches[i], batches[j]] = [batches[j], batches[i]];
  }

  console.log(`Batches: ${batches.length}`);
  console.log(`Estimated time: ~${Math.ceil(batches.length / (MODELS.length * CONCURRENCY_PER_MODEL) * 3.5 / 60)} minutes\n`);

  const results = new Map();
  const stats = { success: 0, failed: 0, retries: 0, total: needsTagging.length };
  const startTime = Date.now();

  // Launch parallel workers across all models
  const workers = [];
  for (const model of MODELS) {
    for (let i = 0; i < CONCURRENCY_PER_MODEL; i++) {
      workers.push(processQueue(model, batches, results, stats));
    }
  }

  await Promise.all(workers);

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n\nDone in ${elapsed}s. Tagged ${results.size}/${needsTagging.length} videos.`);

  // Apply tags back to catalog
  let applied = 0;
  for (const station of Object.values(catalog.stations)) {
    for (const video of station.videos) {
      const tags = results.get(video.id);
      if (tags) {
        video.tags = tags;
        applied++;
      }
      delete video.description; // Strip to save space
    }
  }

  catalog.lastUpdated = new Date().toISOString();
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog));
  const sizeKB = Math.round(fs.statSync(CATALOG_PATH).size / 1024);
  console.log(`Applied ${applied} tag updates. Output: ${CATALOG_PATH} (${sizeKB}KB)`);
}

main().catch(console.error);
