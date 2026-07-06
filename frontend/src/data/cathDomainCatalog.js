/**
 * Canonical Pfam-centered catalog for `/cath-domains` (literature review signup sheet order).
 * **23 profiles** (3HBOH … RoxA-like_Cyt-c). Narrative fields are living curation targets.
 *
 * Figures: add files under `frontend/static/cath/` and set `imageSrc: "/cath/yourfile.ext"` on
 * an entry’s `figures[]` item. Pfam→atlas counts: edit `pfamAtlasMap.js` or set `atlasComponent`
 * on an entry when validated.
 *
 * In-text [N] citations: paste source URLs into narrative fields. Numbers follow page reading order
 * (overview → sections → inline figure captions). Duplicate PDB/DOI/PMC URLs share one number.
 * Warnings print on `npm run develop`; set VALIDATE_CATH_REFS=strict to fail builds on violations.
 *
 * @typedef {{ label: string, url?: string|null }} CathDomainReference
 * @typedef {{ label: string, cathId: string }} CathDomainLegendSegment
 * @typedef {{ caption: string, imageSrc?: string|null, alt?: string }} CathDomainFigure
 *
 * @typedef {Object} CathDomainCatalogEntry
 * @property {string} id  Stable id, e.g. pf-PF01425
 * @property {string} pfamAccession  Uppercase PFxxxxx
 * @property {string} profileHmm  Short Pfam family name (signup sheet)
 * @property {number|null} [atlasComponent]  PETadex atlas component when known
 * @property {string} cathId  Representative CATH node for visualization (refine per entry)
 * @property {string} displayName  Human-readable title
 * @property {string} lastUpdated  ISO date
 * @property {string} summary
 * @property {string} localization
 * @property {string} ptms
 * @property {string} catalyticResidues
 * @property {string} [mechanisms]
 * @property {string} [interactingDomains]
 * @property {string} function
 * @property {string} [regulation]
 * @property {string} [variability]
 * @property {string} [structure]
 * @property {string} [moreInformation]  Optional extra context block rendered under summary
 * @property {{ imageSrc: string, caption: string, alt?: string }} [moreInformationFigure]
 * @property {{ caption: string, headers: string[], rows: string[][] }} [preLocalizationTable]
 * @property {{ caption: string, headers: string[], rows: string[][] }} [postLocalizationTable]
 * @property {{ caption: string, headers: string[], rows: string[][] }} [prePtmsTable]
 * @property {{ caption: string, headers: string[], rows: string[][] }} [postCatalyticResiduesTable]
 * @property {{ caption: string, headers: string[], rows: string[][] }} [postStructureTable]
 * @property {string} [labNotes]  Wet-lab / assay notes (renders as “Lab notes” when present)
 * @property {CathDomainReference[]} references
 * @property {CathDomainLegendSegment[]} [legendSegments]
 * @property {(string|CathDomainFigure)[]} [figures]  Strings treated as caption-only figures
 * @property {string[]} [pdbIds]  PDB IDs for Mol* / RCSB shortcuts (e.g. ["6TKX"])
 * @property {{ label: string, url: string }[]} [resourceLinks]  Extra curated outbound links (merged with auto PETadex/CATH/PDB links in the UI)
 * @property {string|null} [hmmLogoImage]  Optional locally committed HMM logo image (e.g. "/cath/hmm/PF01674_logo.png"); when set it renders inline, otherwise the profile links out to the InterPro logo
 */

const PF = acc => `https://www.ebi.ac.uk/interpro/entry/pfam/${acc}/`

/** @param {string} acc */
function pfamRefs(acc, extraLabel, extraUrl) {
  const refs = [
    {
      label: `Pfam / InterPro: ${acc}`,
      url: PF(acc),
    },
    {
      label: "Pfam: protein domain families database",
      url: "https://www.ebi.ac.uk/interpro/",
    },
  ]
  if (extraLabel && extraUrl) refs.push({ label: extraLabel, url: extraUrl })
  return refs
}

