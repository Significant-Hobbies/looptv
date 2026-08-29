import Link from '@/components/AppLink';
import FeaturesSection from '@/components/FeaturesSection';

import stations from '../../channels.config';
import catalogSummary from '../../public/catalog-summary.json';

const FAQS = [
  {
    q: 'Do I need a YouTube or Google account?',
    a: "No. Playback runs through the public YouTube IFrame player. There's no sign-in anywhere in LoopTV.",
  },
  {
    q: 'Where does the catalog come from?',
    a: 'A twice-monthly GitHub workflow refreshes public channel metadata through a cache-first YouTube Data API path, with yt-dlp as a fallback. It commits a checked-in catalog.json, so watching needs no runtime API key; refresh credentials stay in repository Actions.',
  },
  {
    q: "What happens when a video can't be embedded?",
    a: 'YouTube returns error 101 or 150 when a channel blocks embedding for a specific clip. The player catches it and immediately picks the next random video — no error toast, no interruption.',
  },
  {
    q: 'Where is my watch history stored?',
    a: "Entirely in your browser's localStorage. Clearing site data wipes it. There is no server-side account or database.",
  },
  {
    q: 'Can I add my own channels?',
    a: 'Yes — LoopTV is MIT-licensed. Fork the repo, append a station to stations.json, run pnpm run build:catalog (requires yt-dlp), and deploy.',
  },
];

function HeroSection({
  totalStations,
  totalSources,
  totalVideos,
}: {
  totalStations: number;
  totalSources: number;
  totalVideos: number;
}) {
  return (
    <section className="text-center sm:py-12">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">LoopTV</p>
      <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-medium tracking-tight text-white sm:text-5xl md:text-6xl">
        LoopTV — channel-surf YouTube like it&apos;s TV.
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
        Pick a station, hit play, and let random clips run nonstop. {totalStations} stations,{' '}
        {totalSources} channels, {totalVideos.toLocaleString()} videos in today&apos;s catalog. No
        account, no runtime API key, and no platform recommendation feed deciding what&apos;s next.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/random"
          className="inline-flex min-h-11 items-center rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-500"
        >
          Start watching
        </Link>
        <Link
          href="/channels"
          className="text-sm text-zinc-400 hover:text-zinc-200 underline underline-offset-4"
        >
          Browse stations
        </Link>
      </div>
    </section>
  );
}

function PreviewSection({ totalStations }: { totalStations: number }) {
  const previewStations = stations.slice(0, 8);
  return (
    <section className="mt-20">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        A glimpse of the dial
      </h2>
      <p className="mt-3 max-w-prose text-sm leading-6 text-zinc-400">
        Each tile is a real station in today&apos;s catalog. Click any one to tune in.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {previewStations.map((s) => {
          const count =
            (catalogSummary.stations as Record<string, { videoCount: number }>)[s.id]?.videoCount ??
            0;
          return (
            <Link
              key={s.id}
              href={`/${s.id}`}
              className="group rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20 hover:bg-white/10"
            >
              <p className="text-sm font-semibold text-white group-hover:text-amber-400">
                {s.name}
              </p>
              <p className="mt-1 text-[11px] leading-4 text-zinc-500">
                {count.toLocaleString()} videos · {s.sources.length}{' '}
                {s.sources.length === 1 ? 'channel' : 'channels'}
              </p>
            </Link>
          );
        })}
      </div>
      <div className="mt-4">
        <Link
          href="/channels"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500 hover:text-amber-400"
        >
          See all {totalStations} stations →
        </Link>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="mt-20">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">FAQ</h2>
      <dl className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10 bg-white/5">
        {FAQS.map((f) => (
          <div key={f.q} className="p-5">
            <dt className="text-sm font-semibold text-white">{f.q}</dt>
            <dd className="mt-2 text-xs leading-5 text-zinc-400">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="mt-20 rounded-xl border border-white/10 bg-white/5 p-8 text-center">
      <h2 className="text-2xl font-medium tracking-tight text-white">
        Ready to leave something good on in the background?
      </h2>
      <p className="mt-2 text-sm text-zinc-400">Tune to a random station and let it run.</p>
      <Link
        href="/random"
        className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-500"
      >
        Pick a station
      </Link>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-zinc-500">
      <p>You pick the station. LoopTV picks a clip from that curated pool.</p>
      <nav className="flex flex-wrap gap-x-5 gap-y-3">
        <Link href="/about" className="hover:text-zinc-300">
          About
        </Link>
        <Link href="/channels" className="hover:text-zinc-300">
          Channels
        </Link>
        <Link href="/privacy" className="hover:text-zinc-300">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-zinc-300">
          Terms
        </Link>
        <Link href="/changelog" className="hover:text-zinc-300">
          Changelog
        </Link>
        <a
          href="https://github.com/Significant-Hobbies/looptv/issues"
          className="hover:text-zinc-300"
        >
          Roadmap
        </a>
        <a href="https://github.com/Significant-Hobbies/looptv" className="hover:text-zinc-300">
          Source
        </a>
      </nav>
    </footer>
  );
}

export default function LandingPage() {
  const totalSources = stations.reduce((n, s) => n + s.sources.length, 0);
  const totalVideos = catalogSummary.totalVideos;
  const totalStations = stations.length;

  const features = [
    {
      title: 'Stations, not a feed',
      body: `${totalStations} topic stations group ${totalSources} public YouTube channels — science, comedy, tech, talks, film, and more. Pick one and it plays.`,
    },
    {
      title: 'Random, nonstop playback',
      body: 'No platform recommendation feed. Normal playback shuffles within your chosen station; optional Smart Mix uses only preference weights stored in this browser.',
    },
    {
      title: 'Yours, on your device',
      body: 'Watched history, blocked sources, and Smart Mix preferences live in your browser. No account to create, nothing leaves your device.',
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 pb-20 pt-12 text-zinc-300">
      <HeroSection
        totalStations={totalStations}
        totalSources={totalSources}
        totalVideos={totalVideos}
      />
      <FeaturesSection features={features} className="mt-20" />
      <PreviewSection totalStations={totalStations} />
      <FaqSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
