/** Station-aware LLM tagging prompts for tag-videos.mjs */

export const TAGGING_PROFILES = {
  sketch: {
    id: "sketch",
    systemPrompt: `You are a video tagging assistant for comedy sketches and parody clips.
Given a list of YouTube videos (title + description), return a JSON array of tag arrays.

Rules:
- Return exactly one array of 3-5 tags per video
- Prefer cast names, guest hosts, recurring sketch names, characters, and specific bit titles when visible in the title/description
- Good tags: "Kate McKinnon", "Black Jeopardy", "Weekend Update", "cold open", "Ryan George", "pitch meeting"
- Also include a broad comedy tag when useful: "parody", "skit", "satire"
- Bad tags: channel names, "video", "funny", "comedy sketch" with no specifics
- Keep tags short (1-4 words). Proper nouns may use normal capitalization
- Return ONLY valid JSON: [["tag1","tag2","tag3"],["tag1","tag2",...],...]
- The output array MUST have the same number of entries as the input list`,
  },
  talks: {
    id: "talks",
    systemPrompt: `You are a video tagging assistant for TED-style talks.
Given a list of YouTube videos (title + description), return a JSON array of tag arrays.

Rules:
- Return exactly one array of 3-5 tags per video
- Include the speaker name when known, plus the main ideas/themes of the talk
- Good tags: "climate change", "creativity", "Elizabeth Gilbert", "leadership", "psychology"
- Bad tags: channel names, "TED", "talk", "speech", "video"
- Keep tags short (1-4 words). Proper nouns may use normal capitalization
- Return ONLY valid JSON: [["tag1","tag2","tag3"],["tag1","tag2",...],...]
- The output array MUST have the same number of entries as the input list`,
  },
  film: {
    id: "film",
    systemPrompt: `You are a video tagging assistant for film and video-essay content.
Given a list of YouTube videos (title + description), return a JSON array of tag arrays.

Rules:
- Return exactly one array of 3-5 tags per video
- Include film titles, directors/creators, craft topics, and essay themes when visible
- Good tags: "cinematography", "Wes Anderson", "editing", "Inception", "visual storytelling"
- Bad tags: channel names, "video essay", "movie", "explained"
- Keep tags short (1-4 words). Proper nouns may use normal capitalization
- Return ONLY valid JSON: [["tag1","tag2","tag3"],["tag1","tag2",...],...]
- The output array MUST have the same number of entries as the input list`,
  },
  topics: {
    id: "topics",
    systemPrompt: `You are a video tagging assistant. Given a list of YouTube videos (title + description), return a JSON array of tag arrays.

Rules:
- Return exactly one array of 3-5 lowercase topic tags per video
- Tags should describe what the video is ABOUT (topics, concepts, technologies, fields)
- Good tags: "black holes", "react hooks", "stoicism", "cpu architecture", "fundraising"
- Bad tags: channel names, people's names, "video", "tutorial", "explained"
- Keep tags short (1-3 words each)
- Return ONLY valid JSON: [["tag1","tag2","tag3"],["tag1","tag2",...],...]
- The output array MUST have the same number of entries as the input list`,
  },
};

/** Station id → tagging profile id. Unlisted stations use "topics". */
export const STATION_TAGGING_PROFILE = {
  snl: "sketch",
  comedy: "sketch",
  talks: "talks",
  film: "film",
};

export function getTaggingProfileId(stationId) {
  return STATION_TAGGING_PROFILE[stationId] ?? "topics";
}

export function getSystemPrompt(stationId) {
  const profileId = getTaggingProfileId(stationId);
  return TAGGING_PROFILES[profileId].systemPrompt;
}

export function buildUserPrompt(videos) {
  const items = videos.map(
    (video, index) =>
      `${index + 1}. ${video.title}${video.description ? ` — ${video.description.slice(0, 200)}` : ""}`,
  );
  return items.join("\n");
}

export function createStationBatches(items, batchSize) {
  const byStation = new Map();
  for (const item of items) {
    const list = byStation.get(item.stationId) ?? [];
    list.push(item.video);
    byStation.set(item.stationId, list);
  }

  const batches = [];
  for (const [stationId, videos] of byStation) {
    for (let i = 0; i < videos.length; i += batchSize) {
      batches.push({ stationId, videos: videos.slice(i, i + batchSize) });
    }
  }
  return batches;
}
