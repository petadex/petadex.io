/**
 * Decorative "product shot" for the homepage Enzymes band.
 *
 * Static and illustrative — `/enzymes` doesn't exist yet in this rebuild
 * (see AGENTS.md in this directory's parent). The four enzymes are real
 * (PAZy-characterized PETases), but the resolver walkthrough on the right is
 * a mocked-up example, not a live lookup.
 */

const ENZYMES = [
  { name: "IsPETase", polymer: "PET" },
  { name: "LCC", polymer: "PET" },
  { name: "TfCut2", polymer: "PET · PBAT" },
  { name: "Cut190", polymer: "PET" },
]

const POLYMER_TAGS = ["PET", "PU", "PBAT", "PLA"]

const RESOLVER_STEPS = [
  { label: "ORF id", value: "SRR9012_ORF_44812" },
  { label: "GenBank", value: "GAP38373.1" },
  { label: "SRA library", value: "SRR9012844" },
]

export function EnzymesBandPreview() {
  return (
    <div className="border-border bg-surface-sunken relative grid aspect-16/10 max-h-105 w-full grid-cols-[1.15fr_1fr] overflow-hidden rounded-xl border">
      {/* Enzymes browser */}
      <div className="border-border flex min-w-0 flex-col gap-1.5 overflow-hidden border-r p-3">
        <span className="text-2xs text-muted-foreground font-semibold tracking-widest uppercase">
          Enzymes browser
        </span>
        <div className="text-muted-foreground grid grid-cols-[1.1fr_0.7fr_0.6fr] gap-1 border-b border-white/18 pb-1.5 font-mono text-[9px]">
          <span>enzyme</span>
          <span>polymer</span>
          <span>evidence</span>
        </div>
        {ENZYMES.map((e, i) => (
          <div
            key={e.name}
            className={`grid grid-cols-[1.1fr_0.7fr_0.6fr] gap-1 py-1.5 font-mono text-[9px] ${
              i === ENZYMES.length - 1
                ? "text-white/60"
                : "border-b border-white/10 text-white/90"
            }`}
          >
            <span>{e.name}</span>
            <span>{e.polymer}</span>
            <span className="text-accent">DOI</span>
          </div>
        ))}
        <div className="mt-auto flex flex-wrap gap-1">
          {POLYMER_TAGS.map(tag => (
            <span
              key={tag}
              className="rounded-full border border-white/18 px-1.5 py-0.5 font-mono text-[9px] text-white/80"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Identifier resolver */}
      <div className="flex min-w-0 flex-col gap-1.5 overflow-hidden p-3">
        <span className="text-2xs text-muted-foreground font-semibold tracking-widest uppercase">
          Resolve any id
        </span>
        {RESOLVER_STEPS.map(step => (
          <div
            key={step.label}
            className="bg-background min-w-0 rounded-md border border-white/15 px-2 py-1.5"
          >
            <div className="text-[8px] tracking-widest text-white/45 uppercase">
              {step.label}
            </div>
            <div className="overflow-hidden font-mono text-[10px] text-ellipsis whitespace-nowrap text-white/95">
              {step.value}
            </div>
          </div>
        ))}
        <div className="text-accent text-center font-mono text-xs">↓</div>
        <div className="flex flex-col gap-1 rounded-lg border border-white/18 bg-white/8 px-2.5 py-2">
          <div className="flex items-center justify-between gap-1.5">
            <span className="font-mono text-[10px] text-white/95">
              cluster_90 · 1174
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#4F8FE8]" />
          </div>
          <div className="text-muted-foreground flex justify-between font-mono text-[9px]">
            <span>members</span>
            <span className="text-white/90">318</span>
          </div>
          <div className="text-muted-foreground flex justify-between font-mono text-[9px]">
            <span>family</span>
            <span className="text-white/90">F-02291</span>
          </div>
          <div className="text-muted-foreground flex justify-between font-mono text-[9px]">
            <span>PAZy</span>
            <span className="text-success">1 characterized</span>
          </div>
        </div>
      </div>
    </div>
  )
}
