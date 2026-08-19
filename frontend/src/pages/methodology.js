import React from "react"
import Seo from "../components/seo"
import Container from "../components/common/Container"
import { useScrollHeader } from "../hooks/useScrollHeader"

/**
 * Shared methodology reference, linked from every CAT-domain page's "HMMs used" section
 * instead of repeating the full writeup on each entry. Content should stay attributable —
 * link back to source docs/scripts in the `root` repo rather than restating from memory.
 */
const MethodologyPage = () => {
  useScrollHeader()

  return (
    <section className="py-16 md:py-20">
      <Container>
        <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-2">
          Reference
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold text-primary mb-4">Methodology</h1>
        <p className="text-muted-foreground text-base leading-relaxed max-w-3xl mb-10">
          How PETadex's underlying data was generated — linked from CAT-domain and Pfam pages
          wherever a "how was this found" note points here, instead of repeating the same
          writeup on every entry.
        </p>

        <article
          id="hmm-generation"
          className="scroll-mt-28 rounded-2xl border border-border bg-card/40 p-5 md:p-8 max-w-3xl"
        >
          <h2 className="text-xl md:text-2xl font-semibold text-primary mb-1">
            Component-level HMM generation (PAZy HMMs)
          </h2>
          <p className="text-xs text-muted-foreground mb-6">
            Thomas Quigley · completed May 24, 2026 · scripts:{" "}
            <span className="font-mono">root/scripts/3_pazyhmm_generation/</span>
          </p>

          <h3 className="text-base font-semibold text-foreground mt-6 mb-2">Why</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            PETadex's sequence space was originally built using Pfam HMMs. Those HMMs turned out
            not to guarantee a <em>complete</em> catalytic domain — a sequence could score a
            Pfam hit while still missing one or more of the residues that actually make it
            catalytically active. New HMMs were needed that only matched sequences known to
            retain the full catalytic residue set.
          </p>

          <h3 className="text-base font-semibold text-foreground mt-6 mb-2">Inputs</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            A separate HMM was built for each of the 42 atlas components, seeded from 211
            reference sequences drawn from the{" "}
            <a
              href="https://www.pazy.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover underline underline-offset-2"
            >
              PAZy database
            </a>{" "}
            (Plastics-Active enZymes — Buchholz et al. 2022,{" "}
            <a
              href="https://doi.org/10.1002/prot.26325"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover underline underline-offset-2"
            >
              doi.org/10.1002/prot.26325
            </a>
            ). Predicted signal peptides were removed with SignalP 5.0,
            and per-component multiple sequence alignments were built with MUSCLE 5.3. Catalytic
            residues for each component were annotated from published literature onto reference
            structures, then transferred onto the corresponding HMM match-state columns.
          </p>

          <h3 className="text-base font-semibold text-foreground mt-6 mb-2">
            Iterative refinement (3 cycles)
          </h3>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground leading-relaxed mb-4">
            <li>
              <span className="font-mono text-foreground">hmmbuild</span> an HMM from the current
              component alignment.
            </li>
            <li>
              <span className="font-mono text-foreground">hmmalign</span> the HMM against an
              annotated reference sequence to transfer catalytic-residue positions onto HMM match
              states.
            </li>
            <li>
              <span className="font-mono text-foreground">hmmsearch</span> the HMM against the
              full PETadex BlastNR database.
            </li>
            <li>
              Keep only hits where <strong>every</strong> annotated catalytic residue is present
              at the correct consensus column, at i-Evalue ≤ 1×10⁻⁵ — hits missing any catalytic
              residue are discarded regardless of overall sequence similarity.
            </li>
            <li>Rebuild the HMM from that catalytically-verified alignment and repeat.</li>
          </ol>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            This was run for 3 full cycles per component. Benchmarking showed the number of raw
            HMM hits peaked at the 3rd rebuilt HMM, while the number of catalytically-intact hits
            peaked at the 4th — i.e. the process was still gaining catalytic specificity slightly
            past where raw hit count plateaued.
          </p>

          <h3 className="text-base font-semibold text-foreground mt-6 mb-2">Result</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            A hit against a PAZy HMM means the sequence is confirmed to carry a complete
            catalytic domain for that component — not just sequence similarity to it. The HMMs
            also report the specific amino acid present at each catalytic column for every hit.
          </p>

          <div className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-300/90">
            Component-to-CAT-domain mapping (which of the 42 components feed into which CATH
            superfamily) is not yet documented here — confirm with Thomas/Dennis before citing a
            specific component under a specific CATH domain.
          </div>
        </article>
      </Container>
    </section>
  )
}

export default MethodologyPage

export const Head = () => (
  <Seo
    title="Methodology"
    description="How PETadex's HMMs, catalytic-residue annotations, and domain classifications were generated."
  />
)
