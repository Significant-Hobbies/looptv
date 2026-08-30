// Smoke-test the configured direct AI endpoint before catalog tagging.
// Usage: AI_BASE_URL=... AI_API_KEY=... AI_MODEL=... node scripts/smoke-tag-gateway.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.AI_BASE_URL?.replace(/\/+$/, '') || '';
const API_KEY = process.env.AI_API_KEY || '';
const MODEL = process.env.AI_MODEL || '';

export function gatewayFailureKind(status) {
  return status === 401 || status === 403 ? 'auth' : 'transient';
}

function setStatus(status) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `status=${status}\n`);
  }
}

function fail(status, message) {
  setStatus(status);
  console.error(message);
  process.exit(1);
}

async function main() {
  if (!BASE_URL || !API_KEY || !MODEL) {
    fail('auth', 'AI_BASE_URL, AI_API_KEY, and AI_MODEL are required for the AI smoke test.');
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: 'Return ONLY this JSON array with one entry: [["physics","gravity","space"]]',
        },
      ],
      temperature: 0,
      max_tokens: 64,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    fail(
      gatewayFailureKind(res.status),
      `AI provider smoke failed (${res.status}): ${text.slice(0, 400)}`
    );
  }

  const data = JSON.parse(text);
  const content = data.choices?.[0]?.message?.content || '';
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) {
    fail(
      'transient',
      `AI provider smoke failed: no JSON array in response: ${content.slice(0, 200)}`
    );
  }

  const tags = JSON.parse(match[0]);
  if (!Array.isArray(tags) || !Array.isArray(tags[0]) || tags[0].length < 2) {
    fail('transient', `AI provider smoke failed: unexpected tag shape: ${JSON.stringify(tags)}`);
  }

  setStatus('ok');
  console.log(
    `AI provider smoke OK (model=${data.model ?? MODEL}, tags=${JSON.stringify(tags[0])})`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    setStatus('transient');
    console.error(err);
    process.exit(1);
  });
}
