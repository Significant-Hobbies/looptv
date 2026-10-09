import type { ReactNode } from 'react';

import Link from '@/components/AppLink';

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

/** The station the illustrative set is tuned to before a visitor touches the dial. */
const DEFAULT_STATION = 'science';
const KNOB_SWEEP = 270;

const videoCounts = catalogSummary.stations as Record<string, { videoCount: number }>;

interface Channel {
  id: string;
  number: string;
  name: string;
  description: string;
  videos: number;
  sources: number;
  angle: number;
}

const CHANNELS: Channel[] = stations.map((s, i) => ({
  id: s.id,
  number: String(i + 1).padStart(2, '0'),
  name: s.name,
  description: s.description,
  videos: videoCounts[s.id]?.videoCount ?? 0,
  sources: s.sources.length,
  angle: -KNOB_SWEEP / 2 + (i * KNOB_SWEEP) / Math.max(stations.length - 1, 1),
}));

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

/**
 * Pure-CSS tuning: each dial position is a radio input, and :has() shows the
 * matching screen and turns the knob. The page stays static, with no hydration.
 * Ids only (no quotes or child combinators) so React's text escaping is a no-op.
 */
function tuningCss(): string {
  const fallback = CHANNELS.find((c) => c.id === DEFAULT_STATION) ?? CHANNELS[0];
  const rules = [
    `#screen-${fallback.id}{display:grid}`,
    `.ltv-knob-pointer{transform:rotate(${fallback.angle}deg)}`,
    `.ltv-set:has(.ltv-tune:not(#tune-${fallback.id}):checked) #screen-${fallback.id}{display:none}`,
  ];
  for (const c of CHANNELS) {
    rules.push(`.ltv-set:has(#tune-${c.id}:checked) #screen-${c.id}{display:grid}`);
    rules.push(
      `.ltv-set:has(#tune-${c.id}:checked) .ltv-knob-pointer{transform:rotate(${c.angle}deg)}`
    );
  }
  return rules.join('\n');
}

