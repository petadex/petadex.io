/**
 * Canonical catalog for CAT-domain pages - one entry per CATH superfamily (e.g. `3.40.50.1820`,
 * the α/β-hydrolase fold). Curate mechanism, literature, HMM methodology, and logos here; do not
 * list member HMMs/Pfams manually - `CathDomain.buildAll()` (`models/CathDomain.js`) derives
 * those from `PFAM_PROFILE_CATALOG` by `cathId`, and auto-stubs any `cathId` missing an entry
 * here until a real one is added.
 *
 * Still incomplete - roughly 13 domains expected total.
 *
 * Logo images live under `frontend/static/cath/`, referenced here by path. Suggested filenames:
 *   HMM logo:      CAT_<cathId-no-dots>_hmmlogo_<PFXXXXX>.png (e.g. CAT_340501820_hmmlogo_PF00561.png)
 *   Sequence logo: CAT_<cathId-no-dots>_seqlogo_<component-or-label>.png
 * Strip dots from `cathId` in filenames; keep the full ID in captions/alt text.
 *
 * Every PDB id below (pdbId, pageStructurePdbId) must be verified against RCSB directly, never
 * invented.
 * @typedef {{ label: string, url?: string|null }} CathDomainReference
 * @typedef {{ imageSrc: string, caption: string, alt?: string, pfamAccession?: string|null }} CathDomainLogo
 *
 * @typedef {Object} CathDomainMcsaLink
 * @property {string} entryId          M-CSA entry id, e.g. "163" (numeric id used in M-CSA URLs)
 * @property {string} [enzymeName]     Human label for the linked M-CSA entry
 * @property {boolean} [hasDetailedMechanism]  True if M-CSA has step-by-step mechanism (not just site)
 *
 * @typedef {Object} CathDomainMechanism
 * @property {CathDomainMcsaLink|null} mcsa  Set when a matching M-CSA entry exists; null otherwise
 * @property {string} [customSummary]       Prose mechanism description (always shown if present)
 * @property {{ imageSrc: string, caption: string, alt?: string }|null} [customDiagram]
 *           Fallback/supplementary diagram - required when `mcsa` is null, optional otherwise
 * @property {{ enzyme: string, residues: string }} [catalyticTriad]
 *           Structured pull-quote of the catalytic residues already stated in `customSummary`,
 *           for the overview card badge. Prefer a PET-degrading representative's triad.
 *
 * @typedef {Object} CathDomainHmmMethodNote
 * @property {string} text    Short (1-2 sentence) domain-specific note on how member HMMs
 *                             were identified.
 * @property {CathDomainReference[]} [refs]  Optional citations for the methodology itself
 *
 * @typedef {Object} CathDomainStructureRow
 * @property {string} pdbId           PDB accession, e.g. "6EQE"
 * @property {string} structuralFocus     What this structure is / who solved it
 * @property {string} [resolution]    e.g. "0.92 Å"
 * @property {string} whatItshows      Why this specific entry is worth looking at
 * @property {string} [url]           Link to the RCSB page
 *
 * @typedef {Object} CathDomainCatalogEntry
 * @property {string} cathId              CATH superfamily id, e.g. "3.40.50.1820" (stable key)
 * @property {string} displayName         Human-readable title, e.g. "α/β hydrolase fold"
 * @property {string} lastUpdated         ISO date
 * @property {string} overview            Short domain identity/discovery blurb (renamed from
 *                                        `summary` - keep this brief; longer content belongs in
 *                                        the sections below, not stuffed back in here)
 * @property {string} [structuralArchitecture]  Freeform prose: what the fold looks like (β-sheet
 *                                        topology, nucleophile elbow, etc). Omit when
 *                                        `catalyticResidues` is set - the two are mutually
 *                                        exclusive (cath-domains.js renders one or the other).
 * @property {{ name: string, pdbId?: string }} [representativeEnzyme]
 *           The domain-defining enzyme shown in the overview card's art window. Should match an
 *           entry in `representativeStructures` when possible.
 * @property {string} [pageStructurePdbId]  PDB id seeding the full page's "Structure" 3D embed
 *                                        (distinct from the card's own `structureEmbedPdbId`).
 *                                        Overridden if the reader clicks a row in
 *                                        `representativeStructures`.
 * @property {{ catalyticTriad: string, secondary: { label: string, residues: string }[] }} [catalyticResidues]
 *           When set, replaces the `structuralArchitecture` prose + `representativeStructures`
 *           table with a compact residues section. The "Structure" embed always renders regardless.
 * @property {{
 *   groups: { id: string, label: string, color?: string }[],
 *   residues: { seqPos: number, label: string, group: string, note?: string }[],
 * }} [structureAnnotations]
 *           When set, "Structure" renders as an annotated `ProteinViewer` instead of the plain
 *           Mol* iframe. `seqPos` is `label_seq_id` from the `.pdb` file `ProteinViewer` fetches,
 *           not the mmCIF's label_seq_id or the auth/publication residue number in `label`. These
 *           three numbers disagree (e.g. 5XJH: auth 160 = .pdb label_seq_id 131 = mmCIF
 *           label_seq_id 148). Verify by downloading the exact `.pdb` file and counting ATOM/CA
 *           records directly.
 * @property {string} [mechanismComment]  When set, replaces the full `mechanism` panel with a
 *                                        single short prose comment.
 * @property {CathDomainMechanism} mechanism
 * @property {string} [functionalDiversity]  How varied the fold's functions are across the wider
 *                                        superfamily, beyond PETadex's own hits
 * @property {string} [petRelevance]      Why this fold matters for PET/plastic-degrading enzymes -
 *                                        grounded in real member data where possible
 * @property {string} [interactingDomains]  Accessory domains/modules pairing with the catalytic
 *                                        core (lid domains, P domains, PA domains, etc)
 * @property {CathDomainStructureRow[]} [representativeStructures]  Solved structures worth
 *                                        looking at
 * @property {CathDomainHmmMethodNote} hmmMethod
 * @property {CathDomainLogo[]} [hmmLogos]       One or more per member HMM, ideally
 * @property {CathDomainLogo[]} [sequenceLogos]  Consensus view, per component or pooled
 * @property {CathDomainReference[]} references  CAT-domain-level literature (distinct from
 *                                               per-Pfam references in pfamProfileCatalog.js)
 * @property {string} [status]  "stub" | "in-progress" | "curated" - drives the WIP banner in the UI
 */

