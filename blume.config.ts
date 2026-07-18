import { defineConfig } from 'blume';

/**
 * Blume presentation-layer config for LoopTV docs.
 *
 * Markdown under docs/ is the source of truth. Blume only renders and
 * indexes it — it does not own the content. Run `pnpm docs:build` to
 * generate the static docs site, `pnpm docs:check` to validate links.
 *
 * Blume is optional: if the `blume` package is not installed, the docs are
 * still readable as plain Markdown on GitHub and in any editor. The
 * `.blume/` runtime dir and `dist/` build output are gitignored.
 */
export default defineConfig({
  title: 'LoopTV Docs',
  description: 'Local-first documentation for LoopTV — a TV-like, zero-API-key YouTube player.',

  content: {
    root: 'docs',
  },

  theme: {
    accent: 'teal',
    radius: 'md',
    mode: 'system',
  },

  search: {
    provider: 'orama',
  },

  markdown: {
    imageZoom: true,
    code: {
      icons: true,
      wrap: false,
    },
  },

  ai: {
    llmsTxt: true,
    mcp: {
      enabled: false,
    },
  },

  seo: {
    og: { enabled: true },
    sitemap: true,
    robots: true,
    structuredData: true,
  },

  deployment: {
    output: 'static',
    // Canonical docs URL — update if/when the docs site gets its own domain.
    // Until then, Blume builds are a local/preview artifact.
    site: 'https://tv.significanthobbies.com',
  },
});
