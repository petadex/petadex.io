/**
 * Canonical catalog for CAT-domain pages.
 *
 * Each entry represents one CATH superfamily shown as a "CATH domain" in the UI.
 * For example, several Pfam profiles in `CATH_DOMAIN_CATALOG` may map to
 * `3.40.50.1820`, the α/β-hydrolase fold.
 *
 * Curate CAT-domain-level content here:
 * - mechanism
 * - literature
 * - HMM discovery methodology
 * - HMM logos
 * - sequence logos
 *
 * Do not list member HMMs or Pfams manually. `buildCatDomainModels.js` derives them
 * from `CATH_DOMAIN_CATALOG` by grouping entries with the same `cathId`.
 *
 * This catalog is still incomplete. The final number of CAT domains is being
 * confirmed, with roughly 13 expected. If a `cathId` appears in
 * `CATH_DOMAIN_CATALOG` but has no entry here, `buildCatDomainModels.js` creates
 * a temporary stub so the page can still render. Adding the real entry here
 * replaces that stub automatically.
 *
 * Store HMM and sequence logo images under `frontend/static/cath/` and reference
 * them here by path.
 *
 * Suggested filenames:
 *   HMM logo:      CAT_<cathId-no-dots>_hmmlogo_<PFXXXXX>.png
 *                  e.g. CAT_340501820_hmmlogo_PF00561.png
 *   Sequence logo: CAT_<cathId-no-dots>_seqlogo_<component-or-label>.png
 *
 * Strip dots from `cathId` in filenames, but keep the full ID in captions and
 * alt text.
 * @typedef {{ label: string, url?: string|null }} CatDomainReference
 * @typedef {{ imageSrc: string, caption: string, alt?: string, pfamAccession?: string|null }} CatDomainLogo
 *
 * @typedef {Object} CatDomainMcsaLink
 * @property {string} entryId          M-CSA entry id, e.g. "163" (numeric id used in M-CSA URLs)
 * @property {string} [enzymeName]     Human label for the linked M-CSA entry
 * @property {boolean} [hasDetailedMechanism]  True if M-CSA has step-by-step mechanism (not just site)
 *
 * @typedef {Object} CatDomainMechanism
 * @property {CatDomainMcsaLink|null} mcsa  Set when a matching M-CSA entry exists; null otherwise
 * @property {string} [customSummary]       Prose mechanism description (always shown if present)
 * @property {{ imageSrc: string, caption: string, alt?: string }|null} [customDiagram]
 *           Fallback/supplementary diagram - required when `mcsa` is null, optional otherwise
 *
 * @typedef {Object} CatDomainHmmMethodNote
 * @property {string} text    Short (1-2 sentence) domain-specific note on how member HMMs
 *                             were identified. For the shared project-wide pipeline
 *                             explanation, don't repeat it here - link `methodologyAnchor`
 *                             to the relevant section of `/methodology` instead.
 * @property {string} [methodologyAnchor]  Anchor id on `/methodology` for "read the full
 *                             pipeline" (e.g. "hmm-generation"). Omit if not yet applicable.
 * @property {CatDomainReference[]} [refs]  Optional citations for the methodology itself
 *
 * @typedef {Object} CatDomainStructureRow
 * @property {string} pdbId           PDB accession, e.g. "6EQE" - verify against RCSB directly,
 *                                     never guess an id
 * @property {string} structuralFocus     What this structure is / who solved it
 * @property {string} [resolution]    e.g. "0.92 Å"
 * @property {string} whatItshows      Why this specific entry is worth looking at
 * @property {string} [url]           Link to the RCSB page
 *
 * @typedef {Object} CatDomainCatalogEntry
 * @property {string} cathId              CATH superfamily id, e.g. "3.40.50.1820" (stable key)
 * @property {string} displayName         Human-readable title, e.g. "α/β hydrolase fold"
 * @property {string} lastUpdated         ISO date
 * @property {string} overview            Short domain identity/discovery blurb (renamed from
 *                                        `summary` - keep this brief; longer content belongs in
 *                                        the sections below, not stuffed back in here)
 * @property {string} [structuralArchitecture]  Freeform prose: the fold itself (β-sheet topology,
 *                                        nucleophile elbow, etc. - the "what does this fold look
 *                                        like" section)
 * @property {CatDomainMechanism} mechanism
 * @property {string} [functionalDiversity]  Freeform prose: how varied the fold's functions are
 *                                        across the wider superfamily (beyond PETadex's own hits)
 * @property {string} [petRelevance]      Freeform prose: why this fold matters specifically for
 *                                        PET/plastic-degrading enzymes - usually the section
 *                                        readers most want, keep it grounded in real member data
 *                                        where possible rather than only general fold literature
 * @property {string} [interactingDomains]  Freeform prose: accessory domains/modules that pair
 *                                        with the catalytic core across the fold (lid domains,
 *                                        P domains, PA domains, etc.) and what they do
 * @property {CatDomainStructureRow[]} [representativeStructures]  Table of solved structures
 *                                        worth looking at for this fold - every pdbId must be
 *                                        verified against RCSB before adding, not guessed
 * @property {CatDomainHmmMethodNote} hmmMethod
 * @property {CatDomainLogo[]} [hmmLogos]       One or more per member HMM, ideally
 * @property {CatDomainLogo[]} [sequenceLogos]  Consensus view, per component or pooled
 * @property {CatDomainReference[]} references  CAT-domain-level literature (distinct from
 *                                               per-Pfam references already in cathDomainCatalog.js)
 * @property {string} [status]  "stub" | "in-progress" | "curated" - drives the WIP banner in the UI
 */

