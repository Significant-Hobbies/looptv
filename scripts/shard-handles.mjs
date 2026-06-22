#!/usr/bin/env node
/** Print YouTube handles for a deterministic shard. Usage: shard-handles.mjs <index> <total> */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stations = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "stations.json"), "utf8"));

const index = Number.parseInt(process.argv[2] ?? "0", 10);
const total = Number.parseInt(process.argv[3] ?? "1", 10);

if (!Number.isFinite(index) || !Number.isFinite(total) || index < 0 || total < 1 || index >= total) {
  console.error("Usage: shard-handles.mjs <index> <total>");
  process.exit(1);
}

const handles = [...new Set(stations.flatMap((station) => station.sources.map((s) => s.handle)))].sort();

for (let i = 0; i < handles.length; i += 1) {
  if (i % total === index) console.log(handles[i]);
}
