# External References — LoopTV

One-line "what / why it matters here / link" entries. No re-explanation of concepts with authoritative sources.

---

## yt-dlp

**What:** CLI tool for downloading video/audio and extracting metadata from YouTube and 1,000+ other sites.  
**Why here:** Used with `--flat-playlist --dump-json` to build the video catalog without an API key.  
**Link:** https://github.com/yt-dlp/yt-dlp — see "Output Template" and "Flat Playlist" sections.

---

## dslim/bert-base-NER (HuggingFace)

**What:** Fine-tuned BERT model for Named Entity Recognition (PER, ORG, LOC, MISC) on CoNLL-2003.  
**Why here:** Used in `extract-tags.py` to extract people and place tags from video titles/descriptions. Retained as a local fallback; superseded in CI by LLM tagging.  
**Link:** https://huggingface.co/dslim/bert-base-NER — model card explains entity types and confidence scoring.

---

## HuggingFace Transformers `pipeline()` API

**What:** High-level API that wraps tokenization, model inference, and post-processing into one callable.  
**Why here:** `extract-tags.py` uses `pipeline("ner", aggregation_strategy="max")` — the `aggregation_strategy` parameter controls how subword tokens are merged into full-word entities.  
**Link:** https://huggingface.co/docs/transformers/main_classes/pipelines#transformers.TokenClassificationPipeline

---

## YouTube IFrame Player API

**What:** JavaScript API for embedding and controlling YouTube videos via a browser iframe.  
**Why here:** `Player.tsx` loads it dynamically, uses `onError` to catch codes 101/150 (embed disabled), and `onStateChange` for auto-skip on `ENDED`.  
**Link:** https://developers.google.com/youtube/iframe_api_reference — see Error Codes and Events sections.

---

## Next.js Static Export (`output: 'export'`)

**What:** Next.js mode that produces a fully static `out/` directory with no Node.js server requirement.  
**Why here:** Enables deployment to Cloudflare Pages CDN with no Worker. Constraints: no server components with runtime data fetching, no `ImageResponse`.  
**Link:** https://nextjs.org/docs/app/building-your-application/deploying/static-exports

---

## Next.js 16 + Turbopack

**What:** Turbopack is the Rust-based bundler that replaces webpack in Next.js 16+ dev mode.  
**Why here:** Used for `pnpm dev`; explicitly opted out for production builds (`next build --webpack`). Breaking changes vs webpack are noted in AGENTS.md.  
**Link:** https://nextjs.org/docs/app/api-reference/turbopack — migration guide lists known webpack incompatibilities.

---

## Cloudflare Pages

**What:** Static site hosting with global CDN, preview deployments per branch, and `wrangler pages deploy` CLI.  
**Why here:** Canonical deploy target for LoopTV. `wrangler.toml` sets `pages_build_output_dir = "out"`.  
**Link:** https://developers.cloudflare.com/pages/

---

## Wrangler CLI

**What:** Cloudflare's official CLI for deploying Pages and Workers projects.  
**Why here:** `pnpm deploy` runs `wrangler pages deploy out --project-name=looptv`. Also used for `wrangler pages dev out` as the local Pages server.  
**Link:** https://developers.cloudflare.com/workers/wrangler/

---

## CoNLL-2003 NER dataset

**What:** Standard benchmark dataset for NER; defines the PER/ORG/LOC/MISC entity types used by `dslim/bert-base-NER`.  
**Why here:** Understanding entity types (especially why ORG and MISC produce noise for a video catalog) requires knowing what CoNLL-2003 considers an "ORG" or "MISC".  
**Link:** https://huggingface.co/datasets/conll2003
