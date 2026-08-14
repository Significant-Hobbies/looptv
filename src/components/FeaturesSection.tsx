interface Feature {
  title: string;
  body: string;
}

export default function FeaturesSection({
  features,
  className = '',
}: {
  features: Feature[];
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Why LoopTV</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-sm font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-xs leading-5 text-zinc-400">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