/** @type {CathDomainCatalogEntry[]} */
export const CATH_DOMAIN_CATALOG = [
  {
    id: "pf-PF10605",
    pfamAccession: "PF10605",
    profileHmm: "3HBOH",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "3-hydroxyisobutyryl-CoA hydrolase-related",
    lastUpdated: "2026-05-04",
    summary:
      "The 3HBOH domain family includes CoA-dependent hydrolase modules involved in valine/leucine catabolism and related pathways. PETadex sequences carrying this domain should be interpreted alongside pathway context and cofactor availability.",
    localization:
      "Typically cytosolic or matrix-localized in bacteria and mitochondria of eukaryotes; secretion is uncommon unless fused to signal peptides—verify per genome.",
    ptms:
      "Acetylation and oxidation of surface lysines/cysteines can occur; systematic PTMs for this Pfam are best cited from organism-specific proteomics.",
    catalyticResidues:
      "Conserved catalytic machinery follows the α/β hydrolase pattern (nucleophile–acid–His triad or dyad variants); map residues to a reference structure when annotating PETadex hits.",
    function:
      "Hydrolytic cleavage of 3-hydroxyisobutyryl-CoA and related thioesters; paralogs may accept altered acyl chains—use assays with physiological CoA thioesters where possible.",
    labNotes:
      "Express with cognate CoA ligases if reconstructing pathways; assay pH and divalent metals as for other CoA hydrolases.",
    references: pfamRefs("PF10605"),
    legendSegments: [{ label: "Representative CATH", cathId: "3.40.50.1820" }],
    figures: [{ caption: "Add domain topology or representative PDB ribbon after curation." }],
  },
  {
    id: "pf-PF00561",
    pfamAccession: "PF00561",
    profileHmm: "Abhydrolase_1",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Abhydrolase domain (α/β hydrolase fold)",
    lastUpdated: "2026-05-04",
    summary:
      "Abhydrolase_1 is the canonical α/β hydrolase domain spanning lipases, esterases, epoxide hydrolases, and dehalogenases. Plastic-degrading homologs often cluster here; substrate specificity is not predictable from sequence alone.",
    localization:
      "Extracellular, periplasmic, inner membrane–attached, or cytosolic depending on secretion signals and fusion architecture.",
    ptms:
      "Disulfides and N-linked glycans appear in secreted eukaryotic homologs; bacterial PET enzymes may lack glycosylation.",
    catalyticResidues:
      "Typical catalytic triad (Ser/Cys, Asp/Glu, His) or evolved variations; compare to PDB templates when assigning catalytic positions in PETadex alignments.",
    function:
      "Hydrolysis of ester, amide, or haloalkyl bonds depending on specialization; plastic activity requires docking assays against polyester substrates.",
    labNotes:
      "Profile HMM hits require boundary checks—catalytic domain may be embedded in multi-domain PETases.",
    references: pfamRefs(
      "PF00561",
      "Holmquist M. Alpha/beta-hydrolase fold enzymes: structures, functions and catalytic mechanisms. Curr Opin Struct Biol. 2000.",
      "https://doi.org/10.1016/S0959-440X(99)00076-1",
    ),
    legendSegments: [{ label: "α/β hydrolase", cathId: "3.40.50.1820" }],
    figures: [{ caption: "Schematic: nucleophilic elbow and oxyanion hole (replace with curated figure)." }],
  },
  {
    id: "pf-PF12695",
    pfamAccession: "PF12695",
    profileHmm: "Abhydrolase_5",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Alpha/beta hydrolase domain 5 (ABHD5)",
    lastUpdated: "2026-06-28",
    summary:
      "WORK IN PROGRESS: Curated by Noorine Muneer. Several sections remain empty and in-text citations are still being completed. Alpha/Beta Hydrolase-Containing Domain 5 (ABHD5) belongs to the α/β hydrolase (ABH) superfamily (https://www.ebi.ac.uk/interpro/entry/pfam/PF12695/). Enzymatically, ABHD5 is a coenzyme A-dependent lysophosphatidic acid acyltransferase regulating the lipid conversion of lysophosphatidic acid → phosphatidic acid. It does not have true catalytic activity; ABHD5 is physically defined by a central beta sheet flanked by alpha helices on both sides, with catalytic residues on the helices' conserved loops. Human ABHD5 acts as a non-catalytic coactivator of adipose triglyceride lipase (ATGL). Across vertebrates, ABHD5 is highly conserved—in additional eukaryotes (e.g. plants, nematodes), homologs accomplish the same function. Loss-of-function in ABHD5 causes Chanarin–Dorfman syndrome (CDS), an autosomal recessive disorder characterized by accumulation of triacylglycerol molecules, ultimately presenting as severe ichthyosis (excessively dry skin).",
    localization:
      "ABHD5 localization patterns depend on tissue type and metabolic state. In basal states, the enzyme is typically found on the surface of intracellular lipid droplets, enabled by a tryptophan-rich N-terminal anchor. Trp21 and Trp29 are necessary for adhesion to lipid droplet surfaces (https://pmc.ncbi.nlm.nih.gov/articles/PMC4646293/).",
    ptms:
      "No curated post-translational modification notes yet for PF12695. This section is in progress.",
    catalyticResidues:
      "Human ABHD5 does not have a crystal structure. A computationally generated model of its putative structure is derived from homologous proteins from Trichuris trichura (whipworm), as noted in the PDB/AlphaFold listing (see Figure 1). Though model confidence is fairly high (88.51), there is no experimental data to verify the accuracy of this structure. ABHD5 is enzymatically inactive as a lipase—it functions as a non-catalytic coactivator of ATGL rather than through a classical Ser–His–Asp catalytic triad (https://www.nature.com/articles/s41598-021-04179-7).",
    mechanisms:
      "No curated mechanism notes yet for PF12695. This section is in progress.",
    interactingDomains:
      "No curated interacting-domain notes yet for PF12695. This section is in progress.",
    function:
      "No curated function notes yet for PF12695 beyond the overview summary. This section is in progress.",
    regulation:
      "No curated regulation notes yet for PF12695. This section is in progress.",
    variability:
      "ABHD5 is a member of the α/β hydrolase (ABH) superfamily—a class of enzymes embodying the core helix-sheet-helix three-dimensional conformation (https://www.ebi.ac.uk/interpro/entry/pfam/PF12695/).",
    structure:
      "Human ABHD5 does not have an experimental crystal structure. Figure 1 shows a computationally generated AlphaFold model of its putative structure, derived from a homologous protein from Trichuris trichura (whipworm), as noted in the PDB listing. Though model confidence is fairly high (88.51), there is no experimental data to verify the accuracy of this structure. Source: https://www.rcsb.org/structure/AF_AFA0A077Z6K2F1",
    references: [
      ...pfamRefs("PF12695"),
      {
        label: "PMC4646293 — ABHD5 Trp21 and Trp29 lipid droplet anchoring.",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4646293/",
      },
      {
        label:
          "Scientific Reports — ABHD5 inactive α/β hydrolase domain analysis (s41598-021-04179-7).",
        url: "https://www.nature.com/articles/s41598-021-04179-7",
      },
      {
        label: "RCSB PDB AlphaFold model AF_AFA0A077Z6K2F1 (ABHD5 homolog).",
        url: "https://www.rcsb.org/structure/AF_AFA0A077Z6K2F1",
      },
    ],
    legendSegments: [{ label: "α/β hydrolase domain 5 (ABHD5)", cathId: "3.40.50.1820" }],
    figures: [
      {
        caption:
          "Figure 1. AlphaFold model of human ABHD5 putative structure (homology model from Trichuris trichura). Source: https://www.rcsb.org/structure/AF_AFA0A077Z6K2F1",
        alt: "ABHD5 AlphaFold structural model",
      },
    ],
  },
  {
    id: "pf-PF01425",
    pfamAccession: "PF01425",
    profileHmm: "Amidase",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Amidase-signature domain",
    lastUpdated: "2026-06-28",
    summary:
      "Curated by Shivangi. PF01425 is the canonical amidase-signature (AS) domain, found across bacteria, fungi, plants, and animals, that catalyzes cleavage of amide bonds in chemically diverse substrates. Amidase PF01425 is a broadly distributed hydrolytic module that uses a distinctive Ser–Ser–Lys catalytic triad and a conserved alpha/beta/alpha core to cleave diverse amide substrates. InterPro describes the entry as an amidase domain with a conserved structural core (https://www.ebi.ac.uk/interpro/entry/pfam/PF01425), and mechanistic studies of amidase-signature enzymes show that the family is united by a characteristic catalytic architecture rather than by a single substrate class (https://doi.org/10.1074/jbc.m001607200, https://en.wikipedia.org/wiki/Amidase).",
    localization:
      "PF01425 itself does not encode a fixed localization signal; instead, subcellular localization is dictated by N-terminal signal peptides, transmembrane helices, or additional domains in the full-length protein. Many bacterial amidases annotated with PF01425 (for example, Thermus thermophilus amidase) are soluble cytosolic enzymes, whereas others are periplasmic or secreted when fused to signal peptides or cell-wall–associated modules (https://www.rcsb.org/structure/2dc0). Eukaryotic PF01425-containing enzymes such as fatty acid amide hydrolase (FAAH) illustrate a different architecture: FAAH carries an N-terminal transmembrane segment that anchors it in intracellular membranes, with the amidase domain facing the cytosol to access hydrophobic lipid amide substrates (https://www.uniprot.org/uniprotkb/O00519/entry).",
    ptms:
      "InterPro and structural data for representative bacterial amidases (for example, 2DC0 and related structures) do not indicate a family-defining covalent modification such as autocatalytic cleavage or a prosthetic group specific to PF01425 (https://www.ebi.ac.uk/interpro/entry/pfam/PF01425, https://www.rcsb.org/structure/2dc0). Aside from standard crystallographic substitutions like selenomethionine (MSE) used for phasing, these enzymes usually appear as single-chain polypeptides whose catalytic function is governed by the Ser–Ser–Lys triad and surrounding residues rather than by obligatory PTMs. For eukaryotic PF01425 enzymes such as human FAAH, proteomic resources document potential phosphorylation or other modifications at various residues, but these are not universally conserved across the family and are best treated as protein-specific regulatory features (https://www.uniprot.org/uniprotkb/O00519/entry). For a domain-level annotation, the most accurate statement is that PTMs are not currently recognized as a universal mechanistic requirement for PF01425 and should be curated case-by-case when experimental evidence exists.",
    catalyticResidues:
      "Amidase-signature enzymes are unified by a conserved Ser–Ser–Lys catalytic triad rather than the classical Ser–His–Asp triad of many serine hydrolases. In peptide amidase, this triad is exemplified by Ser226 (nucleophile), Ser202 (bridging serine), and Lys123, and molecular dynamics plus mutagenesis confirm that Ser226 performs nucleophilic attack while Ser202 and Lys123 orchestrate proton transfer and stabilization of intermediates (https://doi.org/10.1074/jbc.m001607200, https://pubs.rsc.org/en/content/articlelanding/2017/cp/c7cp00277g). The catalytic pocket sits at the junction of β-strands and surrounding helices in the conserved alpha/beta/alpha fold (Figure 1).",
    mechanisms:
      "Mechanistic studies indicate a multistep hydrolysis pathway: nucleophilic attack of the catalytic serine on the substrate amide carbonyl to form a tetrahedral intermediate, collapse to an acyl–enzyme intermediate, and then water-driven deacylation to release carboxylate and the amine. The Lys–Ser dyad can act as a general base at higher pH, while crystallographic waters and an oxyanion hole stabilize the transition state; quantum-chemical analyses suggest up to five discrete steps for the full catalytic cycle in peptide amidase (https://pubs.rsc.org/en/content/articlelanding/2017/cp/c7cp00277g, https://doi.org/10.1074/jbc.m001607200).",
    interactingDomains:
      "In general, interacting regions include transmembrane helices, low-complexity linkers, and sometimes additional catalytic or binding domains, which together determine access to substrates and potential protein–protein interactions in pathways. Eukaryotic FAAH provides a clear example: an N-terminal transmembrane segment anchors the amidase domain to intracellular membranes while the catalytic module faces the cytosol (https://www.uniprot.org/uniprotkb/O00519/entry). Variable N- and C-terminal extensions and peripheral loops in other PF01425 members reshape substrate-binding pockets and access tunnels while preserving the underlying catalytic core (https://www.rcsb.org/structure/1M21, PMC3568674).",
    function:
      "Functionally, PF01425 amidases hydrolyze a wide spectrum of amides, including short-chain and aromatic amides, peptide C-terminal amides, urea derivatives, and long-chain fatty acid amides (https://en.wikipedia.org/wiki/Amidase). In bacteria, these domains participate in nitrogen-scavenging and catabolic pathways (for example, degradation of xenobiotic amides or metabolic intermediates), while in eukaryotes FAAH and related enzymes terminate signaling by bioactive lipids such as anandamide (https://www.uniprot.org/uniprotkb/O00519/entry). Peptide amidase selectively hydrolyzes C-terminal amide groups on peptides, whereas other AS enzymes such as allophanate hydrolase have evolved channels suited to small carboxamide substrates (https://www.rcsb.org/structure/1M21, PMC3568674).",
    regulation:
      "Regulation largely reflects the biological role of the host protein: microbial amidases are often controlled transcriptionally as part of catabolic operons, whereas FAAH is regulated by expression level, membrane environment, inhibitor binding, and substrate availability (https://www.uniprot.org/uniprotkb/O00519/entry). No single, conserved allosteric site or switch is shared across all PF01425 members; instead, activity modulation tends to be context-specific, involving gene regulation, localization, and small-molecule effectors tailored to each enzyme's physiological niche.",
    variability:
      "Amidases contain a conserved stretch of approximately 130 residues known as the amidase-signature (AS) sequence, rich in serine and glycine and lacking histidine and aspartate residues, which helps define the Ser–Ser–Lys triad environment (https://www.ebi.ac.uk/interpro/entry/pfam/PF01425, https://en.wikipedia.org/wiki/Amidase). Outside this core, PF01425 proteins vary considerably in N- and C-terminal extensions, loop lengths, and surface residue composition, creating different substrate-binding pockets and access tunnels while preserving the underlying alpha/beta/alpha framework. Comparative structural work shows that these variable regions control substrate size, charge complementarity, and specificity—for example, peptide amidase selectively hydrolyzes C-terminal amide groups on peptides, whereas other AS enzymes like allophanate hydrolase have evolved channels and binding sites suited to small carboxamide substrates (https://www.rcsb.org/structure/1M21, PMC3568674, https://doi.org/10.1074/jbc.m001607200). This balance of conserved catalytic machinery and flexible periphery is a key reason PF01425 can support both metabolic housekeeping amidases in bacteria and signaling lipid hydrolases such as FAAH in animals.",
    structure:
      "InterPro describes PF01425 as an amidase-signature domain with a core domain that is structurally covered by α-helices, consistent with an alpha/beta/alpha fold where a central β-sheet core is sandwiched between helical layers (https://www.ebi.ac.uk/interpro/entry/pfam/PF01425). Crystal structures of AS-family enzymes such as Thermus thermophilus amidase (PDB 2DC0) and peptide amidase show this conserved architecture, with the catalytic triad sitting in a pocket formed at the junction of β-strands and surrounding helices (Figure 1, Figure 2). In 2DC0, the Thermus amidase is a ~430-residue hydrolase that forms a dimer in the crystal, and the structure includes a typical selenium-methionine modification (MSE) at methionine positions but no large prosthetic groups, emphasizing a protein-only catalytic core (https://www.rcsb.org/structure/2dc0, https://www.wwpdb.org/pdb?id=pdb_00002dc0). Related AS enzymes such as allophanate hydrolase from Granulibacter bethesdensis were solved by molecular replacement using 2DC0 as a search model, underscoring that this fold and active-site geometry are representative across PF01425 (PMC3568674).",
    references: [
      ...pfamRefs("PF01425"),
      {
        label: "Amidase – amidase-signature family overview. Wikipedia.",
        url: "https://en.wikipedia.org/wiki/Amidase",
      },
      {
        label: "InterPro. Amidase (PF01425) – Pfam entry. EMBL–EBI.",
        url: "https://www.ebi.ac.uk/interpro/entry/pfam/PF01425",
      },
      {
        label:
          "Patricelli MP, Cravatt BF. Clarifying the catalytic roles of conserved residues in the amidase signature family. J Biol Chem. doi:10.1074/jbc.m001607200",
        url: "https://doi.org/10.1074/jbc.m001607200",
      },
      {
        label:
          "The mechanism of the Ser-(cis)Ser-Lys catalytic triad of peptide amidases. Phys Chem Chem Phys. 2017;19:13110–13121.",
        url: "https://pubs.rsc.org/en/content/articlelanding/2017/cp/c7cp00277g",
      },
      {
        label: "UniProt. FAAH – Fatty-acid amide hydrolase 1 – Homo sapiens (O00519).",
        url: "https://www.uniprot.org/uniprotkb/O00519/entry",
      },
      {
        label: "Ohshima T et al. Crystal structure of amidase. wwPDB entry 2DC0 (2006).",
        url: "https://www.wwpdb.org/pdb?id=pdb_00002dc0",
      },
      {
        label: "RCSB PDB. 2DC0: Crystal structure of amidase (Thermus thermophilus).",
        url: "https://www.rcsb.org/structure/2dc0",
      },
      {
        label:
          "RCSB PDB. 1M21: Crystal structure of peptide amidase PAM in complex with chymostatin.",
        url: "https://www.rcsb.org/structure/1M21",
      },
      {
        label:
          "The structure of allophanate hydrolase from Granulibacter bethesdensis suggests conserved features of amidase-signature family active sites. J Biol Chem. PMC3568674",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3568674/",
      },
      {
        label: "wwPDB. 1M21 peptide amidase structure record.",
        url: "https://doi.org/10.2210/pdb1M21/pdb",
      },
    ],
    legendSegments: [{ label: "Amidase-signature core", cathId: "3.40.50.1820" }],
    pdbIds: ["1M21", "2DC0"],
    figures: [
      {
        caption:
          "Figure 1. Structural representative of a PF01425 amidase-signature enzyme (peptide amidase, PDB 1M21); conserved catalytic core and variable peripheral regions that help shape the substrate-binding environment. Source: https://doi.org/10.2210/pdb1M21/pdb",
        imageSrc: "/cath/PF01425_peptide_amidase_1M21.png",
        alt: "Peptide amidase PF01425 structure PDB 1M21",
      },
      {
        caption:
          "Figure 2. Crystal structure of amidase (2DC0) biological assembly (Thermus thermophilus dimer). Source: https://www.rcsb.org/structure/2DC0; https://www.wwpdb.org/pdb?id=pdb_00002dc0",
        imageSrc: "/cath/PF01425_amidase_2DC0_dimer.png",
        alt: "Thermus thermophilus amidase dimer PDB 2DC0",
      },
    ],
  },
  {
    id: "pf-PF24708",
    pfamAccession: "PF24708",
    profileHmm: "AMS3",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "AMS3 domain",
    lastUpdated: "2026-05-04",
    summary:
      "AMS3 is a recently defined hydrolase-associated domain family; functional literature is still emerging—treat PETadex annotations as hypotheses pending assay.",
    localization: "Unknown without fusion context; annotate using predicted secretion signals.",
    ptms: "Insufficient conserved data—cite organism-specific studies.",
    catalyticResidues: "Align to nearest structural homolog to propose catalytic residues.",
    function: "Putative hydrolase accessory or catalytic domain—experimental validation required.",
    labNotes: "Prioritize structural modeling (AlphaFold) plus substrate screening.",
    references: pfamRefs("PF24708"),
    legendSegments: [{ label: "Hydrolase-associated", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF20434",
    pfamAccession: "PF20434",
    profileHmm: "BD-FAE",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Beaver Dropping Feruloyl and Acetyl Xylan Esterase (BD-FAE)",
    lastUpdated: "2026-05-04",
    summary: "Curated by Claire Dumortier. BD-FAE is a bifunctional esterase belonging to the α/β hydrolase superfamily. It is primarily observed to act on birchwood and corn fiber, and has a distinct structure from known CE1 structures despite functional similarities.",
    localization:
      "BD-FAE is a bacterial enzyme located in the gut environment of animals, with most homologs having a lipobox (lipid molecule covalently attached to cysteine) allowing BD-FAE to attach to the outer membrane and avoid drifting in the gut environment. BD-FAE was originally discovered within PULs (Polysaccharide Utilization Loci) of beaver and moose droppings. PULs are gene clusters primarily found in phylum Bacteroidetes of the gut to degrade complex dietary fibers, switching on and off depending on the food close to bacteroidete’s cell surfaces.",
    variability:
    "Of BD-FAE’s 200 homologs, the closest 33 involve xylan breakdown, while others are either alginate-targeting PULs or not encoded in PULs at all. All homologs are found on this link. The N-terminal tail is often removed to make the protein soluble and easier to purify, as the lipid-anchored version sticks to the cell membrane (Hameleers et al. 2021 study, E.coli lab work). Without the tail, BD-FAE is either a monomer or poorly folded, making it catalytically active but potentially less structurally stable. Commonly if not removed, the beginning of the N-terminal is a signal peptide cleaved after the protein reaches the periplasm signal peptidase.",
    ptms:
    "Post-translational modifications vary from the host cell, where scientists have chemically synthesized the DNA sequence from the unknown original bacterium to create the physical enzyme–currently in E.coli.",
    catalyticResidues:
      "BD-FAE belongs to the α/β hydrolase superfamily on a distinct branch from PETase. The family shares the same common fold, with the core typically consisting of 5-8 β-sheets connected by 6 α-helices. A catalytic triad is borne on loops on a central parallel β-sheet, with the typically arrangement being a nucleophile (on a sharp strand-to-helix turn between β5 and α3), acid (following β7), then base (following the last β-strand). Specifically for BD-FAE, the triad is Ser-Asp-His: Ser128, His269, and Asp237. BD-FAE’s single active site is a solvent-exposed shallow furrow handling both feruloyl and acetyl esterase activity (this is confirmed through research, where mutating the Serine to Alanine completely abolished both functions). An oxyanion hole (follows β3) composed of Gly53 and Ser128 NH-groups serves as a structural pocket within the active site. ",
    mechanisms:
      "Hydrolysis proceeds by serine nucleophilic attack on the ester carbonyl, tetrahedral intermediate formation, and acyl-enzyme turnover by water. This mechanism is consistent with feruloyl-ester cleavage chemistry and the triad architecture shown in Figure 1.",
    interactingDomains:
      "Commonly observed in carbohydrate-active enzyme contexts with carbohydrate-binding or polysaccharide-processing modules; domain context should be checked per protein architecture in PETadex before assigning accessory interactions.",
    function:
      "BD-FAE is a carbohydrate esterase and catalytically active enzyme capable of breaking the ester bonds from acetyl and feruloyl groups in complex biomasses like xylan (a hemicellulose polysaccharide that strengthens the cell wall through crosslinked networks). Acetyl breakdown is observed in acetylated glucuronoxylan (AcGX) from birchwood, while feruloyl breakdown is observed on acetylated and feruloylated xylooligosaccharides (AcFaXOS) in corn fiber. Acetyl and feruloyl groups exhibit steric hindrance (where their bulkiness prevents enzymes from attaching to and breaking down the cell wall in a chemical reaction). Thus, the removal of these side chains exposes the hemicellulose backbone, allowing other enzymes to effectively break down the biomass into simple sugars.\n\nCompared with acetylated substrates, BD-FAE shows higher relative activity on feruloylated substrates when removing ferulic or acetic acid from synthetic substrates; catalytic activity is comparable to type-A FAEs in Crépin's classification.\n\nResearch suggests:\n- Steric hindrance: acetyl residues adjacent to feruloyl (a bulky aromatic) may be shielded from BD-FAE.\n- Non-specific binding of the carbohydrate chain supports catalytic activity (lack of strict carbohydrate-chain recognition); substrate-binding discussion in Springer Biotechnol Biofuels (https://link.springer.com/article/10.1186/s13068-021-01976-0).\n- Preference for xylan backbones: no BD-FAE activity was observed on AcGGM.",
    regulation:
      "Hybrid Two-Component Systems (HTCS) domain spans the inner membrane of the bacterium. When a fragment of feruloylated xylooligosaccharides (XOS) binds to HTCS, the transcription of BD-FAE gene cluster begins. XOS stems from basal expression, where the bacteria produces a small amount of BD-FAE and xylansases to clip small pieces off xylan fiber. Note that high levels of simple sugars trigger carbon catabolite repression, blocking the BD-FAE promoter and ignoring xylan decomposition. Additionally, there is product inhibition by ferulic acid.\n\nThe optimal pH and temperature are 6.0-7.0 and 40℃ respectively.",
    structure:
      "The N-terminal tail of BD-FAE resembles Abhydrolase_3 (domain PF07859), while the C-terminal resembles peptidase_S9 (domain PF00326). By not showing remote homology related to the CE1 family, BD-FAE is suggested to be the founding member of a novel esterase family likely originating from domain shuffling. In crystal structure, the N-terminal(Gln2-Pro7) acts as a β-strand interacting with the β-sheets on other molecule’s surfaces, enabling oligomerization. This molecular packing yields a fourfold spiral-shaped homotetramer, with an interaction surface of 1055 Å² and with active sites pointing to the center of the spiral. This structure is predominantly observed in bacteroidetes.  See Figure 2 for the homotetramer arrangement and Figure 3 for the monomer view; use the Mol* and RCSB links above for interactive inspection.",
    references: [
      {
        label: "Pfam / InterPro: PF20434 (BD-FAE family)",
        url: PF("PF20434"),
      },
      {
        label: "PMC: Biochemical properties of carbohydrate esterases (CEs) vs other characterized CEs",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8165983/#:~:text=We%20determined%20the%20biochemical%20properties,from%20other%20biochemically%20characterized%20CEs.",
      },
      {
        label:
          "PMC: α/β-hydrolase nucleophile positioning and β-sheet context (serine nucleophile; loop after β8)",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11878206/#:~:text=The%20nucleophile%2C%20mostly%20serine%2C%20is,variable%20loop%20after%20strand%20%CE%B28.",
      },
      {
        label: "Wikipedia: Catalytic triad (Ser–His–Asp/Glu overview and substrate scope)",
        url: "https://en.wikipedia.org/wiki/Catalytic_triad",
      },
      {
        label: "PMC: Hemicellulose xylan / plant cell-wall polysaccharide context",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9898438/#:~:text=The%20hemicellulose%20xylan%20is%20a,et%20al.%2C%202009).",
      },
      {
        label: "ScienceDirect: Trends in Biotechnology (related CE / biotechnology review)",
        url: "https://www.sciencedirect.com/science/article/abs/pii/S0966842X17301543",
      },
      {
        label: "InterPro: IPR029058 — carbohydrate esterase family 1, catalytic domain",
        url: "https://www.ebi.ac.uk/interpro/entry/InterPro/IPR029058/",
      },
      {
        label:
          "Springer (Biotechnol Biofuels): catalytic activity on acetylated vs related substrates",
        url: "https://link.springer.com/article/10.1186/s13068-021-01976-0#:~:text=The%20overall%20catalytic%20activity%20of,as%20compared%20to%20acetylated%20substrates.",
      },
      {
        label:
          "RCSB PDB 6TKX — feruloyl esterase structure (use Mol* / RCSB 3D View for interactive model)",
        url: "https://www.rcsb.org/structure/6TKX",
      },
    ],
    legendSegments: [
      { label: "α/β hydrolase (representative CATH)", cathId: "3.40.50.1820" },
    ],
    pdbIds: ["6TKX"],
    resourceLinks: [
      {
        label: "InterPro: IPR029058 (CE family 1, catalytic domain)",
        url: "https://www.ebi.ac.uk/interpro/entry/InterPro/IPR029058/",
      },
      {
        label: "PMC11878206 (α/β-hydrolase nucleophile / β-sheet context)",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11878206/#:~:text=The%20nucleophile%2C%20mostly%20serine%2C%20is,variable%20loop%20after%20strand%20%CE%B28.",
      },
      {
        label: "Wikipedia: Catalytic triad",
        url: "https://en.wikipedia.org/wiki/Catalytic_triad",
      },
    ],
    figures: [
      {
        caption:
          "Figure 1 source: PMC11878206 (https://pmc.ncbi.nlm.nih.gov/articles/PMC11878206/#:~:text=The%20nucleophile%2C%20mostly%20serine%2C%20is,variable%20loop%20after%20strand%20%CE%B28.) and Wikipedia catalytic triad (https://en.wikipedia.org/wiki/Catalytic_triad). Catalytic triad reference diagram showing nucleophile/base/acid combinations and example substrate classes (ester cleavage context matches feruloyl esterase chemistry).",
        imageSrc: "/cath/PF07859_triaddiagramforref.png",
        alt: "Triad residue classes and substrate schematics",
      },
      {
        caption:
          "Figure 2 source: RCSB PDB 6TKX (https://www.rcsb.org/structure/6TKX). Homotetramer view of feruloyl esterase from Bacteroides dorei; open interactive structure via the links above.",
        imageSrc: "/cath/PF07859_homeotetramer.jpg",
        alt: "Homotetramer ribbon structure PDB 6TKX",
      },
      {
        caption:
          "Figure 3 source: RCSB PDB 6TKX (https://www.rcsb.org/structure/6TKX). Monomer view (rainbow N→C); use Mol* or RCSB 3D View from the links above for rotation/zoom when aligning PETadex residues.",
        imageSrc: "/cath/PF07859_monomer.png",
        alt: "Monomer structure PDB 6TKX rainbow",
      },
    ],
  },
  {
    id: "pf-PF00144",
    pfamAccession: "PF00144",
    profileHmm: "Beta-lactamase",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Serine beta-lactamase domain",
    lastUpdated: "2026-05-04",
    summary:
      "Beta-lactamases use a serine hydrolase mechanism distinct from classic lipases but within the α/β hydrolase fold; PETadex hits may reflect remote homology or domain fusion artifacts.",
    localization: "Periplasmic in Gram-negative bacteria; cytoplasmic variants exist.",
    ptms: "Disulfides stabilize many Class A/C enzymes.",
    catalyticResidues: "Ser–Lys catalytic pair or Ser-containing triad depending on class.",
    function: "β-lactam ring hydrolysis; polyester activity is non-canonical and requires validation.",
    labNotes: "Use class-specific inhibitors to confirm identity in vitro.",
    references: pfamRefs(
      "PF00144",
      "Drawz SM, Bonomo RA. Expanding diversity of β-lactamases. Microbiol Spectr. 2016.",
      "https://doi.org/10.1128/microbiolspec.VMBF-0026-2015",
    ),
    legendSegments: [{ label: "β-lactamase", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF07224",
    pfamAccession: "PF07224",
    profileHmm: "Chlorophyllase",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Chlorophyllase domain",
    lastUpdated: "2026-05-04",
    summary:
     "Curated by Alex Leonardos. Peptidase S58 proteins are N-terminal nucleophile (Ntn) hydrolases that undergo autoproteolytic processing to generate an active aminopeptidase. They are synthesized as a single-chain precursor that self-cleaves to produce α- and β-subunits, exposing a catalytic N-terminal Ser or Thr. These enzymes function primarily as aminopeptidases involved in peptide turnover and specialized substrate degradation, including β-peptides and synthetic oligomers. It is part of the α/β hydrolase family.",
    localization:
      "Has plastid localization and its isoforms are found in the endoplasmic reticulum. https://academic.oup.com/plphys/article/148/1/108/6107411",
    ptms:
      "Has disulphide bonds: two intramolecular disulfide bonds (Cys220-Cys264, Cys234-Cys238), one intermolecular disulfide bond (Cys270-Cys270'). It also has an N-terminal signal sequence: in the cloned Chenopodium album chlorophyllase, Tsuchiya et al. report a putative N-terminal signal sequence for the endoplasmic reticulum (consistent with extraplastidic localization) PMC24824.",
    catalyticResidues:
      "Ser145, Asp172, and His248 form the nucleophile–acid–His triad of an α/β hydrolase fold (Figure 1, panel C).",
    structure:
      "The structural analysis resolves a homodimer with His76 and Asp255 at the metal-coordinated interface (Figure 1A) and a nine-stranded β-sheet topology with catalytic and cysteine positions mapped (Figure 1B); panel C matches Fig. 2C in Jo et al. PMC10011514. Figure 2 shows an additional dimer view consistent with the 8FJD structure entry.",
    function:
      "- Hydrolyzes the phytol tail of chlorophyll pigments to produce chlorophyllide molecules.\n- Breaks down chlorophyll during plant processes such as floral development and fruit ripening.\n- Turnover mechanism for chlorophyll.\n- Defense system — chlorophyllide can be toxic to predators.",
    regulation:
      "Found in both plastids and the ER; isoforms in the ER support release following stressors such as herbivory (Schelbert et al., Plant Physiol. 148(1):108–118, https://academic.oup.com/plphys/article/148/1/108/6107411).",
    variability: "High thermal variability among the family.",
    labNotes: "Assay with chlorophyll derivatives rather than PET for functional confirmation.",
    references: [
      ...pfamRefs("PF07224"),
      {
        label:
          "Schelbert S et al. Plant Physiol. 148(1):108–118 (chlorophyll breakdown / localization; source for Localization section)",
        url: "https://academic.oup.com/plphys/article/148/1/108/6107411",
      },
      {
        label:
          "Tsuchiya T et al. Cloning of chlorophyllase, the key enzyme in chlorophyll degradation: finding of a lipase motif and the induction by methyl jasmonate. Proc Natl Acad Sci U S A. 1999;96(26):15362–15367. doi:10.1073/pnas.96.26.15362",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC24824/",
      },
      {
        label:
          "Jo M et al. A structure-function analysis of chlorophyllase reveals a mechanism for activity regulation dependent on disulfide bonds. J Biol Chem. 2023;299(3):102958. doi:10.1016/j.jbc.2023.102958",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10011514/",
      },
      {
        label: "RCSB PDB 8FJD — Triticum aestivum chlorophyllase",
        url: "https://www.rcsb.org/structure/8FJD",
      },
    ],
    legendSegments: [{ label: "Chlorophyllase", cathId: "3.40.50.1820" }],
    pdbIds: ["8FJD"],
    figures: [
      {
        caption:
          "Composite from Jo et al., J Biol Chem (2023), Fig. 2 — chlorophyllase dimer/surface (A), topology with triad S145/D172/H248 and cysteines (B), active-site detail (C). Full article: https://pmc.ncbi.nlm.nih.gov/articles/PMC10011514/",
        imageSrc: "/cath/PF07224_figure_jbc2023_structure.png",
        alt: "Chlorophyllase structure: dimer, topology diagram, catalytic triad close-up",
      },
      {
        caption:
          "Figure 2 source: RCSB PDB 8FJD (https://www.rcsb.org/structure/8FJD). Additional chlorophyllase dimer rendering aligned with the structure and analysis in Jo et al. (2023) https://pmc.ncbi.nlm.nih.gov/articles/PMC10011514/",
        imageSrc: "/cath/PF07224_figure2_dimer.png",
        alt: "Chlorophyllase dimer rendering",
      },
    ],
  },
  {
    id: "pf-PF07732",
    pfamAccession: "PF07732",
    profileHmm: "Cu-oxidase_3",
    atlasComponent: null,
    cathId: "3.90.1300.10",
    displayName: "Multicopper oxidase / laccase-like domain",
    lastUpdated: "2026-05-04",
    summary:
      "Cu-oxidase_3 includes multicopper oxidases (e.g. laccases) that oxidize phenolics using four copper centers—not an α/β hydrolase. PETadex placement may reflect modular enzymes or annotation overlap.",
    localization: "Secreted or outer-membrane-associated in many fungi and bacteria.",
    ptms: "Heavy glycosylation in fungal laccases affects stability and secretion.",
    catalyticResidues: "Copper-binding histidines/cysteines—distinct from serine hydrolases.",
    function: "One-electron oxidation of phenolic substrates; aromatic polymer modification distinct from ester hydrolysis.",
    labNotes: "Require Cu supplementation and redox mediators in assays; do not conflate with esterase kinetics.",
    references: pfamRefs(
      "PF07732",
      "Jones SM, Solomon EI. Electron transfer and reaction mechanism of laccases. Cell Mol Life Sci. 2015.",
      "https://doi.org/10.1007/s00018-015-1826-6",
    ),
    legendSegments: [{ label: "Multicopper oxidase", cathId: "3.90.1300.10" }],
    figures: [],
  },
  {
    id: "pf-PF01083",
    pfamAccession: "PF01083",
    profileHmm: "Cutinase",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Cutinase / cutin hydrolase",
    lastUpdated: "2026-06-28",
    summary:
      "WORK IN PROGRESS: Curated by Chinmay. In-text citations are not yet complete for every claim—see References below. PF01083 (Cutinase) is an α/β-hydrolase domain that hydrolyzes ester bonds in cutin and related polyesters; cutinase-like catalytic modules are central references for understanding polyesterase and PETase activity. The family belongs to the α/β class with a central β-sheet of five parallel strands covered by helices on either side (https://www.ebi.ac.uk/interpro/entry/pfam/PF01083/). Both fungal and bacterial cutinases can show PETase activity (https://www.mdpi.com/2674-0583/1/1/4), and taxonomic surveys suggest broad distribution in eukaryotes and bacteria (https://www.ebi.ac.uk/interpro/entry/pfam/PF01083/taxonomy/uniprot/).",
    localization:
      "Cutinases are typically secreted enzymes. The plant cuticle is the first line of defense against pathogen invasion, and certain fungal and bacterial phytopathogens secrete cutinases capable of depolymerizing cutin at aerial organ surfaces (https://www.annualreviews.org/content/journals/10.1146/annurev-arplant-043015-111929). Cutinase-like catalytic domains in PETases are generally positioned for extracellular or surface-accessible catalysis rather than cytosolic housekeeping roles, though the exact signal peptides and anchoring modules depend on the full-length protein.",
    ptms:
      "No family-defining post-translational modifications are curated yet for PF01083. Disulfide bonds (Cys31–Cys109 and Cys171–Cys178 in the 1CEX cutinase reference structure) are structural rather than regulatory PTMs and are discussed under Structure and Catalytic residues. Fungal cutinases may carry organism-specific glycosylation; a systematic PTM survey for this domain entry is still in progress.",
    catalyticResidues:
      "The catalytic triad consists of serine, histidine, and aspartate. In the PF01083 reference cutinase structure (PDB 1CEX), the triad is Ser120, Asp175, and His188 as mapped in a 1999 structural study (https://www.cell.com/AJHG/fulltext/S0006-3495(99)76874-8). Serine acts as the nucleophile, histidine activates serine through deprotonation, and aspartate stabilizes and orients histidine. Disulfide bonds form between Cys31 and Cys109 and between Cys171 and Cys178 (green/red in Figure 1). The oxyanion hole is formed by backbone NH groups around the catalytic serine. In IsPETase, the equivalent triad is Ser160, Asp206, and His237 with a disulfide between Cys203 and Cys239 (https://pmc.ncbi.nlm.nih.gov/articles/PMC9524616/). See Figure 1 (ChimeraX triad/disulfide annotation) and Figure 2 (sequence secondary-structure map). Hydrophobic surface patches near the active site are shown in Figure 5.",
    mechanisms:
      "Serine acts as the nucleophile that attacks the ester bond, while histidine activates serine through deprotonation. Aspartate stabilizes histidine and increases the reactivity of its nitrogen lone pair. The oxyanion hole stabilizes the negatively charged tetrahedral intermediate during catalysis. PETase and cutinase share a main catalytic sequence: (1) acylation of the catalytic serine, (2) C–O bond breakage, (3) nucleophilic attack by water, and (4) deacylation (https://pmc.ncbi.nlm.nih.gov/articles/PMC10577388/, https://pmc.ncbi.nlm.nih.gov/articles/PMC5455348/). Aspartate's negative charge makes histidine's nitrogen more reactive; histidine deprotonates serine to generate the nucleophile. Serine attacks the carbonyl carbon while oxyanion-hole NH groups stabilize the tetrahedral intermediate; collapse releases the alcohol leaving group (shown as methanol in Figure 6) and forms an acyl–enzyme. Water is then activated by histidine, attacks the acyl–enzyme carbonyl, passes through a second tetrahedral intermediate, and deacylation releases the carboxylate product and regenerates the triad. This cycle repeats across many ester bonds to depolymerize PET; BHET, MHET, and TPA are successive hydrolysis products depending on which ester linkages are cleaved. Full stepwise diagram: Figure 6.",
    interactingDomains:
      "The catalytic triad is responsible for depolymerization of PET and other ester-linked polymers. Disulfide bonds—especially the pair near the active site (Cys171–Cys178 in cutinase)—are thought to contribute to protein stability at elevated temperatures. Compared with classical cutinases, many PETases contain additional disulfide bonds and aromatic residues near the active site to tolerate higher temperatures and accommodate bulky PET chains (https://pmc.ncbi.nlm.nih.gov/articles/PMC8961046/).",
    function:
      "Cutinase-like domains cleave ester bonds connecting monomers within polymers. They hydrolyse both aliphatic and aromatic polyester linkages with biocatalytic potential for plastic recycling (https://pubmed.ncbi.nlm.nih.gov/34165618/). Phylogenetic analysis shows cutinases with PET-degrading activity (green), PCL-degrading (blue), PLA-degrading (yellow), and cutin-specific clades (uncolored) across fungi and bacteria—see Figure 3 (https://www.mdpi.com/2674-0583/1/1/4). Natural and synthetic substrates include cutin, suberin, PET, and BHET (Figure 4).",
    regulation:
      "In most cutinases the active site is exposed and constitutively active, in contrast to lipases that require interfacial activation. Cutinase-like domains in PETases often sit in a more open active-site architecture to accommodate bulky PET chains. Environmental pH and temperature modulate activity; engineered PETases are optimized for higher temperatures through targeted substitutions that improve core packing, electrostatic interactions (https://pmc.ncbi.nlm.nih.gov/articles/PMC11866010/), and sometimes additional disulfide bonds (https://pmc.ncbi.nlm.nih.gov/articles/PMC8961046/). PETases tend to accumulate aromatic residues near the active site adapted for PET binding.",
    variability:
      "Cutinase-like domain sequences vary across PETases, but key features are conserved: at least one disulfide bond and a Ser–His–Asp catalytic triad whose exact residue numbers differ yet fold into the same spatial cluster (https://www.nature.com/articles/s42004-024-01154-x). Loop lengths, surface hydrophobicity, and disulfide count differ between cutinases and engineered PETases, reflecting adaptation from plant-cuticle substrates to synthetic polyesters.",
    structure:
      "InterPro describes PF01083 as an α/β hydrolase with a central five-stranded parallel β-sheet flanked by helices (https://www.ebi.ac.uk/interpro/entry/pfam/PF01083/). The representative cutinase structure PDB 1CEX is indexed at InterPro (https://www.ebi.ac.uk/interpro/structure/PDB/1cex/) and RCSB (https://www.rcsb.org/structure/1CEX). Figure 1 shows the 1CEX fold with catalytic triad (Ser120, Asp175, His188) and disulfides annotated in ChimeraX. Figure 2 maps α-helices (yellow) and β-strands (blue) on the 214-residue chain A sequence. Figure 5 highlights hydrophobic surface patches (gold) around the active-site cleft. Additional curator PDB overlays (beta-sheet and alpha-helix highlight files) are noted in lab materials but not yet linked here.",
    references: [
      ...pfamRefs("PF01083"),
      {
        label:
          "Martinez C et al. Cutinase catalytic triad location (Ser120, Asp175, His188). Biophys J. 1999.",
        url: "https://www.cell.com/AJHG/fulltext/S0006-3495(99)76874-8",
      },
      {
        label: "InterPro structure: PDB 1CEX cutinase.",
        url: "https://www.ebi.ac.uk/interpro/structure/PDB/1cex/",
      },
      {
        label: "RCSB PDB 1CEX — cutinase.",
        url: "https://www.rcsb.org/structure/1CEX",
      },
      {
        label: "InterPro Pfam PF01083 entry.",
        url: "https://www.ebi.ac.uk/interpro/entry/pfam/PF01083/",
      },
      {
        label: "InterPro PF01083 taxonomy (UniProt sunburst).",
        url: "https://www.ebi.ac.uk/interpro/entry/pfam/PF01083/taxonomy/uniprot/",
      },
      {
        label: "MDPI Microorganisms review (references 1999 triad paper).",
        url: "https://www.mdpi.com/2076-2607/10/6/1180",
      },
      {
        label: "MDPI Microplastics — fungal and bacterial cutinase PETase activity; phylogenetic tree.",
        url: "https://www.mdpi.com/2674-0583/1/1/4",
      },
      {
        label: "Annual Review of Plant Biology — cuticle and pathogen cutinases.",
        url: "https://www.annualreviews.org/content/journals/10.1146/annurev-arplant-043015-111929",
      },
      {
        label: "PubMed 34165618 — cutin, suberin, PET, BHET structures.",
        url: "https://pubmed.ncbi.nlm.nih.gov/34165618/",
      },
      {
        label: "PMC10577388 — PETase/cutinase catalytic steps (acylation, deacylation).",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10577388/",
      },
      {
        label: "PMC5455348 — cutinase/PETase mechanism and oxyanion hole.",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5455348/",
      },
      {
        label: "PMC9524616 — IsPETase catalytic triad and disulfide.",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9524616/",
      },
      {
        label: "PMC11866010 — engineered PETase thermostability.",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11866010/",
      },
      {
        label: "PMC8961046 — PETase disulfide bonds and temperature tolerance.",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8961046/",
      },
      {
        label: "Communications Chemistry — variability of cutinase-like domains in PETases.",
        url: "https://www.nature.com/articles/s42004-024-01154-x",
      },
      {
        label: "Carvalho H et al. Cutinase structure and applications. Biotechnol Adv. 2019.",
        url: "https://doi.org/10.1016/j.biotechadv.2018.12.005",
      },
    ],
    legendSegments: [{ label: "Cutinase α/β hydrolase", cathId: "3.40.50.1820" }],
    pdbIds: ["1CEX"],
    figures: [
      {
        caption:
          "Figure 1. Cutinase (PDB 1CEX) in ChimeraX: catalytic triad Ser120, Asp175, His188 (white/blue) and disulfides Cys31–Cys109, Cys171–Cys178 (green/red). Source: https://www.cell.com/AJHG/fulltext/S0006-3495(99)76874-8; https://www.ebi.ac.uk/interpro/structure/PDB/1cex/",
        imageSrc: "/cath/PF01083_cutinase_chimerax_triad.png",
        alt: "Cutinase structure with catalytic triad and disulfides highlighted",
      },
      {
        caption:
          "Figure 2. Cutinase chain A sequence (1CEX): α-helices (yellow boxes), β-strands (blue boxes), catalytic triad and disulfide cysteines highlighted.",
        imageSrc: "/cath/PF01083_cutinase_sequence.png",
        alt: "Cutinase protein sequence with secondary structure annotation",
      },
      {
        caption:
          "Figure 3. Phylogenetic tree of cutinases (MEGA 11, ClustalW alignment). Green = PET-degrading; blue = PCL; yellow = PLA; uncolored = cutin-specific. Source: https://www.mdpi.com/2674-0583/1/1/4",
        imageSrc: "/cath/PF01083_phylogenetic_tree.png",
        alt: "Cutinase phylogenetic tree colored by substrate specificity",
      },
      {
        caption:
          "Figure 4. Molecular structures of cutin (a), suberin (b), PET (c), and BHET (d). Source: https://pubmed.ncbi.nlm.nih.gov/34165618/",
        imageSrc: "/cath/PF01083_substrate_structures.png",
        alt: "Structures of cutin suberin PET and BHET",
      },
      {
        caption:
          "Figure 5. Cutinase molecular surface (1CEX): hydrophobic patches (gold) around the active-site cleft housing the catalytic triad (Ser120, His188, Asp175).",
        imageSrc: "/cath/PF01083_hydrophobic_surface.png",
        alt: "Cutinase hydrophobic surface near active site",
      },
      {
        caption:
          "Figure 6. Catalytic mechanism of cutinase/PETase ester hydrolysis: acylation, acyl–enzyme intermediate, water attack, and deacylation. Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC5455348/",
        imageSrc: "/cath/PF01083_mechanism_diagram.png",
        alt: "Cutinase catalytic mechanism diagram",
      },
    ],
  },
  {
    id: "pf-PF01738",
    pfamAccession: "PF01738",
    profileHmm: "DLH",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Dienelactone hydrolase family",
    lastUpdated: "2026-06-28",
    summary:
      "WORK IN PROGRESS: Curated by Clelia. Several sections remain empty and in-text citations are still being completed. PF01738 (DLH) covers dienelactone hydrolases that cleave cyclic esters in microbial pathways degrading chlorinated aromatic pollutants, using a Cys–His–Asp catalytic triad on an α/β hydrolase fold (https://www.ebi.ac.uk/thornton-srv/m-csa/entry/492/).",
    localization:
      "Dienelactone hydrolase (DLH) has been identified as a secreted enzyme in bacteria belonging to the phylum Bacteroidota, particularly within the class Flavobacteria (https://www.ebi.ac.uk/thornton-srv/m-csa/entry/492/). This extracellular or periplasmic localization suggests that DLH functions outside the cytosol, enabling interaction with environmental substrates. Such positioning is consistent with its role in the degradation of toxic aromatic compounds, which are typically encountered extracellularly.",
    ptms:
      "No curated post-translational modification notes yet for PF01738. This section is in progress.",
    catalyticResidues:
      "Dienelactone hydrolase contains a conserved catalytic triad composed of Cys-123, His-202, and Asp-171, which together facilitate its hydrolytic activity. Among these, Cys-123 serves as the essential nucleophilic residue, with its thiol group playing a central role in catalysis. Structurally, Cys-123 is positioned at the base of a helix located within the central cleft of the enzyme, placing it in an optimal orientation for substrate interaction. Notably, this residue lies within a γ-turn, resulting in unusual dihedral angles, a feature that may contribute to its heightened reactivity. His-202, stabilized through hydrogen bonding with Asp-171, functions as a general base, enabling activation of the cysteine thiol and promoting efficient catalysis (https://doi.org/10.1002/prot.340090405).",
    mechanisms:
      "Dienelactone hydrolase catalyzes ester hydrolysis through a Cys-His-Asp catalytic triad that facilitates nucleophilic attack and intermediate stabilization. Upon substrate binding, conformational changes within the active site promote deprotonation of Cys-123, generating a reactive thiolate nucleophile stabilized by His-202 and Asp-171. The thiolate then attacks the acyl carbon of dienelactone, forming a tetrahedral intermediate that is stabilized by an oxyanion hole involving backbone amides of Leu-124 and Ile-37. The collapse of this intermediate results in ring cleavage and formation of an enolate intermediate, with the expulsion of the heterocyclic oxygen. The enolate is subsequently protonated, yielding an acyl intermediate. In the final step, hydrolytic attack, facilitated by general base catalysis, leads to deacylation of the enzyme and release of the product, maleylacetate, thereby regenerating the active site. Additional residues, including Tyr-85 and Glu-36, contribute to stabilization of reaction intermediates and proton transfer, further supporting efficient catalysis (https://www.ebi.ac.uk/thornton-srv/m-csa/entry/492/).",
    interactingDomains:
      "No curated interacting-domain notes yet for PF01738. This section is in progress.",
    function:
      "Dienelactone hydrolases (DLHs) are enzymes that catalyze the hydrolytic cleavage of cyclic ester bonds, specifically converting dienelactone into maleylacetate. This reaction constitutes a key step in microbial catabolic pathways responsible for the degradation of toxic chlorinated aromatic compounds. By facilitating the breakdown of these persistent environmental pollutants, DLHs contribute to detoxification processes and enable microorganisms to utilize such compounds as carbon sources (https://www.ebi.ac.uk/thornton-srv/m-csa/entry/492/).",
    regulation:
      "Dienelactone hydrolase is likely regulated primarily at the level of gene expression, as it functions within microbial pathways for the degradation of xenobiotic compounds. Such enzymes are typically inducible and expressed in response to substrate availability, allowing microorganisms to conserve metabolic resources. There is limited evidence for direct allosteric regulation at the protein level, suggesting that DLH activity is largely governed by environmental conditions such as substrate presence, pH, and temperature.",
    variability:
      "No curated variability notes yet for PF01738. This section is in progress.",
    structure:
      "DLH belongs to the α/β hydrolase superfamily and exhibits a characteristic α/β fold consisting of a central β-sheet surrounded by α-helices. Structurally, the enzyme is a monomer composed of 236 amino acids, forming eight β-strands—primarily parallel—and seven α-helices that create a compact, globular architecture (https://journals.iucr.org/paper?S2053230X1401108X, https://doi.org/10.1002/prot.340090405). Notably, one of the helices is predominantly composed of nonpolar residues, suggesting a role in maintaining the hydrophobic core of the enzyme. The active site is located within a cleft on the enzyme surface, allowing substrate access and proper positioning for catalysis (https://doi.org/10.1002/prot.340090405). See Figure 1 (PDB 1DIN).",
    references: [
      ...pfamRefs("PF01738"),
      {
        label: "M-CSA entry 492 — dienelactone hydrolase Cys-His-Asp catalytic machinery.",
        url: "https://www.ebi.ac.uk/thornton-srv/m-csa/entry/492/",
      },
      {
        label:
          "Pathak RD, Popovic N, O'Donoghue AJ, et al. Structure of dienelactone hydrolase. Proteins. doi:10.1002/prot.340090405",
        url: "https://doi.org/10.1002/prot.340090405",
      },
      {
        label: "IUCrJ — DLH structural report (S2053230X1401108X).",
        url: "https://journals.iucr.org/paper?S2053230X1401108X",
      },
      {
        label: "RCSB PDB 1DIN — Dienelactone hydrolase at 2.8 Å.",
        url: "https://www.rcsb.org/structure/1DIN",
      },
    ],
    legendSegments: [{ label: "Dienelactone hydrolase (DLH)", cathId: "3.40.50.1820" }],
    pdbIds: ["1DIN"],
    figures: [
      {
        caption:
          "Figure 1. Dienelactone hydrolase at 2.8 Å (PDB 1DIN). Source: https://www.rcsb.org/structure/1DIN",
        imageSrc: "/cath/PF01738_DLH_structure.png",
        alt: "Dienelactone hydrolase ribbon structure PDB 1DIN",
      },
    ],
  },
  {
    id: "pf-PF10503",
    pfamAccession: "PF10503",
    profileHmm: "Esterase_PHB",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Polyhydroxybutyrate depolymerase / PHB esterase",
    lastUpdated: "2026-05-04",
    summary:
      "PHB depolymerases hydrolyze intracellular polyhydroxyalkanoates; polyester chemistry parallels PET oligomer hydrolysis though polymer crystallinity differs.",
    localization: "Often periplasmic or extracellular depolymerases in PHA-accumulating bacteria.",
    ptms: "Sparse—function dominated by catalytic domain exposure to granule surface.",
    catalyticResidues: "α/β hydrolase triad; substrate-binding grooves tuned to short-chain esters.",
    function: "PHA chain-end hydrolysis; PET links are contextual (polyesterase toolbox).",
    labNotes: "Compare chain-length specificity vs PET oligomers explicitly.",
    references: pfamRefs("PF10503"),
    legendSegments: [{ label: "PHA esterase", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF12146",
    pfamAccession: "PF12146",
    profileHmm: "Hydrolase_4",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Hydrolase-like domain 4",
    lastUpdated: "2026-05-04",
    summary:
      "Hydrolase_4 captures divergent α/β hydrolase inserts; functional assignments require experiments beyond HMM membership.",
    localization: "Context-dependent.",
    ptms: "Unknown general theme.",
    catalyticResidues: "Predict via alignment to nearest PDB.",
    function: "Putative hydrolase—validate substrates.",
    labNotes: "Cross-check PETadex neighborhoods for fused binding domains.",
    references: pfamRefs("PF12146"),
    legendSegments: [{ label: "Hydrolase-like", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF01674",
    pfamAccession: "PF01674",
    profileHmm: "Lipase_2",
    atlasComponent: 1,
    cathId: "3.40.50.1820",
    displayName: "Lipase class 2 / α/β hydrolase lipase",
    lastUpdated: "2026-05-04",
    summary:
      "Curated by Kathleen. Lipase_2 covers bacterial lipases with lid motifs controlling substrate access—relevant to interfacial activation on hydrophobic polymers.",
    localization: "Lipase_2 is commonly found in digestive enzymes and bacteria/fungi that degrade plant biomass. It is associated with lipid-water interfaces and is often found in extracellular or secreted enzymes. The enzyme stays inactive until it binds to a lipid-water interface, where it then becomes active and hydrolyzes the lipid.",
    ptms: "It contains N-Linked glycosylation for stability/secretion making it more resistant to proteases and have better folding efficiency, commonly found in eukaryotes. It has disulfide bond for structural stability, which is important for survival in environment like gut. It undergoes -	Proteolytic processing, cleaving to activate from precursor forms.",
    catalyticResidues: "Conserved triad (Ser, His, Asp/Glu) and belongs to the classic α/β hydrolase fold.",
    mechanisms: "The enzyme performs ester hydrolysis to break down lipids, where serine attacks ester bond to form intermediate where substrate is cleaved and fatty acid is released. Water is then hydrolyzed to an intermediate to regenerate the enzyme. It undergoes interfacial activation to break down the lipid-water interface to form an active enzyme.",
    interactingDomains: "Some variants have potential interactions with lipid binding domains and membrane associated regions. One such domain is colipase which is found in pancreatic lipase and helps in binding lipid droplets for better hydrolysis.",
    function: "Plays a big role in digestion, lipid remodelling and pathogenesis as bacteria uses lipases to invade tissues. It hydrolyses triglyceride into glycerol and fatty acids so stored fat is usable as energy with the following chain:	\nTriglycerides -> diacylglycerol -> monoacylglycerol -> glycerol and fatty acids",
    regulation:"Interfacial activation where lid domain only opens and activates upon contact with lipid surface. Colipase-dependent activation is required in presence of bile salts. -	Optimal pH varies by organism (ex. In humans pancreatic lipase optimal pH : ~7-8, gastric lipase : ~3-6). In animals its secretion is affected by hormones.",
    variability:"The catalytic triad and α/β hydrolase fold is relatively conserved however the surface loops and lid domains are variable to account for the different types of lipids.",
    structure:
      "α/β hydrolase fold with a helical lid element that shields the active site in the closed state and opens upon lipid binding; the open state is catalytically active. It contains a hydrophobic active-site pocket for lipid binding (Figure 1).",
    references: [
      {
        label: "RCSB PDB: 2OXE",
        url: "https://www.rcsb.org/structure/2OXE",
      },
      {
        label: "InterPro PF01674 structure (PDB table)",
        url: "https://www.ebi.ac.uk/interpro/entry/pfam/PF01674/structure/PDB/#table",
      },
      {
        label: "DOI: 10.1016/S1367-5931(02)00297-1",
        url: "https://doi.org/10.1016/S1367-5931(02)00297-1",
      },
      {
        label: "PubMed: 12323363",
        url: "https://pubmed.ncbi.nlm.nih.gov/12323363/",
      },
      {
        label: "Catalysts 2020, 10(7), 747 (DOI)",
        url: "https://doi.org/10.3390/catal10070747",
      },
      {
        label: "UniProt: P22394",
        url: "https://www.uniprot.org/uniprotkb/P22394/entry",
      },
    ],
    legendSegments: [{ label: "Lipase", cathId: "3.40.50.1820" }],
    pdbIds: ["2OXE"],
    figures: [
      {
        caption: "Figure 1. Representative Lipase_2 structure provided by curator.",
        imageSrc: "/cath/PF01674_lipase2_structure.png",
        alt: "Lipase_2 ribbon structure colored from N to C terminus",
      },
    ],
  },
  {
    id: "pf-PF13472",
    pfamAccession: "PF13472",
    profileHmm: "Lipase_GDSL_2",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "GDSL lipase / esterase",
    lastUpdated: "2026-05-04",
    summary:
      "GDSL enzymes use a flexible catalytic triad (Ser-Gly-Asp-Ser-Leu motif) distinct from classic GXSXG lipases; many exhibit polyesterase activity.",
    localization: "Periplasmic or secreted in bacteria; plant homologs target lipid signaling.",
    ptms: "Disulfides and glycans depend on species; bacterial forms often simpler.",
    catalyticResidues: "Triad residues can reorder during catalysis—consult structural studies.",
    function: "Broad esterase/lipase activity including synthetic polyesters in characterized cases.",
    labNotes: "Ideal for comparing mechanism with classic cutinases in PET benchmarks.",
    references: pfamRefs(
      "PF13472",
      "Akoh CC et al. GDSL family of lipases. Prog Lipid Res. 2004.",
      "https://doi.org/10.1016/j.plipres.2004.05.002",
    ),
    legendSegments: [{ label: "GDSL", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF09995",
    pfamAccession: "PF09995",
    profileHmm: "MPAB_Lcp_cat",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Lcp / MpaB' latex-cleaving catalytic module",
    lastUpdated: "2026-06-28",
    summary:
      "Curated by Aditya Ghosh. PF09995 (MPAB_Lcp_cat) covers latex-clearing protein (Lcp) in rubber-degrading bacteria and MpaB' in fungi. Members are heme b-dependent dioxygenases that cleave long-chain isoprenoid polymers or precursors—bacterial Lcp for environmental poly(cis-1,4-isoprene) and fungal MpaB' for mycophenolic acid biosynthesis—using a Lys167-gated active site that switches between closed and open globin states.",
    localization:
      "Fungal MpaB' is anchored to the ER inside the cell, while bacterial Lcp is secreted outside the cell. This protein family adapts its location based on its specific function. In fungi, the enzyme (MpaB') is used to build mycophenolic acid. It remains anchored to the endoplasmic reticulum (ER) inside the cell to work alongside other compartmentalized enzymes. Conversely, in bacteria, the enzyme (Lcp) is used to digest insoluble rubber polymers found in the environment. To achieve this, the bacteria utilizes a twin-arginine translocation (Tat) pathway to secrete the fully folded enzyme completely outside of the cell (https://doi.org/10.1073/pnas.1821932116, https://doi.org/10.1128/AEM.01001-08).",
    ptms:
      "Requires a heme b cofactor and membrane anchoring. This protein family requires the non-covalent incorporation of a heme b (iron-containing) cofactor to perform its oxidative cutting action. While the bacterial version is secreted, the fungal version (MpaB') functions as an integral monotopic protein that is physically anchored to the ER membrane. This anchoring is functionally necessary to allow the enzyme to reach its hydrophobic target substrate within the membrane (https://doi.org/10.1128/AEM.00275-15, https://doi.org/10.1073/pnas.1821932116).",
    catalyticResidues:
      "The active site relies on specific amino acids, including a heme-coordinating gate controlled by Lys167. Verification relied on site-directed mutagenesis and X-ray crystallography of LcpK30. Catalysis depends on a proximal His198 ligand to anchor the heme. A dynamic Lys167 residue acts as a molecular switch: it serves as a distal ligand in the closed (autoinhibited) state and moves aside to allow substrate and oxygen binding. Other essential active site residues include Arg164, Thr168, and Glu148, which acts as a base during the cleavage reaction (https://doi.org/10.1038/s41598-017-05268-2). See Figure 1 (closed, Lys167 ligated) and Figure 2 (open, Lys167 displaced).",
    mechanisms:
      "Endo-type oxidative scission into keto and aldehyde products. The enzyme acts as an endo-cleaving dioxygenase, meaning it cuts the polymer chain internally rather than from the ends. It attacks the cis double bonds of the polyisoprene backbone by inserting both atoms of molecular oxygen (O2). Researchers propose this happens through the formation of a cyclic dioxetane intermediate that spontaneously collapses. This cleavage yields a mixture of oligo-isoprenoids (e.g., C20 and higher) that all terminate with an aldehyde (−CH2−CHO) at one end and a ketone (−CH2−COCH3) at the other (https://doi.org/10.1128/AEM.01502-14, https://doi.org/10.1038/s41598-017-05268-2).",
    interactingDomains:
      "The core is capped by N- and C-terminal helices, and the fungal enzyme operates within a metabolic assembly line. Structurally, the central globin core of the enzyme is capped by an N-terminal domain (helices N1–N3) and a C-terminal domain (helices Z1–Z6). Opening the structure generates a continuous hydrophobic channel allowing the substrate to pass the active site. Metabolically, genomic analysis of the mpa cluster in Penicillium brevicompactum reveals that MpaB' operates sequentially with other compartmentalized enzymes, taking the substrate generated by MpaA (prenyltransferase) to feed the downstream pathway leading to MpaG (methyltransferase) (https://doi.org/10.1073/pnas.1821932116, https://doi.org/10.1038/s41598-017-05268-2).",
    function:
      "Polymer scission and tailoring. This enzyme family acts as molecular scissors to cut long, repeating carbon chains. In bacteria, it cleaves natural rubber into smaller metabolites that the cell can use for energy. In fungi, it performs a highly specific tailoring step: it cleaves the C19=C20 double bond of the precursor farnesyl-DHMP to yield the intermediate FDHMP-3C (overturning older theories that it produced mycophenolic aldehyde directly). The optimal conditions for the bacterial enzyme vary by species: the Streptomyces enzyme shows a 3-fold increase in specific activity at 37°C compared to room temperature, whereas the Gordonia enzyme operates optimally around 30°C and pH 7 (https://doi.org/10.1073/pnas.1821932116, https://doi.org/10.1128/AEM.00275-15, https://doi.org/10.1128/AEM.01502-14).",
    regulation:
      "Repressors, global switches and basal sensing. Expression is managed by a hierarchical regulatory network. Local control is handled by LcpR, a TetR-family repressor that binds to an inverted repeat in the promoter region to block major enzyme production when rubber is absent. However, the system maintains a low basal expression even on simple sugars like glucose, which is necessary to sense the rubber polymer in the environment and trigger the full activation cascade. Global control is managed by a cAMP receptor protein (CRP). CRP represses the local repressor (LcpR) while activating the oxygenase (Lcp). Because CRP relies on cAMP, it links the rubber degradation pathway directly to the cell's carbon starvation/energy status (https://doi.org/10.1099/mic.0.000755, https://doi.org/10.1128/AEM.00774-20, https://doi.org/10.1128/AEM.01001-08).",
    variability:
      "Genetic redundancy allows for specific rubber degradation, while metal cofactors might vary (one source argues for copper while another, more convincing source suggests iron and that the copper paper made a mistake due to contamination). Genomic analysis reveals that some rubber-degrading strains harbor multiple copies of the enzyme (e.g., lcp1, lcp2, and lcp3). These homologs show distinct expression patterns depending on whether the substrate is natural latex or vulcanized rubber (like tire powder). The domain uses a heme b (iron) cofactor, but an earlier biochemical analysis of Lcp1VH2 from Gordonia reported it to be a copper-dependent (Cu(II)) oxygenase. This claim is highly contested by subsequent studies; researchers argue the copper detection was likely a purification artifact bound to the His-tag, as high-fidelity analysis of the highly similar LcpK30 revealed strictly iron and zero copper (https://doi.org/10.3389/fmicb.2022.854427, https://doi.org/10.1128/AEM.01502-14, https://doi.org/10.1128/AEM.00275-15).",
    structure:
      "Globin open/closed states (PDB). The enzyme's core adopts a classical 3/3 globin fold. Crystallography reveals it exists in two distinct functional states cataloged in the Protein Data Bank. Entry 5O1M represents the closed (inactive) state, where Lys167 binds directly to the metal to block the entrance to the active site (Figure 1). Entry 5O1L represents the open state (captured using imidazole), where Lys167 moves aside to create a continuous hydrophobic channel that allows the long polymer substrate to pass the active site for cleavage (Figure 2). https://doi.org/10.1038/s41598-017-05268-2; https://www.rcsb.org/structure/5O1M; https://www.rcsb.org/structure/5O1L",
    references: [
      ...pfamRefs("PF09995"),
      {
        label:
          "Li Y et al. Compartmentalized biosynthetic pathway for mycophenolic acid (MpaB' at ER). Proc Natl Acad Sci U S A. doi:10.1073/pnas.1821932116",
        url: "https://doi.org/10.1073/pnas.1821932116",
      },
      {
        label:
          "Birke J et al. Lcp Tat-pathway secretion and rubber degradation. Appl Environ Microbiol. doi:10.1128/AEM.01001-08",
        url: "https://doi.org/10.1128/AEM.01001-08",
      },
      {
        label:
          "Birke J et al. LcpK30 heme b characterization. Appl Environ Microbiol. doi:10.1128/AEM.00275-15",
        url: "https://doi.org/10.1128/AEM.00275-15",
      },
      {
        label:
          "Röther D et al. LcpK30 crystal structure, Lys167 open/closed states. Sci Rep. doi:10.1038/s41598-017-05268-2",
        url: "https://doi.org/10.1038/s41598-017-05268-2",
      },
      {
        label:
          "Birke J et al. Endo-cleavage of poly(cis-1,4-isoprene). Appl Environ Microbiol. doi:10.1128/AEM.01502-14",
        url: "https://doi.org/10.1128/AEM.01502-14",
      },
      {
        label: "LcpR TetR-family repressor. Microbiology. doi:10.1099/mic.0.000755",
        url: "https://doi.org/10.1099/mic.0.000755",
      },
      {
        label:
          "CRP global regulation of lcp/lcpR. Appl Environ Microbiol. doi:10.1128/AEM.00774-20",
        url: "https://doi.org/10.1128/AEM.00774-20",
      },
      {
        label:
          "Multiple lcp homologs and substrate-dependent expression. Front Microbiol. doi:10.3389/fmicb.2022.854427",
        url: "https://doi.org/10.3389/fmicb.2022.854427",
      },
      {
        label: "RCSB PDB 5O1M — LcpK30 closed state (Lys167 ligated)",
        url: "https://www.rcsb.org/structure/5O1M",
      },
      {
        label: "RCSB PDB 5O1L — LcpK30 open state (substrate channel)",
        url: "https://www.rcsb.org/structure/5O1L",
      },
    ],
    legendSegments: [{ label: "Lcp / MpaB' globin core", cathId: "3.40.50.1820" }],
    pdbIds: ["5O1M", "5O1L"],
    figures: [
      {
        caption:
          "Figure 1. LcpK30 closed state (PDB 5O1M): Lys167 highlighted as distal heme ligand, blocking access to the active site. Source: https://doi.org/10.1038/s41598-017-05268-2",
        imageSrc: "/cath/PF09995_closed_lys167.png",
        alt: "LcpK30 closed state with Lys167 highlighted",
      },
      {
        caption:
          "Figure 2. LcpK30 open state (PDB 5O1L): Lys167 displaced to open a hydrophobic substrate channel past the heme. Source: https://doi.org/10.1038/s41598-017-05268-2",
        imageSrc: "/cath/PF09995_open_lys167.png",
        alt: "LcpK30 open state with Lys167 highlighted",
      },
    ],
  },
  {
    id: "pf-PF03403",
    pfamAccession: "PF03403",
    profileHmm: "PAF-AH_p_II",
    atlasComponent: 1,
    cathId: "3.40.50.1820",
    displayName: "Platelet-activating factor acetylhydrolase IB / phospholipase A2-like",
    lastUpdated: "2026-05-04",
    summary:
      "WORK IN PROGRESS: Curated by Amy Dengler. PAF-AH_p_II refers to platelet-activating factor acetylhydrolases.",
    localization: "Cytosolic or plasma-associated depending on isoform.",
    ptms: "Phosphorylation reported for regulatory control in mammals.",
    catalyticResidues: "Ser hydrolase center distinct from secreted PLA2 His/Asp pairs.",
    function:
      "PAF-AH_p_II refers to platelet-activating factor acetylhydrolases, which break down platelet-activating factor, a specialized phosppholipid involved in signalling. As such, they are a type of phospholipase A2. Phospholipid acyl hydrolysis; PET relevance limited unless fused with polymer-binding modules.",
    structure:
      "RCSB PDB 3D59 — human plasma platelet-activating factor acetylhydrolase",
    labNotes: "Use phospholipid substrates when validating—not PET films alone.",
    references: [
      ...pfamRefs("PF03403"),
      {
        label: "RCSB PDB 3D59 — human plasma platelet-activating factor acetylhydrolase",
        url: "https://www.rcsb.org/structure/3D59",
      },
    ],
    legendSegments: [{ label: "PAF-AH-like", cathId: "3.40.50.1820" }],
    pdbIds: ["3D59"],
    figures: [],
  },
  {
    id: "pf-PF00082",
    pfamAccession: "PF00082",
    profileHmm: "Peptidase_S8",
    atlasComponent: 11,
    cathId: "2.40.10.10",
    displayName: "Peptidase_S8 Pfam",
    lastUpdated: "2026-05-04",
    summary:
    "Curated by Angela Jiang. Peptidase_S8 Pfam, also known as the “Subtilase family”, encompasses subtilisin-like serine proteases that have an Asp-His-Ser catalytic triad (though independently of and non-homologous to trypsin-like proteases) as well as an α/β fold containing a seven-stranded parallel β-sheet.",
    moreInformationFigure: {
      imageSrc: "/cath/PF00082_figure1ab_subtilisin.png",
      caption:
        "Figure 1ab. 3D structure of subtilisin BPN', or subtilisin Carlsberg from Bacillus species, often chosen as the representative of the family",
      alt: "Subtilisin BPN' and subtilisin Carlsberg 3D structures",
    },
    preLocalizationTable: {
      caption: "Table 1. Common localization and functions of Peptidase_S8",
      headers: ["Origin", "Common localization", "Examples", "Notes on common biological function"],
      rows: [
        [
          "Bacteria",
          "Extracellular",
          "Subtilisin (Bacillus)",
          "Secreted enzymes for nutrient acquisition",
        ],
        [
          "Archaea",
          "Extracellular / periplasmic",
          "Aqualysin (thermophiles)",
          "Similar to bacterial secretion",
        ],
        [
          "Fungi",
          "Extracellular",
          "Plasmodium SUB1",
          "Often for nutrient acquisition",
        ],
        [
          "Plants",
          "Cell wall/apoplast (intercellular)",
          "Arabidopsis subtilases",
          "Growth and development, and immune defense",
        ],
        [
          "Animals",
          "Secretory pathway (trans-Golgi network, plasma membrane, endosomes, lysosome, extracellular, etc.)",
          "Furin",
          "Enzymes for protein processing",
        ],
      ],
    },
    localization:
      "In bacteria, archaea, and fungi, subtilases are most secreted extracellularly for catalysis via the Sec pathway. Other possible though less common localizations include cell-surface attached (e.g. lactocepin), intracellular (e.g. lantibiotic leader peptidases), and perislamic space in Gram-negative bacteria (e.g. Carboxyl-terminal processing protease A). In plants, subtilases are generally secreted into the apoplast, the intercellular space consisting of cell wall, xylem cells, and space. As for animals, subtilases are usually found within the secretory pathway.",
    postLocalizationTable: {
      caption: "Representative members and subfamilies",
      headers: [
        "Subgroup",
        "Representative proteins (structures)",
        "Usual substrate preference",
        "Typical localization pattern",
        "Notable architectural / regulatory features",
      ],
      rows: [
        [
          "S8A (subtilisin-like, broad)",
          "Subtilisin BPN' (1SBT), Proteinase K (1IC6), plant SBT3 (3I6S)",
          "Often cleave after hydrophobic residues; casein is a common experimental substrate",
          "Often secreted in microbes; plant subtilases are often secretory-pathway / extracellular-facing",
          "Common pre-pro-enzyme logic with signal peptide (frequent, not universal), inhibitory/chaperoning propeptide, and catalytic domain; many members show Ca2+-dependent stabilization; some proteins carry large inserts or extra modules such as PA and FnIII-like domains",
        ],
        [
          "S8B (kexin/furin convertases)",
          "Kex2 (1OT5), Furin (1P8J, 4OMD)",
          "Cleave at basic, often dibasic, motifs rather than the broader hydrophobic preference typical of many S8A enzymes",
          "Secretory pathway, especially trans-Golgi network / endosomal membranes for furin-like enzymes",
          "Core organization is catalytic subtilisin-like domain + P domain; the P domain is a jelly-roll-like fold and, together with Ca2+ and surface loops, helps shape stringent basic-site specificity",
        ],
      ],
    },
    ptms:
      "Preproenzyme architecture and processing:\n- Many PF00082 proteins are synthesized as preproenzymes with a signal peptide (when secreted), a propeptide/prodomain, and then the catalytic subtilase domain.\n- The propeptide functions as an intramolecular chaperone and inhibitory segment before maturation.\n- See Figure 2 for the propeptide/proteinase inhibitor I9 context.\n\nGlycosylation:\n- N-glycosylation is common in eukaryotic secretory-pathway subtilases.\n- Reported roles include folding, trafficking, secretion efficiency, and zymogen maturation.\n\nDisulfide bonds:\n- Disulfides occur in a subset of PF00082 proteins, especially secretory-pathway members.\n- Number and positions are protein-specific rather than family-defining and are best verified per sequence/structure.",
    catalyticResidues:
      "Catalytic residue identities, motifs, and conservation:\n- MEROPS family-level summary for S8: catalytic triad ordered Asp -> His -> Ser (sequence order).\n- S8A motifs often include Asp-Thr/Ser-Gly, His-Gly-Thr-His, and serine-region motif Gly-Thr-Ser-Met-Ala-X-Pro.\n- S8B motifs often include Asp-Asp-Gly, His-Gly-Thr-Arg, and serine-region motif Gly-Thr-Ser-Ala/Val-Ala/Ser-Pro.\n- S8A and S8B differ in surrounding sequence context of catalytic residues; S8B members such as kexin/furin are functionally distinct and commonly cleave after dibasic sites.\n- PROSITE catalytic signatures: PS00136 (SUBTILASE_ASP), PS00137 (SUBTILASE_HIS), PS00138 (SUBTILASE_SER).\n- Two calcium-binding sites contribute to thermal stability in many S8 members.",
    mechanisms:
      "Catalytic mechanism and pH behavior:\n1. Activation of Ser nucleophile: His acts as general base to deprotonate catalytic Ser hydroxyl; Asp stabilizes and aligns His (charge relay).\n2. Acylation: Ser O- attacks peptide carbonyl -> tetrahedral intermediate (oxyanion stabilized) -> collapse -> acyl-enzyme; leaving group exits.\n3. Deacylation: water activated by His attacks acyl-enzyme carbonyl -> second tetrahedral intermediate -> collapse -> product release and Ser regeneration.\n- As with other serine proteases, an oxyanion hole stabilizes tetrahedral intermediates during both acylation and deacylation.\n- Core chemistry is conserved across the family, but substrate specificity varies: many S8 enzymes prefer cleavage after hydrophobic residues, while S8B members such as kexin/furin commonly cleave after dibasic sites.\n- Most S8 members are active at neutral to mildly alkaline pH; thermophilic/alkaliphilic members are common in practical enzyme sets.",
    interactingDomains:
      "Peptidase_S8 is structurally similar and closely related to Peptidase_S53, another family of serine proteases represented by sedolisin found in Pseudomonas bacteria. However, many members of S53 have a Ser-Glu-Asp catalytic site instead and are often acidic. S53 proteins are classified as a different family by MEROPS; however, S53 and S8 are under the same SB clan and are often discussed together in various papers.\n\nCommon pre-pro-enzyme logic with signal peptide (frequent, not universal), inhibitory/chaperoning propeptide, and catalytic domain; many members show Ca2+-dependent stabilization; some proteins carry large inserts or extra modules such as PA and FnIII-like domains.\n\nCore organization is catalytic subtilisin-like domain + P domain; the P domain is a jelly-roll-like fold and, together with Ca2+ and surface loops, helps shape stringent basic-site specificity.",
    function:
      "Peptide bond hydrolysis; polyester activity uncommon—validate separately.\n\nIn bacteria, archaea, and fungi, subtilases are often involved in nutrition. In plants, subtilases have functions in roles like growth & development and immune defense. In animals, subtilases are endopeptidases that cleave the N-terminal proline of proteins to release the protein.\n\nS8A (subtilisin-like, broad): Often cleave after hydrophobic residues; casein is a common experimental substrate.\n\nS8B (kexin/furin convertases): Cleave at basic, often dibasic, motifs rather than the broader hydrophobic preference typical of many S8A enzymes.",
    regulation:
      "Zymogen activation and cleavage:\n- Activation is typically multi-step: folding assistance by the prodomain, autoprocessing at the prodomain-catalytic boundary, then prodomain release/degradation.\n- Cleavage and full activation can be separable steps in subtilase systems.",
    variability:
      "The family can be further divided into two subfamilies, S8A which can be represented by proteinase K, and S8B which can be presented by kexin. Most well-known subtilases belong to S8A (where further classification has also been proposed), where S8B has a slightly different active site motif and exhibits higher substrate specificity.\n\nSubtilases have a broad taxonomic range and are found across all three domains of life (Archaea, Bacteria, and Eukaryotes). S8A are found across all kingdoms, whereas S8B are primarily found in eukaryotes.",
    structure:
      "Figure 1ab. 3D structure of subtilisin BPN', or subtilisin Carlsberg from Bacillus species, often chosen as the representative of the family",
    postCatalyticResiduesTable: {
      caption: "Catalytic residues and consensus motifs",
      headers: [
        "Functional element",
        "PROSITE / MEROPS motif summary",
        "What it marks",
        "Example positions",
      ],
      rows: [
        [
          "Asp region (S8)",
          "PROSITE PS00136; MEROPS notes Asp-Thr/Ser-Gly in S8A and Asp-Asp-Gly in S8B",
          "Catalytic Asp of the Asp-His-Ser triad",
          "1SBT Asp32; 1OT5 Asp175",
        ],
        [
          "His region (S8)",
          "PROSITE PS00137; MEROPS notes His-Gly-Thr-His in S8A vs His-Gly-Thr-Arg in S8B",
          "Catalytic His acting as general base/acid",
          "1SBT His64; 1OT5 His213",
        ],
        [
          "Ser region (S8)",
          "PROSITE PS00138; MEROPS notes Gly-Thr-Ser-Met-Ala-X-Pro-type motifs in S8A and Gly-Thr-Ser-Ala/Val-Ala/Ser-Pro in S8B",
          "Catalytic Ser nucleophile",
          "1SBT Ser221; 1OT5 Ser385",
        ],
      ],
    },
    postStructureTable: {
      caption: "Selected PDB structures spanning PF00082",
      headers: [
        "PDB",
        "System (subgroup)",
        "Method / resolution",
        "Bound ligands / inhibitors",
        "Why it is useful",
      ],
      rows: [
        [
          "1SBT",
          "Subtilisin BPN' (S8A)",
          "X-ray, 2.50 A",
          "No major inhibitor emphasized on the structure summary",
          "Classic subtilisin-fold reference structure",
        ],
        [
          "1IC6",
          "Proteinase K (S8A)",
          "X-ray, 0.98 A",
          "Includes Ca2+ in the solved structure",
          "Atomic-resolution view of the Asp-His-Ser network and a concrete example of Ca2+-stabilized S8 architecture",
        ],
        [
          "1SCJ",
          "Subtilisin E-propeptide complex (S8A)",
          "X-ray, 2.0 A",
          "No external inhibitor; trapped autoprocessed complex",
          "Shows the 77-residue propeptide bound after cleavage, supporting its role as intramolecular chaperone/inhibitor during maturation",
        ],
        [
          "3I6S",
          "Plant SBT3 (S8A-like)",
          "X-ray, 2.50 A",
          "Glycan components present in the structure; primary paper discusses inhibitor-bound comparisons",
          "Shows a 132 aa PA-domain insertion plus a C-terminal FnIII-like domain; PA domain is linked to homodimerization and activation",
        ],
        [
          "1OT5",
          "Kex2 (S8B)",
          "X-ray, 2.4 A",
          "Ac-Ala-Lys-boroArg peptidyl boronic-acid inhibitor",
          "Clean structural example of catalytic domain + P domain; jelly-roll-like P domain plus buried Ca2+ help explain stringent basic-site specificity",
        ],
        [
          "1P8J",
          "Furin ectodomain (S8B)",
          "X-ray, 2.60 A",
          "dec-RVKR-cmk",
          "Defines the furin P domain as an eight-stranded jelly-roll and ties loop architecture to recognition of Arg/Lys-rich cleavage motifs",
        ],
        [
          "4OMD",
          "Human furin (S8B)",
          "X-ray, 2.70 A",
          "Competitive inhibitor Phac-RVR-Amba",
          "Useful disease-relevance / inhibitor-design furin structure",
        ],
      ],
    },
    labNotes: "Use protease inhibitors and correct buffers when co-assaying with esterases.",
    references: [
      {
        label: "PF00082 / S8 family: MEROPS family S8",
        url: "https://www.ebi.ac.uk/merops/cgi-bin/famsum?family=S8",
      },
      {
        label: "PF00082 / S8 family: InterPro PF00082",
        url: "https://www.ebi.ac.uk/interpro/entry/pfam/PF00082",
      },
      {
        label: "PF00082 / S8 family: InterPro IPR010259",
        url: "https://www.ebi.ac.uk/interpro/entry/InterPro/IPR010259/",
      },
      {
        label: "PF00082 / S8 family: NCBI SPARCLE architecture viewer",
        url: "https://www.ncbi.nlm.nih.gov/Structure/sparcle/archview.html?archid=12477846",
      },
      {
        label: "PF00082 / S8 family: MEROPS family S53 (related SB clan family)",
        url: "https://www.ebi.ac.uk/merops/cgi-bin/famsum?family=S53",
      },
      {
        label: "Motif references: PROSITE PS00136 (SUBTILASE_ASP)",
        url: "https://prosite.expasy.org/PS00136",
      },
      {
        label: "Motif references: PROSITE PS00137 (SUBTILASE_HIS)",
        url: "https://prosite.expasy.org/PS00137",
      },
      {
        label: "Motif references: PROSITE PS00138 (SUBTILASE_SER)",
        url: "https://prosite.expasy.org/PS00138",
      },
      {
        label: "Motif references: PROSITE PDOC00125",
        url: "https://prosite.expasy.org/PDOC00125",
      },
      {
        label: "Review/paper: PMC9549277",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9549277/",
      },
      {
        label: "Review/paper: PMC11593635",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11593635/",
      },
      {
        label: "Review/paper: PMC2675663",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2675663/",
      },
      {
        label: "Review/paper: PubMed 21527438",
        url: "https://pubmed.ncbi.nlm.nih.gov/21527438/",
      },
      {
        label: "Review/paper: Furin disulfide-bond folding analysis (ResearchGate)",
        url: "https://www.researchgate.net/publication/352650591_Disulfide_Bonds_In_the_Catalytic_Domain_Of_Furin_Are_Necessary_for_Compartment-Specific_Folding_Events",
      },
      {
        label: "Review/paper: Journal of Lipid Research article PDF",
        url: "https://www.jlr.org/article/S0022-2275%2820%2930607-6/pdf?utm_source=chatgpt.com",
      },
      {
        label: "Classic review: Siezen RJ. Subtilases: superfamily of subtilisin-like serine proteases. Protein Sci. 1996.",
        url: "https://doi.org/10.1002/pro.5560050303",
      },
      {
        label: "Specific proteins: structures can be explored by IDs in RCSB PDB",
        url: "https://www.rcsb.org/",
      },
    ],
    legendSegments: [{ label: "Subtilisin fold", cathId: "2.40.10.10" }],
    pdbIds: ["1SBT"],
    figures: [
      {
        caption:
          "Figure 1ab. 3D structure of subtilisin BPN', or subtilisin Carlsberg from Bacillus species, often chosen as the representative of the family",
        imageSrc: "/cath/PF00082_figure1ab_subtilisin.png",
        alt: "Subtilisin BPN' and subtilisin Carlsberg 3D structures",
      },
      {
        caption: "Figure 2. The propeptide/proteinase inhibitor I9",
        imageSrc: "/cath/PF00082_figure2_i9.png",
        alt: "Propeptide or proteinase inhibitor I9 view",
      },
    ],
  },
  {
    id: "pf-PF03576",
    pfamAccession: "PF03576",
    profileHmm: "Peptidase_S58",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "S58 serine peptidase / nucleophilic hydrolase",
    lastUpdated: "2026-05-04",
    summary:
      "Peptidase_S8-like catalytic units appear in diverse modular enzymes; confirm fold class before mixing with α/β hydrolase PET mechanisms.",
    localization: "Depends on parent protein.",
    ptms: "Host-specific.",
    catalyticResidues: "Align to S58 reference structures.",
    function: "Peptide bond hydrolysis in canonical forms.",
    labNotes: "Curate remote hits carefully—may be annotation noise.",
    references: pfamRefs("PF03576"),
    legendSegments: [{ label: "Peptidase S58", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF06850",
    pfamAccession: "PF06850",
    profileHmm: "PHB_depo_C",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "PHA depolymerase C-terminal domain",
    lastUpdated: "2026-05-04",
    summary:
      "C-terminal accessory domains of PHB depolymerases mediate substrate binding to granules; often paired with catalytic domains.",
    localization: "Granule surface targeting.",
    ptms: "Limited.",
    catalyticResidues: "Typically non-catalytic binding module—do not assign triad here without structures.",
    function: "Substrate anchoring and processivity on PHA granules.",
    labNotes: "Assay full-length depolymerase vs catalytic domain alone.",
    references: pfamRefs("PF06850"),
    legendSegments: [{ label: "PHA binding", cathId: "3.40.50.1820" }],
    figures: [],
  },
  {
    id: "pf-PF01522",
    pfamAccession: "PF01522",
    profileHmm: "Polysacc_deac_1",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Polysaccharide deacetylase",
    lastUpdated: "2026-06-28",
    summary:
      "WORK IN PROGRESS: Curated by Arya Bari. Most narrative sections below are placeholders; in-text citations are partial. Polysaccharide deacetylases (PDAs) constitute a vast, functionally diverse set of metalloenzymes, primarily categorized within Carbohydrate Esterase Family 4 (CE4) (https://pubmed.ncbi.nlm.nih.gov/24637747/, https://www.sciencedirect.com/science/article/pii/S0021925820337030). CE4 members catalyze deacetylation of acetylated sugars—N-linked acetyl groups from GlcNAc residues or O-linked acetyl groups from O-acetylxylose residues (https://pubmed.ncbi.nlm.nih.gov/24637747/, https://www.sciencedirect.com/science/article/pii/S0021925820337030). By modifying acetylation of cell-surface carbohydrates such as peptidoglycan, chitin, and exopolysaccharides, these proteins dictate biophysical properties and modulate interactions with the environment (https://pmc.ncbi.nlm.nih.gov/articles/PMC7448272/, https://www.mdpi.com/1422-0067/19/2/412). PDAs support bacterial survival through host immune evasion and biofilm structural integrity (https://pubmed.ncbi.nlm.nih.gov/24637747/).",
    localization:
      "Enzyme localization refers to the function-specific location of an enzyme (https://www.sciencedirect.com/topics/medicine-and-dentistry/enzyme-localization). To facilitate modification of cell-wall polysaccharides, Polysacc_deac_1 is most often located extracellularly or at the cell membrane (https://pmc.ncbi.nlm.nih.gov/articles/PMC6115787/).",
    ptms:
      "No curated post-translational modification notes yet for PF01522. This section is in progress.",
    catalyticResidues:
      "No curated catalytic residue notes yet for PF01522. CE4 polysaccharide deacetylases typically use metal-dependent active sites rather than a Ser–His–Asp triad; this section is in progress.",
    mechanisms:
      "No curated mechanism notes yet for PF01522. This section is in progress.",
    interactingDomains:
      "No curated interacting-domain notes yet for PF01522. This section is in progress.",
    function:
      "No curated function notes yet for PF01522 beyond the overview summary. This section is in progress.",
    regulation:
      "No curated regulation notes yet for PF01522. This section is in progress.",
    variability:
      "No curated variability notes yet for PF01522. This section is in progress.",
    structure:
      "Representative structures for PF01522 (Polysacc_deac_1) are indexed at InterPro (https://www.ebi.ac.uk/interpro/entry/pfam/PF01522/) and include PDB 3VUS (https://www.ebi.ac.uk/interpro/structure/PDB/3vus/, https://www.rcsb.org/structure/3VUS). CE4 deacetylases commonly adopt a conserved (α/β)8 fold (https://pubmed.ncbi.nlm.nih.gov/24637747/). See Figure 1 (InterPro representative) and Figure 2 (PDB 3VUS).",
    references: [
      ...pfamRefs("PF01522"),
      {
        label:
          "Strunk RJ et al. Structure of BA0150, a putative polysaccharide deacetylase. Acta Crystallogr F Struct Biol Commun. PMID:24637747",
        url: "https://pubmed.ncbi.nlm.nih.gov/24637747/",
      },
      {
        label:
          "SciDirect — Gram-negative bacterial polysaccharide deacetylation and virulence (S0021925820337030).",
        url: "https://www.sciencedirect.com/science/article/pii/S0021925820337030",
      },
      {
        label: "PMC7448272 — cell-surface polysaccharide modification and LPS.",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7448272/",
      },
      {
        label: "MDPI Int J Mol Sci — polysaccharide deacetylases in diverse biological functions.",
        url: "https://www.mdpi.com/1422-0067/19/2/412",
      },
      {
        label: "ScienceDirect Topics — enzyme localization.",
        url: "https://www.sciencedirect.com/topics/medicine-and-dentistry/enzyme-localization",
      },
      {
        label: "PMC6115787 — polysaccharide deacetylases (PDAs) and membrane localization.",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6115787/",
      },
      {
        label: "InterPro Pfam PF01522 (Polysacc_deac_1).",
        url: "https://www.ebi.ac.uk/interpro/entry/pfam/PF01522/",
      },
      {
        label: "InterPro structure: PDB 3VUS.",
        url: "https://www.ebi.ac.uk/interpro/structure/PDB/3vus/",
      },
      {
        label: "RCSB PDB 3VUS.",
        url: "https://www.rcsb.org/structure/3VUS",
      },
      {
        label: "doi:10.1107/S2053230X13034262 — BA0150 crystal structure.",
        url: "https://doi.org/10.1107/S2053230X13034262",
      },
    ],
    legendSegments: [{ label: "Polysaccharide deacetylase (CE4)", cathId: "3.40.50.1820" }],
    pdbIds: ["3VUS"],
    figures: [
      {
        caption:
          "Figure 1. Representative structure for PF01522 (Polysacc_deac_1) from InterPro. Source: https://www.ebi.ac.uk/interpro/entry/pfam/PF01522/",
        imageSrc: "/cath/PF01522_interpro_representative.png",
        alt: "InterPro representative structure for PF01522",
      },
      {
        caption:
          "Figure 2. InterPro 3D structure entry for PDB 3VUS. Source: https://www.ebi.ac.uk/interpro/structure/PDB/3vus/; https://www.rcsb.org/structure/3VUS",
        imageSrc: "/cath/PF01522_PDB_3vus.png",
        alt: "PDB 3VUS polysaccharide deacetylase structure",
      },
    ],
  },
  {
    id: "pf-PF02983",
    pfamAccession: "PF02983",
    profileHmm: "Pro_Al_protease",
    atlasComponent: null,
    cathId: "2.40.10.10",
    displayName: "Prolyl aminopeptidase / protease module",
    lastUpdated: "2026-05-04",
    summary:
      "Prolyl aminopeptidase domains cleave N-terminal prolines; fold distinct from α/β hydrolase PETases.",
    localization: "Cytosolic in many bacteria.",
    ptms: "Species-dependent.",
    catalyticResidues: "Ser/Cys nucleophile in aminopeptidase clan—verify clan assignment.",
    function: "N-terminal proline processing.",
    labNotes: "PET esterase claims need orthogonal validation.",
    references: pfamRefs("PF02983"),
    legendSegments: [{ label: "Aminopeptidase", cathId: "2.40.10.10" }],
    figures: [],
  },
  {
    id: "pf-PF21419",
    pfamAccession: "PF21419",
    profileHmm: "RoxA-like_Cyt-c",
    atlasComponent: null,
    cathId: "3.40.710.10",
    displayName: "RoxA-like cytochrome c / rubber oxygenase domain",
    lastUpdated: "2026-06-28",
    summary:
      "WORK IN PROGRESS: Curated by Austin Chiang. The RoxA-like_Cyt-c domain (PF21419) is the structural domain of rubber oxygenase A (RoxA) from Xanthomonas sp. (https://www.ebi.ac.uk/interpro/entry/pfam/PF21419/). RoxA-like refers to domains sharing shape/sequence with the enzyme first characterized in rubber-degrading Xanthomonas sp. 35Y (https://pmc.ncbi.nlm.nih.gov/articles/PMC5494620/, https://pmc.ncbi.nlm.nih.gov/articles/PMC6311187/). Cyt-c indicates membership in the cytochrome c family—heme-binding proteins that shuttle electrons during catalysis (https://www.sciencedirect.com/topics/biochemistry-genetics-and-molecular-biology/cytochrome). The domain carries two specialized c-type hemes that oxidatively cleave the polyisoprene backbone into metabolizable oligoisoprenoids (https://pmc.ncbi.nlm.nih.gov/articles/PMC6311187/). Panel A of Figure 1 shows RoxA with its two hemes; panel B shows the ODTD cleavage product (https://pmc.ncbi.nlm.nih.gov/articles/PMC3752256/).",
    localization:
      "Rubber (polyisoprene) is a high-molecular-weight polymer that cannot enter cells directly. Rubber oxygenases are therefore secreted extracellularly to depolymerize rubber into low-molecular-weight compounds that can be transported for metabolism (https://pmc.ncbi.nlm.nih.gov/articles/PMC5494620/). Export is typically Sec-dependent, as indicated by a conserved N-terminal signal peptide also seen in RoxB (https://pmc.ncbi.nlm.nih.gov/articles/PMC5494620/). The PF21419 domain is found in secreted rubber oxygenase proteins.",
    ptms:
      "Covalent attachment of two c-type heme groups to the polypeptide via CXXCH motifs (C191/C194 for heme 1; C390/C393 for heme 2), with histidines H195 and H394 as proximal axial ligands (https://pmc.ncbi.nlm.nih.gov/articles/PMC5494620/, https://pmc.ncbi.nlm.nih.gov/articles/PMC3752256/). Hemes are permanently thioether-linked through cysteine residues in the protein matrix (https://pmc.ncbi.nlm.nih.gov/articles/PMC3752256/).",
    catalyticResidues:
      "H195 and H394 serve as proximal axial ligands anchoring heme iron below each porphyrin (H195 for heme 1, H394 for heme 2) (https://pmc.ncbi.nlm.nih.gov/articles/PMC3752256/). F317 and E314 form part of a hydrophobic pocket near heme 1; F317 sits ~5 Å from the distal heme iron and is critical for activity, with G314 and F317 hydrogen-bonding to a structured water (W1) (https://pmc.ncbi.nlm.nih.gov/articles/PMC3752256/). A251, I252, F301, L254, I255, and A316 line hydrophobic channels that attract polyisoprene into the cavity (https://pmc.ncbi.nlm.nih.gov/articles/PMC3752256/). H312 and Y462 interact with the terminal carbonyl of the substrate chain via hydrogen bonds that position the scissile bond between the 3rd and 4th isoprene units near the O2 ligand at heme 1 (https://pmc.ncbi.nlm.nih.gov/articles/PMC3752256/). S313 and Q300 coordinate active-site waters W2 and W3 that help stabilize the dioxygenase intermediate (https://pmc.ncbi.nlm.nih.gov/articles/PMC3752256/). Heme 1 binds O2 and is the site of oxygen activation; heme 2 contributes to stabilization and electron transfer (https://pmc.ncbi.nlm.nih.gov/articles/PMC3752256/). See Figure 1.",
    mechanisms:
      "Suggested dioxygenase mechanism (synthesized from Braaz et al. 2005 and Seidel et al. 2013): (1) RoxA binds O2 at heme 1 (Fe2+). (2) An iron–superoxide complex forms (Fe3+–O2−). (2.1) Bulky aromatic side chains form hydrophobic channels for polyisoprene entry. (3) Oxygen abstracts an allylic hydrogen, forming an oxygen bridge to the substrate. (4) A 1,2-dioxetane intermediate forms. (5) The intermediate cleaves with simultaneous C–C and O–O bond breakage, yielding the preferred C15 product 12-oxo-4,8-dimethyl-trideca-4,8-diene-1-al (ODTD). (6) The heme iron returns to Fe2+ for the next cycle (https://pmc.ncbi.nlm.nih.gov/articles/PMC1087590/, https://pmc.ncbi.nlm.nih.gov/articles/PMC3752256/). Figure 2 (2013 mechanism) and Figure 3 (2005 mechanism; slightly outdated) illustrate the pathway.",
    interactingDomains:
      "No curated interacting-domain notes yet for PF21419. This section is in progress.",
    function:
      "Primary oxidative cleavage of poly(cis-1,4-isoprene) into ODTD, a C15 tri-isoprenoid aldehyde/ketone-terminated product (https://pmc.ncbi.nlm.nih.gov/articles/PMC1087590/, https://pmc.ncbi.nlm.nih.gov/articles/PMC3752256/).",
    regulation:
      "RoxA is induced by polyisoprene. In Xanthomonas, roxA transcription is significantly upregulated on polyisoprene medium compared with glucose (https://pmc.ncbi.nlm.nih.gov/articles/PMC5494620/).",
    variability:
      "No curated variability notes yet for PF21419. This section is in progress.",
    structure:
      "Crystal structure PDB 4B2N (RoxA, Xanthomonas sp. 35Y) resolves the two covalently bound hemes at the domain core (https://www.rcsb.org/structure/4B2N, https://doi.org/10.2210/pdb4B2N/pdb, https://doi.org/10.1073/pnas.1305560110). See Figure 4. Figure 1 panel A shows the RoxA fold with heme 1 and heme 2 labeled (https://pmc.ncbi.nlm.nih.gov/articles/PMC3752256/).",
    references: [
      ...pfamRefs("PF21419"),
      {
        label: "InterPro Pfam PF21419 (RoxA-like, cytochrome c-like).",
        url: "https://www.ebi.ac.uk/interpro/entry/pfam/PF21419/",
      },
      {
        label:
          "Seidel J et al. Structure of processive rubber oxygenase RoxA. PNAS. doi:10.1073/pnas.1305560110",
        url: "https://doi.org/10.1073/pnas.1305560110",
      },
      {
        label: "RCSB PDB 4B2N — Latex oxygenase RoxA.",
        url: "https://www.rcsb.org/structure/4B2N",
      },
      {
        label: "wwPDB 4B2N structure record.",
        url: "https://doi.org/10.2210/pdb4B2N/pdb",
      },
      {
        label: "PMC3752256 — RoxA structure and cleavage mechanism (2013).",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3752256/",
      },
      {
        label: "PMC5494620 — RoxA/RoxB secretion, heme motifs, and regulation.",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5494620/",
      },
      {
        label: "PMC6311187 — rubber oxygenase pathways and oligoisoprenoid products.",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6311187/",
      },
      {
        label:
          "Braaz R et al. Heme-dependent rubber oxygenase RoxA dioxygenase mechanism. AEM. doi:10.1128/AEM.71.5.2473-2478.2005",
        url: "https://doi.org/10.1128/AEM.71.5.2473-2478.2005",
      },
      {
        label: "PMC1087590 — proposed dioxygenase mechanism for natural rubber cleavage (2005).",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC1087590/",
      },
      {
        label:
          "Birke J et al. RoxB rubber oxygenase. Appl Environ Microbiol. doi:10.1128/AEM.00721-17",
        url: "https://doi.org/10.1128/AEM.00721-17",
      },
      {
        label:
          "Jendrossek D, Birke J. Rubber oxygenases. Appl Microbiol Biotechnol. doi:10.1007/s00253-018-9453-z",
        url: "https://doi.org/10.1007/s00253-018-9453-z",
      },
      {
        label: "ScienceDirect Topics — cytochrome overview.",
        url: "https://www.sciencedirect.com/topics/biochemistry-genetics-and-molecular-biology/cytochrome",
      },
    ],
    legendSegments: [{ label: "RoxA-like cytochrome c", cathId: "3.40.710.10" }],
    pdbIds: ["4B2N"],
    figures: [
      {
        caption:
          "Figure 1. RoxA from Xanthomonas sp. (panel A) with heme 1 and heme 2; panel B shows the ODTD cleavage product. Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC3752256/",
        imageSrc: "/cath/PF21419_roxA_structure_product.png",
        alt: "RoxA structure and ODTD product",
      },
      {
        caption:
          "Figure 2. Proposed RoxA cleavage mechanism (2013, Seidel et al.). Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC3752256/",
        imageSrc: "/cath/PF21419_mechanism_2013.png",
        alt: "RoxA mechanism diagram 2013",
      },
      {
        caption:
          "Figure 3. Proposed dioxygenase mechanism for natural rubber cleavage by RoxA (2005; slightly outdated). Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC1087590/",
        imageSrc: "/cath/PF21419_mechanism_2005.png",
        alt: "RoxA mechanism diagram 2005",
      },
      {
        caption:
          "Figure 4. Crystal structure of latex oxygenase RoxA (PDB 4B2N, Xanthomonas sp. 35Y) showing two covalently bound hemes. Source: https://www.rcsb.org/structure/4B2N; https://doi.org/10.2210/pdb4B2N/pdb",
        imageSrc: "/cath/PF21419_PDB_4B2N.png",
        alt: "PDB 4B2N RoxA crystal structure",
      },
    ],
  },
]
