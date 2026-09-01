/**
 * Canonical catalog for CATH-domain pages.
 *
 * Credit: α/β hydrolase fold narrative from Lisa Chen (UxC999), commit 872eb18
 * (also present on ad5994e). Remote S3 JSON can still override via fetchCathDomainNarrative.
 */

/** @type {CatDomainCatalogEntry[]} */
export const CAT_DOMAIN_CATALOG = [
  {
    cathId: "3.40.50.1820",
    displayName: "α/β hydrolase fold",
    lastUpdated: "2026-07-24",
    contentCredit: "Domain writeup drafted by Lisa Chen (UxC999) for the CATH-domain scaffold (commit 872eb18); pending lead review for S3 hosting.",
    shortIntro: "The α/β-hydrolase fold was first defined by Ollis et al. (1992), who compared five hydrolytic enzymes with no significant sequence similarity - dienelactone hydrolase, haloalkane dehalogenase, wheat serine carboxypeptidase II, acetylcholinesterase, and a Geotrichum candidum lipase - and concluded that they had diverged from a common ancestor while retaining the spatial arrangement of their catalytic machinery.",
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
    overview: "[PENDING INFORMATION]",
    mechanism: { mcsa: null, customSummary: "", customDiagram: null },
    hmmMethod: {
      text:
        "[PENDING INFORMATION]",
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
    overview: "[PENDING INFORMATION]",
    mechanism: { mcsa: null, customSummary: "", customDiagram: null },
    hmmMethod: {
      text:
        "[PENDING INFORMATION]",
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
    overview: "[PENDING INFORMATION]",
    mechanism: { mcsa: null, customSummary: "", customDiagram: null },
    hmmMethod: {
      text:
        "[PENDING INFORMATION]",
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
    overview: "[PENDING INFORMATION]",
    mechanism: { mcsa: null, customSummary: "", customDiagram: null },
    hmmMethod: {
      text:
        "[PENDING INFORMATION]",
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
    overview: "[PENDING INFORMATION]",
    mechanism: { mcsa: null, customSummary: "", customDiagram: null },
    hmmMethod: {
      text:
        "[PENDING INFORMATION]",
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
