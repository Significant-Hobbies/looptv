export const repository = 'https://github.com/Significant-Hobbies/looptv';
export const releases = [
  {
    date: '2026-07-25',
    title: 'A lighter, fully static LoopTV',
    outcomes: [
      'The production site moved to an Astro shell with React only where playback needs browser state.',
      'Stations, permalinks, catalog assets, random play, and the TV-style experience stayed intact.',
    ],
  },
  {
    date: '2026-07-17',
    title: 'Clearer catalog discovery',
    outcomes: [
      'The public catalog gained a station breakdown and structured video metadata.',
      'Canonical metadata, sitemaps, robots guidance, and the owned tv.significanthobbies.com address were reverified.',
    ],
  },
  {
    date: '2026-07-12',
    title: 'Safer catalog refreshes',
    outcomes: [
      'Quota-aware refreshes reuse recent source data and stop before unnecessary YouTube API work.',
      'Integrity checks now block suspiciously small, stale, or incomplete catalogs from shipping.',
    ],
  },
  {
    date: '2026-04-04',
    title: 'LoopTV launched',
    outcomes: [
      'Curated YouTube channels became lean-back stations with random continuous playback.',
      'Watch history and preferences remain on the device, with no account or runtime API key.',
    ],
  },
];
export const changelogIntro =
  'Meaningful improvements to the lean-back player, curated catalog, and refresh pipeline.';
