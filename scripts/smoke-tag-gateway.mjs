// Smoke-test free-ai gateway auth + project_id before catalog tagging.
// Usage: FAGW_API_KEY=... node scripts/smoke-tag-gateway.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GATEWAY = 'https://free-ai-gateway.sarthakagrawal927.workers.dev/v1/chat/completions';
const API_KEY = process.env.FAGW_API_KEY || '';
const PROJECT_ID = process.env.FAGW_PROJECT_ID || 'looptv';

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
  if (!API_KEY) {
    fail('auth', 'FAGW_API_KEY is required for gateway smoke test.');
  }

  const res = await fetch(GATEWAY, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      project_id: PROJECT_ID,
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
      `Gateway smoke failed (${res.status}): ${text.slice(0, 400)}`
    );
  }

  const data = JSON.parse(text);
  const content = data.choices?.[0]?.message?.content || '';
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) {
    fail('transient', `Gateway smoke failed: no JSON array in response: ${content.slice(0, 200)}`);
  }

  const tags = JSON.parse(match[0]);
  if (!Array.isArray(tags) || !Array.isArray(tags[0]) || tags[0].length < 2) {
    fail('transient', `Gateway smoke failed: unexpected tag shape: ${JSON.stringify(tags)}`);
  }

  setStatus('ok');
  console.log(
    `Gateway smoke OK (project=${PROJECT_ID}, model=${data.x_gateway?.model ?? 'gemini-2.5-flash'}, tags=${JSON.stringify(tags[0])})`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    setStatus('transient');
    console.error(err);
    process.exit(1);
  });
}
