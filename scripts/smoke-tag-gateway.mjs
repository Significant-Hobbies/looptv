// Smoke-test free-ai gateway auth + project_id before catalog tagging.
// Usage: FAGW_API_KEY=... node scripts/smoke-tag-gateway.mjs

const GATEWAY = "https://free-ai-gateway.sarthakagrawal927.workers.dev/v1/chat/completions";
const API_KEY = process.env.FAGW_API_KEY || "";
const PROJECT_ID = process.env.FAGW_PROJECT_ID || "looptv";

async function main() {
  if (!API_KEY) {
    console.error("FAGW_API_KEY is required for gateway smoke test.");
    process.exit(1);
  }

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      project_id: PROJECT_ID,
      messages: [
        {
          role: "user",
          content:
            'Return ONLY this JSON array with one entry: [["physics","gravity","space"]]',
        },
      ],
      temperature: 0,
      max_tokens: 64,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`Gateway smoke failed (${res.status}): ${text.slice(0, 400)}`);
    process.exit(1);
  }

  const data = JSON.parse(text);
  const content = data.choices?.[0]?.message?.content || "";
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) {
    console.error(`Gateway smoke failed: no JSON array in response: ${content.slice(0, 200)}`);
    process.exit(1);
  }

  const tags = JSON.parse(match[0]);
  if (!Array.isArray(tags) || !Array.isArray(tags[0]) || tags[0].length < 2) {
    console.error(`Gateway smoke failed: unexpected tag shape: ${JSON.stringify(tags)}`);
    process.exit(1);
  }

  console.log(
    `Gateway smoke OK (project=${PROJECT_ID}, model=${data.x_gateway?.model ?? "gemini-2.5-flash"}, tags=${JSON.stringify(tags[0])})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
