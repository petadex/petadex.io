/**
 * Decorative "product shot" for the homepage Search band.
 *
 * Static and illustrative, not wired to the live search pipeline — `/search`
 * doesn't exist yet in this rebuild (see AGENTS.md in this directory's
 * parent), so there is nothing real to embed. The hit rows and timing are
 * representative shapes for the layout, not a performance claim; the ORF
 * count is real (passed in from the same corpus summary the rest of the
 * page reads) so it can't drift from the proof chip next to it.
 */

const HITS = [
  {
    orf: "SRR9012_ORF_44812",
    ident: "99.4",
    cov: "100",
    evalue: "0.0",
    bar: 100,
    color: "#4F8FE8",
  },
  {
    orf: "SRR2277_ORF_09117",
    ident: "71.2",
    cov: "96",
    evalue: "2e-171",
    bar: 71,
    color: "#4F8FE8",
  },
  {
    orf: "SRR6641_ORF_18330",
    ident: "58.9",
    cov: "91",
    evalue: "4e-122",
    bar: 59,
    color: "#2ECC71",
  },
  {
    orf: "SRR1148_ORF_70254",
    ident: "41.6",
    cov: "84",
    evalue: "8e-77",
    bar: 42,
    color: "#F2C94C",
  },
]

export function SearchBandPreview({
  orfCountLabel,
}: {
  orfCountLabel: string
}) {
  return (
    <div className="border-border bg-surface-sunken relative grid aspect-16/10 max-h-105 w-full grid-cols-[0.85fr_1.15fr] overflow-hidden rounded-xl border">
      {/* Query pane */}
      <div className="border-border flex min-w-0 flex-col gap-2 border-r p-3">
        <span className="text-2xs text-muted-foreground font-semibold tracking-widest uppercase">
          Query
        </span>
        <div className="border-border/60 bg-background text-2xs flex-1 rounded-lg border p-2 font-mono leading-relaxed text-white/80">
          <div className="text-accent">&gt;query|IsPETase</div>
          <div>MNFPRASRLMQAAVLGGLMAVSAAATAQ</div>
          <div>PNPTAASLEASAGPFTVRSFTVSRPSGY</div>
          <div>PTNAGGTVGAIAIVPGYTARQSSIKWWG</div>
          <div>FVVITIDTNSTLDQPSSRSSQQMAALRQ</div>
          <div className="text-white/40">…</div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="bg-accent text-2xs rounded-md px-2.5 py-1 font-medium text-black">
            Search
          </span>
          <span className="text-success text-2xs font-mono">● 43.8s</span>
        </div>
      </div>

      {/* Hits pane */}
      <div className="flex min-w-0 flex-col gap-1.5 overflow-hidden p-3">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-2xs text-muted-foreground font-semibold tracking-widest uppercase">
            Hits
          </span>
          <span className="text-muted-foreground rounded-full border border-white/18 px-1.5 py-0.5 font-mono text-[9px] whitespace-nowrap">
            32 shards · {orfCountLabel} ORFs
          </span>
        </div>
        <div className="text-muted-foreground grid grid-cols-[1.5fr_0.55fr_0.45fr_0.7fr_0.9fr] gap-1 border-b border-white/18 pb-1.5 font-mono text-[9px]">
          <span>ORF</span>
          <span>ident</span>
          <span>cov</span>
          <span>e-val</span>
          <span>aln</span>
        </div>
        {HITS.map((hit, i) => (
          <div
            key={hit.orf}
            className={`grid grid-cols-[1.5fr_0.55fr_0.45fr_0.7fr_0.9fr] items-center gap-1 py-1.5 font-mono text-[9px] ${
              i === HITS.length - 1
                ? "text-white/60"
                : "border-b border-white/10 text-white/90"
            }`}
          >
            <span className="overflow-hidden text-ellipsis">{hit.orf}</span>
            <span>{hit.ident}</span>
            <span>{hit.cov}</span>
            <span>{hit.evalue}</span>
            <span
              className="h-1.5 rounded-full"
              style={{
                background: `linear-gradient(to right, ${hit.color} ${hit.bar}%, rgba(255,255,255,0.08) ${hit.bar}%)`,
              }}
            />
          </div>
        ))}
        <div className="bg-background mt-auto flex items-center justify-between gap-1.5 rounded-md border border-white/10 px-2 py-1.5 font-mono text-[9px]">
          <span className="text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
            petadex.net/search/3f9c1a2e
          </span>
          <span className="text-accent whitespace-nowrap">copy link</span>
        </div>
      </div>
    </div>
  )
}
