export interface PublicSurface {
  path: string;
  title: string;
  summary: string;
}

export const PUBLIC_SURFACES: PublicSurface[] = [
  {
    path: '/',
    title: 'LoopTV',
    summary:
      'A lean-back player that turns curated public YouTube channels into television-style stations.',
  },
  {
    path: '/about',
    title: 'About LoopTV',
    summary:
      'How LoopTV provides random continuous playback from a checked-in catalog without an account or runtime API key.',
  },
  {
    path: '/catalog',
    title: 'Catalog',
    summary:
      'Browse the current curated video catalog by station, channel, and public video metadata.',
  },
  {
    path: '/channels',
    title: 'Channels',
    summary: 'Every public YouTube channel currently represented in the LoopTV catalog.',
  },
  {
    path: '/privacy',
    title: 'Privacy',
    summary:
      'LoopTV requires no account; watch history and viewing preferences remain in browser storage.',
  },
  {
    path: '/terms',
    title: 'Terms',
    summary: 'Terms for using the LoopTV player and its curated public YouTube catalog.',
  },
  {
    path: '/blocked',
    title: 'Blocked videos',
    summary:
      'A local diagnostic view for videos that YouTube does not permit to play in an embedded player.',
  },
  {
    path: '/history',
    title: 'Watch history',
    summary:
      'The viewer device’s local LoopTV playback history; no account or server sync is used.',
  },
  {
    path: '/playlist',
    title: 'Playlist',
    summary: 'The current device’s locally assembled LoopTV playback queue.',
  },
  {
    path: '/random',
    title: 'Random station',
    summary: 'Start a random curated LoopTV station for immediate lean-back playback.',
  },
  {
    path: '/stats',
    title: 'Catalog statistics',
    summary: 'Public counts and freshness signals for the checked-in LoopTV catalog.',
  },
  {
    path: '/tags',
    title: 'Tags',
    summary: 'Browse public catalog topics and the videos associated with each generated tag.',
  },
  {
    path: '/watchlater',
    title: 'Watch later',
    summary: 'The current device’s local list of LoopTV videos saved for later playback.',
  },
  {
    path: '/changelog',
    title: 'Changelog',
    summary: 'Verified LoopTV playback, catalog quality, and reliability improvements.',
  },
];