/** @type {CathDomainCatalogEntry[]} */
export const CATH_DOMAIN_CATALOG = [
  {
    cathId: "3.40.50.1820",
    displayName: "α/β hydrolase fold",
    lastUpdated: "2026-07-24",
    overview:
      "Ollis et al. (1992) first defined the α/β-hydrolase fold by comparing five hydrolytic enzymes with no obvious sequence similarity - dienelactone hydrolase, haloalkane dehalogenase, wheat serine carboxypeptidase II, acetylcholinesterase, and a Geotrichum candidum lipase. Despite their different sequences, all five shared the same spatial arrangement of catalytic residues, pointing to a common evolutionary origin. In 1995, the ESTHER database (ESTerases, α/β-Hydrolase Enzymes and Relatives) was set up specifically to catalogue this superfamily. Within PETadex, the α/β-hydrolase fold is by far the most common catalytic fold, represented by 19 Pfam/HMM profiles in the current catalogue (see the HMMs-used table below).",
    structureEmbedPdbId: "1DIN",
    pageStructurePdbId: "5XJH",
    representativeEnzyme: { name: "FAST-PETase", pdbId: "7SH6" },
    catalyticResidues: {
      catalyticTriad: "S160, D206, H237",
      secondary: [
        { label: "Oxyanion Hole", residues: "Y87, M161" },
        { label: "Stabilizing Tryptophans", residues: "W159, W185" },
      ],
    },
    structureAnnotations: {
      groups: [
        { id: "catalytic-triad", label: "Catalytic Triad", color: "#ff2ea6" },
        { id: "oxyanion-hole", label: "Oxyanion Hole", color: "#22c55e" },
        { id: "stabilizing-trp", label: "Stabilizing Tryptophans", color: "#3b82f6" },
      ],
      // seqPos = label_seq_id from the .pdb file at files.rcsb.org/download/5XJH.pdb, not the
      // mmCIF's label_seq_id (see typedef above). Verified against the actual .pdb file's
      // ATOM/CA records.
      residues: [
        { seqPos: 131, label: "S160", group: "catalytic-triad", note: "Catalytic triad nucleophile - attacks the PET carbonyl carbon." },
        { seqPos: 177, label: "D206", group: "catalytic-triad", note: "Catalytic triad - stabilizes the histidine via charge relay." },
        { seqPos: 208, label: "H237", group: "catalytic-triad", note: "Catalytic triad general base - activates the serine nucleophile." },
        { seqPos: 58, label: "Y87", group: "oxyanion-hole", note: "Oxyanion hole - backbone amide stabilizes the tetrahedral intermediate." },
        { seqPos: 132, label: "M161", group: "oxyanion-hole", note: "Oxyanion hole - backbone amide stabilizes the tetrahedral intermediate." },
        { seqPos: 130, label: "W159", group: "stabilizing-trp", note: "Stabilizing tryptophan - pi-pi stacks with PET's aromatic ring." },
        { seqPos: 156, label: "W185", group: "stabilizing-trp", note: "Stabilizing tryptophan - pi-pi stacks with PET's aromatic ring." },
      ],
    },
    mechanismComment:
      "The catalytic triad performs a nucleophilic attack on the carboxyl group of the PET, forming an acyl-intermediate. The oxyanion hole stabilizes this tetrahedral intermediate using their amide backbones, while the tryptophans pi-pi stack with the TPA benzene rings. Water then replaces the nucleophile, and the PET is removed from the protein.",
    mechanism: { mcsa: null, customSummary: "", customDiagram: null },
    functionalDiversity:
      "The α/β-hydrolase fold is remarkably functionally diverse. Beyond esterases and lipases, documented members include peptidases, epoxide hydrolases, dehalogenases, and even non-catalytic proteins that keep the fold purely as a structural scaffold. Some peptidase families resemble the fold closely enough to trip up automated classification tools. Dimitriou et al. (2017) mapped the conserved structural elements around the catalytic machinery across 40 α/β-hydrolase families, showing how one shared framework has been repurposed for many different reactions. The takeaway: knowing a protein has this fold tells you its shape, not what it does - substrate specificity and function have to be determined separately.",
    interactingDomains:
      "Many α/β-hydrolases have lids, caps, or other structures built into the fold itself - not separate domains, just insertions - that control which substrates can reach the active site. In lipases, these lids can even open up on contact with a lipid-water interface (Khan et al., 2017). \n\nMHETase is a good example: it pairs an α/β-hydrolase catalytic domain with a large lid that helps recognize substrate and shapes the binding pocket (Palm et al., 2019). \n\nIsPETase, by contrast, has a shallow, exposed active-site cleft with no real lid, part of why it can access PET's bulky polymer surface so easily (Joo et al., 2018). These lid/cleft features differ a lot from family to family - don't assume every PETadex member looks like either example.",
    hmmMethod: {
      text:
        "",
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
      { label: "Lu, H. et al. (2022). Machine learning-aided engineering of hydrolases for PET depolymerization. Nature, 604(7907), 662-667.", url: "https://doi.org/10.1038/s41586-022-04599-z" },
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
      refs: [],
    },
    hmmLogos: [],
    sequenceLogos: [],
    references: [],
    status: "stub",
  },
  {
    cathId: "3.60.70.12",
    displayName: "Peptidase / hydrolase-associated fold",
    lastUpdated: "2026-07-14",
    overview: "Curation pending.",
    mechanism: { mcsa: null, customSummary: "", customDiagram: null },
    hmmMethod: {
      text:
        "Component-to-CAT-domain mapping not yet confirmed for this fold.",
      refs: [],
    },
    hmmLogos: [],
    sequenceLogos: [],
    references: [],
    status: "stub",
  },
  {
    cathId: "3.90.1300.10",
    displayName: "Amidase-signature fold",
    lastUpdated: "2026-07-14",
    overview: "Curation pending.",
    mechanism: { mcsa: null, customSummary: "", customDiagram: null },
    hmmMethod: {
      text:
        "Component-to-CAT-domain mapping not yet confirmed for this fold.",
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
      refs: [],
    },
    hmmLogos: [],
    sequenceLogos: [],
    references: [],
    status: "stub",
  },
  // TBDX / TBDY / TBDZ from cathColors.js aren't listed here; CathDomain.buildAll() auto-stubs
  // them under their placeholder key until a real entry is added above (or in family_atlas).
]

export default CATH_DOMAIN_CATALOG
