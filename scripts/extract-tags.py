#!/usr/bin/env python3
"""
Enrich video tags using HuggingFace NER (dslim/bert-base-NER).
Zero hardcoded entity lists — the model discovers people, orgs, locations, etc.

Pipeline:
  1. build-catalog.sh → process-catalog.mjs (raw catalog with descriptions)
  2. extract-tags.py (this script) → enriched tags + auto-derived categories

Usage: python3 scripts/extract-tags.py [catalog_path]
"""

import json
import sys
import os
import re
from collections import Counter

def load_ner_pipeline():
    model_name = os.environ.get("NER_MODEL", "dslim/bert-base-NER")
    print(f"Loading NER model ({model_name})...")
    from transformers import pipeline
    return pipeline(
        "ner",
        model=model_name,
        aggregation_strategy="max",
        device=-1,
    )


def load_sources_by_station():
    sources_by_station = {}
    try:
        with open("stations.json") as f:
            for s in json.load(f):
                sources_by_station[s["id"]] = {src["name"] for src in s["sources"]}
    except (FileNotFoundError, json.JSONDecodeError, KeyError) as e:
        print(f"  Warning: could not load stations.json: {e}")
    return sources_by_station


def extract_entity_tags(entities, source_name):
    tags = set()
    if source_name:
        tags.add(source_name)
    for ent in entities:
        word = ent["word"].strip()
        word = word.replace(" ##", "").replace("##", "")
        word = word.strip(".,!?:;'\"()[]#- ")
        label = ent["entity_group"]
        score = ent["score"]
        if score < 0.8 or len(word) < 3:
            continue
        if label not in ("PER", "LOC"):
            continue
        tags.add(word)
    return list(tags)[:20]


def run_ner_batch(ner, batch):
    texts = [
        f"{v['title']}. {v.get('description', '')}".strip()[:512]
        for v in batch
    ]
    results = ner(texts)
    for v, entities in zip(batch, results):
        v["tags"] = extract_entity_tags(entities, v.get("source"))


def derive_categories(videos, source_names):
    tag_counts = Counter()
    for v in videos:
        for t in v["tags"]:
            if t in source_names:
                continue
            tag_counts[t] += 1
    min_count = max(10, len(videos) // 200)
    top_tags = [
        (tag, count) for tag, count in tag_counts.most_common(15)
        if count >= min_count
    ]
    category_video_ids = {}
    for tag, count in top_tags:
        slug = slugify(tag)
        category_video_ids[slug] = [
            v["id"] for v in videos if tag in v["tags"]
        ]
        print(f"  {tag}: {count}")
    return category_video_ids


def process_station(ner, station_id, station, source_names):
    videos = station["videos"]
    needs_ner = [v for v in videos if v.get("description") or len(v.get("tags", [])) <= 1]
    already_done = len(videos) - len(needs_ner)
    print(f"\n=== {station_id}: {len(videos)} total, {len(needs_ner)} need NER, {already_done} cached ===", flush=True)

    if needs_ner:
        batch_size = 64
        for i in range(0, len(needs_ner), batch_size):
            batch = needs_ner[i : i + batch_size]
            run_ner_batch(ner, batch)
            done = min(i + batch_size, len(needs_ner))
            if done % 500 < batch_size or done == len(needs_ner):
                print(f"  {done}/{len(needs_ner)}", flush=True)
    else:
        print("  Nothing to process, skipping.", flush=True)

    station["categoryVideoIds"] = derive_categories(videos, source_names)


def main():
    catalog_path = sys.argv[1] if len(sys.argv) > 1 else "public/catalog.json"
    ner = load_ner_pipeline()
    sources_by_station = load_sources_by_station()

    with open(catalog_path) as f:
        catalog = json.load(f)

    for station_id, station in catalog["stations"].items():
        source_names = sources_by_station.get(station_id, set())
        process_station(ner, station_id, station, source_names)

    for station in catalog["stations"].values():
        for v in station["videos"]:
            v.pop("description", None)

    catalog["lastUpdated"] = __import__("datetime").datetime.now().isoformat()

    with open(catalog_path, "w") as f:
        json.dump(catalog, f)

    size_kb = os.path.getsize(catalog_path) // 1024
    print(f"\nOutput: {catalog_path} ({size_kb}KB)")


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


if __name__ == "__main__":
    main()