/** @type {CatDomainCatalogEntry[]} */
export const CAT_DOMAIN_CATALOG = [
  {
    cathId: "3.40.50.1820",
    displayName: "α/β hydrolase fold",
    lastUpdated: "2026-07-24",
    overview:
      "The α/β-hydrolase fold was first defined by Ollis et al. (1992), who compared five hydrolytic enzymes with no significant sequence similarity - dienelactone hydrolase, haloalkane dehalogenase, wheat serine carboxypeptidase II, acetylcholinesterase, and a Geotrichum candidum lipase - and concluded that they had diverged from a common ancestor while retaining the spatial arrangement of their catalytic machinery. Three years later, in 1995, the dedicated ESTHER database (ESTerases, α/β-Hydrolase Enzymes and Relatives) was established to catalogue proteins belonging to this superfamily. The α/β-hydrolase fold is the predominant catalytic fold among PETadex hits, represented by 19 Pfam/HMM profiles in the current catalogue (see the HMMs-used table below).",
    structuralArchitecture:
      "The fold is built around a central β-sheet - canonically comprising eight strands, mostly parallel, with the second strand antiparallel to the others - flanked on both faces by α-helices. The catalytic triad lies on loops connecting these secondary-structure elements. The most highly conserved of these is the nucleophile elbow: a tight γ-turn immediately following β-strand 5 that is sufficiently constrained to serve as a structural anchor when superimposing otherwise divergent family members (Ollis et al., 1992). Heikinheimo et al. (1999) grouped members of the superfamily into “siblings” (close sequence relatives), “cousins” (more distant relatives), and broader groups recognizable primarily by the nucleophile elbow. \n\nThe structure shown above is dienelactone hydrolase (Pathak D. & Ollis D., 1990), whose catalytic triad is Cys123–His202–Asp171. Unlike the more common serine nucleophile seen across the α/β hydrolase fold, it uses cysteine as its nucleophile. The residue identity varies across the fold, while its structural position is retained. \n\n**Explore the active site:** switch to Selection Mode and select Cys123. His202 and Asp171 can be located through the Sequence Panel.",
    structureEmbedPdbId: "1DIN",
      mechanism: {
    mcsa: { entryId: "631", enzymeName: "Cutinase", hasDetailedMechanism: true },
    steps: [
    { title: "Activation", description: "His acts as a general base, deprotonating the nucleophile (usually Ser) positioned on the nucleophile elbow, oriented by an acidic residue via charge-relay." },
    { title: "Acylation", description: "The activated nucleophile attacks the substrate carbonyl, forming a tetrahedral intermediate stabilized by the oxyanion hole, then collapsing to a covalent acyl-enzyme intermediate." },
    { title: "Deacylation", description: "A water molecule, activated the same way, attacks the acyl-enzyme intermediate to release product and regenerate the enzyme." },
    ],
      customSummary:
      "In IsPETase, Ser160–Asp206–His237 form the catalytic triad, while the backbone amides of Tyr87 and Met161 form the oxyanion hole. Trp159 and Trp185 help position PET’s aromatic chain near the active site. \n\nA 2024 transition-path-sampling study (Burgin et al., 2024) proposed that deacylation is the slower chemical step and that His237 changes position to shuttle protons during catalysis. The same study suggested that Trp185 flexibility may help the enzyme progress through this reaction. These conclusions are computational and remain model-dependent. \n\nPETase functions alongside MHETase, another member of the fold (Palm et al. 2019), which hydrolyzes MHET to terephthalic acid and ethylene glycol.",
      customDiagram: null,
    },
    functionalDiversity:
      "A conserved α/β-hydrolase fold can support remarkably diverse functions. Beyond esterases and lipases, documented members include peptidases, epoxide hydrolases, dehalogenases, and non-catalytic proteins that retain the fold as a structural scaffold. Some peptidase families overlap sufficiently with the fold to complicate automated annotation. Dimitriou et al. (2017) identified conserved structural elements surrounding the catalytic machinery across 40 α/β-hydrolase families, showing how a common catalytic framework has been adapted to diverse reactions. Structural assignment to the fold alone is therefore insufficient to infer substrate specificity or catalytic function.",
    interactingDomains:
      "Many α/β-hydrolases contain lids, caps or inserted domains that help define substrate access and specificity. Lipase lids can also undergo conformational opening at lipid–water interfaces (Khan et al., 2017). \n\nMHETase, for example, combines an α/β-hydrolase catalytic domain with a large lid domain that contributes to substrate recognition and shapes the binding pocket (Palm et al., 2019). \n\nBy contrast, IsPETase has a relatively exposed, shallow active-site cleft that facilitates interaction with the PET surface (Joo et al., 2018). These features vary substantially between families and should not be assumed for every PETadex member.",
    representativeStructuresNote:
      "These structures illustrate complementary aspects of the fold: the overall architecture of IsPETase, residues implicated in PET recognition and catalysis, and the contrasting lid-gated organization found in a more conventional lipase.",
    representativeStructures: [
      {
        pdbId: "6EQE",
        structuralFocus: "Overall architecture",
        resolution: "0.92 Å",
        whatItshows: "Overall architecture - ultra-high-resolution IsPETase structure showing its open active-site cleft",
        url: "https://www.rcsb.org/structure/6EQE",
      },
      {
        pdbId: "5XJH",
        structuralFocus: "Catalysis and substrate recognition",
        resolution: "1.5 Å",
        whatItshows: "catalytic triad and proposed PET-binding subsites",
        url: "https://www.rcsb.org/structure/5XJH",
      },
      {
        pdbId: "2OXE",
        structuralFocus: "Lid-gated comparison",
        resolution: "2.8 Å",
        whatItshows: "non-PET-degrading Lipase_2 member showing restricted active-site access",
        url: "https://www.rcsb.org/structure/2OXE",
      },
    ],
    hmmMethod: {
      text:
        "",
      methodologyAnchor: "hmm-generation",
      refs: [],
    },
    hmmLogos: [],
    sequenceLogos: [],
    references: [
      { label: "Burgin, T. et al. (2024). The reaction mechanism of the Ideonella sakaiensis PETase enzyme. Communications Chemistry, 7, article 65.", url: "https://doi.org/10.1038/s42004-024-01154-x" },
      { label: "Dimitriou, P.S. et al. (2017). Alpha/beta-hydrolases: a unique structural motif... Proteins, 85(10), 1845-1855.", url: "https://doi.org/10.1002/prot.25338" },      
      { label: "Heikinheimo, P. et al. (1999). Of barn owls and bankers: a lush variety of α/β hydrolases. Structure, 7(6), R141-R146.", url: "https://doi.org/10.1016/S0969-2126(99)80079-3" },      
      { label: "Joo, S. et al. (2018). Structural insight into molecular mechanism of poly(ethylene terephthalate) degradation. Nature Communications, 9, 382.", url: "https://doi.org/10.1038/s41467-018-02881-1" },
      { label: "Khan, F.I. et al. (2017). The lid domain in lipases: structural and functional determinant of enzymatic properties. Frontiers in Bioengineering and Biotechnology, 5, 16.", url: "https://doi.org/10.3389/fbioe.2017.00016" },
      { label: "Martinez, C. et al. (1992). Fusarium solani cutinase is a lipolytic enzyme with a catalytic serine accessible to solvent. Nature, 356, 615-618.", url: "https://doi.org/10.1038/356615a0" },
      { label: "Ollis, D.L. et al. (1992). The α/β hydrolase fold. Protein Engineering, 5(3), 197-211.", url: "https://doi.org/10.1093/protein/5.3.197" },      
      { label: "Palm, G.J. et al. (2019). Structure of the plastic-degrading Ideonella sakaiensis MHETase bound to a substrate. Nature Communications, 10, 1717.", url: "https://doi.org/10.1038/s41467-019-09326-3" },    
      { label: "Pathak D. & Ollis D. (1990). Refined structure of dienelactone hydrolase at 1.8A.", url: "https://doi.org/10.1016/0022-2836(90)90196-s" },
    ],
    status: "in-progress",
  },
  {
    cathId: "3.40.710.10",
    displayName: "β-lactamase/transpeptidase-like fold",
    lastUpdated: "2026-07-14",
    overview: "Curation pending.",
    mechanism: { mcsa: null, customSummary: "", customDiagram: null },
    hmmMethod: {
      text:
        "Component-to-CAT-domain mapping not yet confirmed for this fold.",
      methodologyAnchor: "hmm-generation",
      refs: [],
    },
    hmmLogos: [],
    sequenceLogos: [],
    references: [],
    status: "stub",
  },
  {
    cathId: "3.60.70.12",
    displayName: "Amidase-signature fold",
    lastUpdated: "2026-07-14",
    overview: "Curation pending.",
    mechanism: { mcsa: null, customSummary: "", customDiagram: null },
    hmmMethod: {
      text:
        "Component-to-CAT-domain mapping not yet confirmed for this fold.",
      methodologyAnchor: "hmm-generation",
      refs: [],
    },
    hmmLogos: [],
    sequenceLogos: [],
    references: [],
    status: "stub",
  },
  {
    cathId: "3.90.1300.10",
    displayName: "Peptidase / hydrolase-associated fold",
    lastUpdated: "2026-07-14",
    overview: "Curation pending.",
    mechanism: { mcsa: null, customSummary: "", customDiagram: null },
    hmmMethod: {
      text:
        "Component-to-CAT-domain mapping not yet confirmed for this fold.",
      methodologyAnchor: "hmm-generation",
      refs: [],
    },
    hmmLogos: [],
    sequenceLogos: [],
    references: [],
    status: "stub",
  },
  {
    cathId: "2.40.10.10",
    displayName: "Trypsin-like serine protease fold",
    lastUpdated: "2026-07-14",
    overview: "Curation pending.",
    mechanism: { mcsa: null, customSummary: "", customDiagram: null },
    hmmMethod: {
      text:
        "Component-to-CAT-domain mapping not yet confirmed for this fold.",
      methodologyAnchor: "hmm-generation",
      refs: [],
    },
    hmmLogos: [],
    sequenceLogos: [],
    references: [],
    status: "stub",
  },
  {
    cathId: "2.60.40.420",
    displayName: "Multicopper oxidase-like fold",
    lastUpdated: "2026-07-14",
    overview: "Curation pending.",
    mechanism: { mcsa: null, customSummary: "", customDiagram: null },
    hmmMethod: {
      text:
        "Component-to-CAT-domain mapping not yet confirmed for this fold.",
      methodologyAnchor: "hmm-generation",
      refs: [],
    },
    hmmLogos: [],
    sequenceLogos: [],
    references: [],
    status: "stub",
  },
  // TBDX / TBDY / TBDZ from cathColors.js intentionally omitted here - they don't have a real
  // CATH id yet, so buildCatDomainModels.js will auto-stub them under their placeholder key
  // until they're resolved and get a real entry above (or in family_atlas).
]

export default CAT_DOMAIN_CATALOG