function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-tube text-[11px] uppercase tracking-[0.22em] text-zinc-500 ${className}`}>
      {children}
    </p>
  );
}

function StartWatching({ event }: { event: string }) {
  return (
    <Link
      href="/random"
      data-app-health-event={event}
      className="group inline-flex min-h-12 items-center gap-3 rounded-full bg-red-600 py-3 pr-5 pl-6 font-medium text-[15px] text-white shadow-[0_10px_40px_-12px_rgba(229,9,20,0.7)] transition-colors hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500"
    >
      Start watching
      <svg
        viewBox="0 0 12 12"
        width="12"
        height="12"
        aria-hidden="true"
        className="transition-transform group-hover:translate-x-0.5"
      >
        <path d="M3 1.5v9l7-4.5z" fill="currentColor" />
      </svg>
    </Link>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-[#f4f0e8]">
      <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
        <rect
          x="3.5"
          y="7"
          width="25"
          height="18"
          rx="3.5"
          fill="#18181b"
          stroke="#52525b"
          strokeWidth="1.6"
        />
        <path fill="#dc2626" d="M13 11.5v9l8.5-4.5z" />
      </svg>
      <span className="font-display font-semibold text-[17px] tracking-tight">LoopTV</span>
    </Link>
  );
}

function Masthead() {
  return (
    <header className="flex items-center justify-between gap-4 py-5">
      <Logo />
      <nav className="flex items-center gap-5 text-sm text-zinc-400 sm:gap-7">
        <span className="hidden items-center gap-2 font-tube text-[11px] text-zinc-500 uppercase tracking-[0.22em] sm:inline-flex">
          <span className="size-1.5 rounded-full bg-red-500 shadow-[0_0_10px_2px_rgba(239,68,68,0.6)]" />
          On air
        </span>
        <Link href="/channels" className="hover:text-white">
          Stations
        </Link>
        <Link href="/about" className="hover:text-white">
          About
        </Link>
      </nav>
    </header>
  );
}

function StatsRow({ totalSources }: { totalSources: number }) {
  const stats = [
    { value: CHANNELS.length.toLocaleString(), label: 'Stations' },
    { value: totalSources.toLocaleString(), label: 'Channels' },
    { value: catalogSummary.totalVideos.toLocaleString(), label: 'Videos' },
  ];
  return (
    <div className="mt-12">
      <dl className="grid max-w-md grid-cols-3 border-white/10 border-y">
        {stats.map((s, i) => (
          <div key={s.label} className={`py-4 ${i === 0 ? '' : 'border-white/10 border-l pl-4'}`}>
            <dt className="font-tube text-[10px] text-zinc-500 uppercase tracking-[0.22em]">
              {s.label}
            </dt>
            <dd className="mt-1 font-display font-medium text-2xl text-[#f4f0e8] tabular-nums tracking-tight">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 font-tube text-[10px] text-zinc-600 uppercase tracking-[0.22em]">
        In today&apos;s catalog
      </p>
    </div>
  );
}

function HeroCopy({ totalSources }: { totalSources: number }) {
  return (
    <div>
      <Eyebrow>Lean-back YouTube · No account</Eyebrow>
      <h1 className="mt-6 font-display font-semibold text-[#f4f0e8] text-[clamp(3rem,6.4vw,5.6rem)] leading-[0.92] tracking-[-0.045em]">
        <span className="whitespace-nowrap">Channel-surf</span> YouTube like{' '}
        <span className="whitespace-nowrap">
          it&apos;s <span className="text-red-500">TV.</span>
        </span>
      </h1>
      <p className="mt-7 max-w-[30rem] text-[17px] text-zinc-400 leading-7">
        Pick a station, hit play, and let random clips run nonstop. No account, no runtime API key,
        and no platform recommendation feed deciding what&apos;s next.
      </p>
      <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
        <StartWatching event="looptv.cta.start_watching" />
        <Link
          href="/channels"
          data-app-health-event="looptv.cta.browse_stations"
          className="text-[15px] text-zinc-300 underline decoration-zinc-600 underline-offset-[6px] hover:text-white hover:decoration-zinc-300"
        >
          Browse stations
        </Link>
      </div>
      <StatsRow totalSources={totalSources} />
    </div>
  );
}

function Screen({ channel }: { channel: Channel }) {
  return (
    <div
      id={`screen-${channel.id}`}
      className="ltv-tuned absolute inset-0 hidden grid-rows-[auto_1fr_auto] p-5 sm:p-7"
    >
      <div className="flex items-center justify-between font-tube text-[11px] uppercase tracking-[0.22em]">
        <span className="text-red-400 [text-shadow:0_0_12px_rgba(248,113,113,0.6)]">
          CH {channel.number}
        </span>
        <span className="text-zinc-500">Random · Nonstop</span>
      </div>
      <div className="self-center">
        <p className="font-display font-semibold text-[#f4f0e8] text-[clamp(1.9rem,4.4vw,3.4rem)] leading-[0.95] tracking-[-0.035em]">
          {channel.name}
        </p>
        <p className="mt-3 max-w-[26rem] text-[13px] text-zinc-400 leading-5 sm:text-sm">
          {channel.description}
        </p>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="font-tube text-[10px] text-zinc-500 uppercase tracking-[0.18em] sm:text-[11px]">
          <span className="block sm:inline">{plural(channel.videos, 'video')}</span>
          <span className="hidden sm:inline"> · </span>
          <span className="block sm:inline">{plural(channel.sources, 'channel')}</span>
        </p>
        <Link
          href={`/${channel.id}`}
          className="shrink-0 rounded-full border border-white/15 bg-black/40 px-3.5 py-1.5 text-[13px] text-zinc-200 backdrop-blur hover:border-white/30 hover:text-white"
        >
          Tune in <span className="sr-only">to {channel.name}</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

function Knob() {
  const ticks = CHANNELS.map((c) => c.angle);
  return (
    <svg viewBox="0 0 64 64" className="size-14 shrink-0 sm:size-16" aria-hidden="true">
      <title>Channel knob</title>
      {ticks.map((a) => (
        <line
          key={a}
          x1="32"
          y1="3"
          x2="32"
          y2="6.5"
          stroke="#52525b"
          strokeWidth="1.2"
          transform={`rotate(${a} 32 32)`}
        />
      ))}
      <circle cx="32" cy="32" r="21" fill="#1c1a18" stroke="#3f3f46" />
      <circle cx="32" cy="32" r="16" fill="#141312" />
      <g className="ltv-knob-pointer">
        <line
          x1="32"
          y1="14"
          x2="32"
          y2="22"
          stroke="#ef4444"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function TuningStrip() {
  return (
    <fieldset className="min-w-0 flex-1">
      <legend className="mb-2 font-tube text-[10px] text-zinc-500 uppercase tracking-[0.22em]">
        Tune the dial
      </legend>
      <div className="grid grid-cols-8 sm:grid-cols-16">
        {CHANNELS.map((c) => (
          <div key={c.id} className="relative">
            <input
              type="radio"
              name="ltv-dial"
              id={`tune-${c.id}`}
              defaultChecked={c.id === DEFAULT_STATION}
              className="ltv-tune peer absolute size-0 opacity-0"
            />
            <label
              htmlFor={`tune-${c.id}`}
              title={c.name}
              className="flex min-h-11 cursor-pointer flex-col items-center justify-end gap-1.5 font-tube text-[10px] text-zinc-600 transition-colors hover:text-zinc-300 peer-checked:text-red-400 peer-focus-visible:rounded-md peer-focus-visible:outline-2 peer-focus-visible:outline-red-500 peer-checked:[&>i]:h-4 peer-checked:[&>i]:bg-red-500 peer-checked:[&>i]:shadow-[0_0_8px_rgba(239,68,68,0.8)]"
            >
              <i className="block h-2.5 w-px bg-zinc-600 transition-all" />
              {c.number}
              <span className="sr-only">{c.name}</span>
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function TvSet() {
  return (
    <figure className="ltv-set">
      <style>{tuningCss()}</style>
      <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(160deg,#1a1816,#0b0a09)] p-3 shadow-[0_40px_120px_-40px_rgba(229,9,20,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-4">
        <div className="ltv-screen-glow relative aspect-[4/3] overflow-hidden rounded-[20px] shadow-[inset_0_0_80px_rgba(0,0,0,0.9)] sm:aspect-[16/11]">
          <div className="ltv-scanlines pointer-events-none absolute inset-0 z-10" />
          {CHANNELS.map((c) => (
            <Screen key={c.id} channel={c} />
          ))}
        </div>
        <div className="mt-3 flex items-end gap-4 px-2 pb-1 sm:gap-6 sm:px-3">
          <TuningStrip />
          <Knob />
        </div>
      </div>
      <figcaption className="mt-4 px-2 text-[12px] text-zinc-600 leading-5">
        Illustrative set, not a screenshot. Every number on the dial is a real station in
        today&apos;s catalog — tap one to tune.
      </figcaption>
    </figure>
  );
}

function Hero({ totalSources }: { totalSources: number }) {
  return (
    <section className="grid items-center gap-14 pt-10 pb-20 sm:pt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:pt-20 lg:pb-32">
      <HeroCopy totalSources={totalSources} />
      <TvSet />
    </section>
  );
}

function SectionHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-4 font-display font-semibold text-[#f4f0e8] text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[0.98] tracking-[-0.04em] text-balance">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Lineup() {
  return (
    <section className="border-white/10 border-t py-24 lg:py-28">
      <SectionHead eyebrow="Channel guide" title="Every station on the dial.">
        <div className="max-w-md text-[15px] text-zinc-400 leading-7">
          <p>
            Each station is a hand-picked group of public YouTube channels. Pick one and LoopTV
            shuffles through its pool.
          </p>
          <Link
            href="/channels"
            className="mt-3 inline-block font-tube text-[11px] text-zinc-400 uppercase tracking-[0.22em] hover:text-white"
          >
            All {CHANNELS.length} stations →
          </Link>
        </div>
      </SectionHead>
      <ol className="mt-14 grid gap-x-12 lg:grid-cols-2">
        {CHANNELS.map((c) => (
          <li key={c.id} className="border-white/10 border-t">
            <Link
              href={`/${c.id}`}
              className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-x-4 py-4"
            >
              <span className="font-tube text-[12px] text-zinc-600 transition-colors group-hover:text-red-400">
                {c.number}
              </span>
              <span className="min-w-0">
                <span className="block font-display font-medium text-[#f4f0e8] text-[17px] tracking-tight">
                  {c.name}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-zinc-500">
                  {c.description}
                </span>
              </span>
              <span className="text-right font-tube text-[11px] text-zinc-500 tabular-nums">
                {plural(c.videos, 'video')}
                <span className="block text-zinc-600">{plural(c.sources, 'channel')}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function HowItWorks({ totalSources }: { totalSources: number }) {
  const steps = [
    {
      title: 'Stations, not a feed',
      body: `${CHANNELS.length} topic stations group ${totalSources} public YouTube channels — science, comedy, tech, talks, film, and more. Pick one and it plays.`,
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
    <section className="grid gap-12 border-white/10 border-t py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:py-28">
      <div>
        <Eyebrow>Why LoopTV</Eyebrow>
        <h2 className="mt-4 font-display font-semibold text-[#f4f0e8] text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[0.98] tracking-[-0.04em] text-balance">
          You pick the station.
          <br />
          <span className="text-zinc-500">LoopTV picks the clip.</span>
        </h2>
      </div>
      <ol className="space-y-10">
        {steps.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4">
            <span className="pt-1 font-tube text-[12px] text-red-400">0{i + 1}</span>
            <div>
              <h3 className="font-display font-medium text-[#f4f0e8] text-xl tracking-tight">
                {s.title}
              </h3>
              <p className="mt-2 text-[15px] text-zinc-400 leading-7">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="grid gap-12 border-white/10 border-t py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:py-28">
      <div>
        <Eyebrow>FAQ</Eyebrow>
        <h2 className="mt-4 font-display font-semibold text-[#f4f0e8] text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[0.98] tracking-[-0.04em] text-balance">
          A few honest answers.
        </h2>
      </div>
      <div className="border-white/10 border-b">
        {FAQS.map((f) => (
          <details key={f.q} className="group border-white/10 border-t">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 font-display font-medium text-[#f4f0e8] text-[17px] tracking-tight [&::-webkit-details-marker]:hidden">
              {f.q}
              <span
                aria-hidden="true"
                className="font-tube text-lg text-zinc-500 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="pb-6 text-[15px] text-zinc-400 leading-7">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function SignOff() {
  return (
    <section className="ltv-screen-glow relative overflow-hidden rounded-[30px] border border-white/10 px-6 py-20 text-center sm:px-12 sm:py-24">
      <div className="ltv-scanlines pointer-events-none absolute inset-0" />
      <div className="relative">
        <Eyebrow>Sign-off</Eyebrow>
        <h2 className="mx-auto mt-5 max-w-3xl font-display font-semibold text-[#f4f0e8] text-[clamp(2.25rem,5.4vw,4.5rem)] leading-[0.95] tracking-[-0.045em]">
          Leave something good on in the background.
        </h2>
        <p className="mt-5 text-[17px] text-zinc-400">Tune to a random station and let it run.</p>
        <div className="mt-9 flex justify-center">
          <StartWatching event="looptv.cta.start_watching_signoff" />
        </div>
      </div>
    </section>
  );
}

function Colophon() {
  return (
    <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-white/10 border-t pt-6 font-tube text-[11px] text-zinc-500 uppercase tracking-[0.18em]">
      <p>MIT-licensed · Built on the public YouTube player</p>
      <nav className="flex gap-6">
        <a href="https://github.com/Significant-Hobbies/looptv/issues" className="hover:text-white">
          Roadmap
        </a>
        <a
          href="https://github.com/Significant-Hobbies/looptv"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white"
        >
          Source on GitHub ↗
        </a>
      </nav>
    </div>
  );
}

export default function LandingPage() {
  const totalSources = stations.reduce((n, s) => n + s.sources.length, 0);

  return (
    <main className="mx-auto max-w-[78rem] px-5 pb-20 font-display text-zinc-300 sm:px-8">
      <Masthead />
      <Hero totalSources={totalSources} />
      <Lineup />
      <HowItWorks totalSources={totalSources} />
      <FaqSection />
      <SignOff />
      <Colophon />
    </main>
  );
}
