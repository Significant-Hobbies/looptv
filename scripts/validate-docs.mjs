#!/usr/bin/env node
/**
 * validate-docs.mjs — local-first documentation validator for LoopTV.
 *
 * Checks the docs/ tree for:
 *   1. Broken internal Markdown links (relative .md links + anchors).
 *   2. Orphaned docs (a .md file referenced by no other doc and not an index).
 *   3. Missing index.md in any docs/ subdirectory.
 *   4. Missing `title` frontmatter (warning only).
 *
 * External (http/https/mailto) links are not checked — that's a network job.
 * Links to source files outside docs/ (e.g. `../../src/lib/types.ts`) are
 * resolved relative to the repo root and checked for existence.
 *
 * Exit code: 0 if clean, 1 if any error. Warnings do not fail.
 *
 * Usage:
 *   node scripts/validate-docs.mjs
 *   node scripts/validate-docs.mjs --strict   # warnings become errors
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, sep, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DOCS_ROOT = join(REPO_ROOT, 'docs');
const STRICT = process.argv.includes('--strict');

/** Yield every regex match on `body` (idiomatic exec loop, isolated here). */
function* matchAll(re, body) {
  let m;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex iteration
  while ((m = re.exec(body)) !== null) yield m;
}

/** @returns {{title?: string, body: string} | null} */
function parseFrontmatter(text) {
  if (!text.startsWith('---')) return { body: text };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { body: text };
  const fm = text.slice(3, end);
  const body = text.slice(end + 4).replace(/^\n/, '');
  const titleMatch = fm.match(/^title:\s*(.+)$/m);
  return { title: titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, '') : undefined, body };
}

/** Collect every .md file under a directory, recursively. */
function collectMarkdown(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectMarkdown(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

/** Extract [text](href) and [text]: href reference-style links. */
function extractLinks(body) {
  const links = [];
  // Inline: [text](href) — link text has no unescaped ] (rare in our docs).
  const inline = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const m of matchAll(inline, body)) links.push(m[1]);
  // Reference: [text]: href  (only the definition lines)
  const ref = /^\s*\[[^\]]*\]:\s*(\S+)/gm;
  for (const m of matchAll(ref, body)) links.push(m[1]);
  return links;
}

/** Extract H1/H2/H3 heading slugs and explicit <a id="..."> anchors. */
function extractHeadings(body) {
  const headings = [];
  const headingRe = /^(#{1,3})\s+(.+?)\s*$/gm;
  for (const m of matchAll(headingRe, body)) {
    headings.push(slugify(m[2]));
  }
  // Explicit HTML anchors: <a id="xxx"></a> or <a name="xxx"></a>
  const anchorRe = /<a\s+(?:[^>]*?\s)?(?:id|name)="([^"]+)"/gi;
  for (const m of matchAll(anchorRe, body)) {
    headings.push(m[1].toLowerCase());
  }
  return headings;
}

function slugify(text) {
  return text
    .replace(/`[^`]*`/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function isExternal(href) {
  return /^(https?:|mailto:|tel:|ftp:|\/\/)/i.test(href);
}

/** Resolve a link href relative to the doc file, returning an absolute path or null. */
function resolveTarget(fromFile, href) {
  if (isExternal(href)) return null;
  const [pathPart, anchor] = href.split('#');
  if (!pathPart) {
    // Pure anchor — same file.
    return { file: fromFile, anchor: anchor || null };
  }
  const fromDir = dirname(fromFile);
  const resolved = normalize(join(fromDir, pathPart));
  return { file: resolved, anchor: anchor || null };
}

const errors = [];
const warnings = [];
const note = (kind, msg) => (kind === 'error' ? errors : warnings).push(msg);

// 1. Collect all docs.
const allDocs = collectMarkdown(DOCS_ROOT);
if (allDocs.length === 0) {
  console.error('No .md files found under docs/');
  process.exit(1);
}

// 2. Index check: every subdirectory under docs/ must have an index.md.
function checkIndexes(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    const sub = join(dir, entry.name);
    if (!existsSync(join(sub, 'index.md'))) {
      note('error', `Missing index.md in ${relative(REPO_ROOT, sub)}/`);
    }
    checkIndexes(sub);
  }
}
checkIndexes(DOCS_ROOT);

// 3. Parse every doc, collect links + headings, validate.
const docSet = new Set(allDocs);
const referenced = new Set(); // files referenced by at least one link
const headingMap = new Map(); // file -> Set(slugs)

for (const file of allDocs) {
  const raw = readFileSync(file, 'utf-8');
  const fm = parseFrontmatter(raw);
  if (!fm) {
    note('error', `Unparseable frontmatter in ${relative(REPO_ROOT, file)}`);
    continue;
  }
  if (!fm.title) {
    note('warn', `Missing \`title\` frontmatter in ${relative(REPO_ROOT, file)}`);
  }
  headingMap.set(file, new Set(extractHeadings(fm.body)));

  for (const href of extractLinks(fm.body)) {
    const target = resolveTarget(file, href);
    if (!target) continue; // external
    const { file: targetFile, anchor } = target;

    if (!docSet.has(targetFile)) {
      // Maybe it's a repo file outside docs/ (e.g. ../../src/lib/types.ts).
      if (existsSync(targetFile)) {
        referenced.add(targetFile);
        continue;
      }
      note('error', `Broken link in ${relative(REPO_ROOT, file)}: \`${href}\` → not found`);
      continue;
    }
    referenced.add(targetFile);
    if (anchor) {
      const slugs = headingMap.get(targetFile);
      if (slugs && !slugs.has(anchor)) {
        note(
          'error',
          `Broken anchor in ${relative(REPO_ROOT, file)}: \`${href}\` → #${anchor} not found in ${relative(REPO_ROOT, targetFile)}`
        );
      }
    }
  }
}

// 4. Orphan check: every doc should be referenced by another doc, or be an index.md.
for (const file of allDocs) {
  const base = file.split(sep).pop();
  if (base === 'index.md') continue; // indexes are entry points
  if (!referenced.has(file)) {
    note('warn', `Orphaned doc (not linked from anywhere): ${relative(REPO_ROOT, file)}`);
  }
}

// 5. Report.
const fail = errors.length > 0 || (STRICT && warnings.length > 0);
const fmt = (arr, label) =>
  arr.length === 0 ? null : `\n${label} (${arr.length}):\n  - ${arr.join('\n  - ')}\n`;
if (errors.length) console.error(fmt(errors, 'Errors') ?? '');
if (warnings.length) console.warn(fmt(warnings, 'Warnings') ?? '');
if (errors.length === 0 && warnings.length === 0) {
  console.log(`docs: OK — ${allDocs.length} markdown files, all links resolve.`);
} else {
  console.log(
    `docs: ${errors.length} error(s), ${warnings.length} warning(s) across ${allDocs.length} files.`
  );
}
process.exit(fail ? 1 : 0);
