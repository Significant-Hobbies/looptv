import type { APIRoute } from 'astro';

import stations from '../../channels.config';
import { PUBLIC_SURFACES, type PublicSurface } from '@/lib/public-surfaces';
import type { StationConfig } from '@/lib/types';

interface StaticProps {
  kind: 'static';
  surface: PublicSurface;
}

interface StationProps {
  kind: 'station';
  station: StationConfig;
}

type Props = StaticProps | StationProps;

export const prerender = true;

export function getStaticPaths() {
  const staticPaths = PUBLIC_SURFACES.filter((surface) => surface.path !== '/').map((surface) => ({
    params: { path: surface.path.slice(1) },
    props: { kind: 'static', surface } satisfies StaticProps,
  }));
  const stationPaths = stations.map((station) => ({
    params: { path: station.id },
    props: { kind: 'station', station } satisfies StationProps,
  }));
  return [...staticPaths, ...stationPaths];
}

export const GET: APIRoute = ({ props }) => {
  const body = renderMarkdown(props as Props);
  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

function renderMarkdown(props: Props): string {
  if (props.kind === 'station') {
    const { station } = props;
    const sources = station.sources.map(
      (source) => `- [${source.name}](https://www.youtube.com/${source.handle})`
    );
    return `# ${station.name} — LoopTV station

${station.description}.

## Curated sources

${sources.join('\n')}

LoopTV selects random clips from the checked-in public catalog. Playback uses
YouTube embeds; viewing history and preferences remain on the viewer's device.

- [Open this station](https://tv.significanthobbies.com/${station.id})
- [Browse all channels](https://tv.significanthobbies.com/channels)
`;
  }

  return `# ${props.surface.title}

${props.surface.summary}

## Product boundary

LoopTV is a static, no-account player backed by a checked-in catalog of public
YouTube metadata. Runtime playback needs no LoopTV API key. Device-specific
history, playlists, and preferences remain in browser storage.

- [Open this page](https://tv.significanthobbies.com${props.surface.path})
- [Browse stations](https://tv.significanthobbies.com/channels)
- [View the source](https://github.com/Significant-Hobbies/looptv)
`;
}
