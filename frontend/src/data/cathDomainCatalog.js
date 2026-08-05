/**
 * Pfam profile index backing `/cath-domains` (literature review signup sheet order).
 * **23 profiles** (3HBOH … RoxA-like_Cyt-c).
 *
 * This is a *lookup table*, not a content source. Per-Pfam profile pages were removed — the only
 * consumer is the CATH-domain view, which groups these entries by `cathId` to build each CATH
 * domain's "HMMs used" table and its aggregate family count. Curated narrative lives in
 * `catDomainCatalog.js`, keyed by CATH id.
 *
 * Pfam→atlas counts: edit `pfamAtlasMap.js` or set `atlasComponent` on an entry when validated.
 *
 * @typedef {Object} CathDomainCatalogEntry
 * @property {string} id  Stable id, e.g. pf-PF01425
 * @property {string} pfamAccession  Uppercase PFxxxxx
 * @property {string} profileHmm  Short Pfam family name (signup sheet)
 * @property {number|null} [atlasComponent]  PETadex atlas component when known
 * @property {string} cathId  CATH node this profile is grouped under
 * @property {string} displayName  Human-readable title
 */

/** @type {CathDomainCatalogEntry[]} */
export const CATH_DOMAIN_CATALOG = [
  {
    id: "pf-PF10605",
    pfamAccession: "PF10605",
    profileHmm: "3HBOH",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "3-hydroxyisobutyryl-CoA hydrolase-related",
  },
  {
    id: "pf-PF00561",
    pfamAccession: "PF00561",
    profileHmm: "Abhydrolase_1",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Abhydrolase domain (α/β hydrolase fold)",
  },
  {
    id: "pf-PF12695",
    pfamAccession: "PF12695",
    profileHmm: "Abhydrolase_5",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Alpha/beta hydrolase domain 5 (ABHD5)",
  },
  {
    id: "pf-PF01425",
    pfamAccession: "PF01425",
    profileHmm: "Amidase",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Amidase-signature domain",
  },
  {
    id: "pf-PF24708",
    pfamAccession: "PF24708",
    profileHmm: "AMS3",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "AMS3 domain",
  },
  {
    id: "pf-PF20434",
    pfamAccession: "PF20434",
    profileHmm: "BD-FAE",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Beaver Dropping Feruloyl and Acetyl Xylan Esterase (BD-FAE)",
  },
  {
    id: "pf-PF00144",
    pfamAccession: "PF00144",
    profileHmm: "Beta-lactamase",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Serine beta-lactamase domain",
  },
  {
    id: "pf-PF07224",
    pfamAccession: "PF07224",
    profileHmm: "Chlorophyllase",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Chlorophyllase domain",
  },
  {
    id: "pf-PF07732",
    pfamAccession: "PF07732",
    profileHmm: "Cu-oxidase_3",
    atlasComponent: null,
    cathId: "3.90.1300.10",
    displayName: "Multicopper oxidase / laccase-like domain",
  },
  {
    id: "pf-PF01083",
    pfamAccession: "PF01083",
    profileHmm: "Cutinase",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Cutinase / cutin hydrolase",
  },
  {
    id: "pf-PF01738",
    pfamAccession: "PF01738",
    profileHmm: "DLH",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Dienelactone hydrolase family",
  },
  {
    id: "pf-PF10503",
    pfamAccession: "PF10503",
    profileHmm: "Esterase_PHB",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Polyhydroxybutyrate depolymerase / PHB esterase",
  },
  {
    id: "pf-PF12146",
    pfamAccession: "PF12146",
    profileHmm: "Hydrolase_4",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Hydrolase-like domain 4",
  },
  {
    id: "pf-PF01674",
    pfamAccession: "PF01674",
    profileHmm: "Lipase_2",
    atlasComponent: 1,
    cathId: "3.40.50.1820",
    displayName: "Lipase class 2 / α/β hydrolase lipase",
  },
  {
    id: "pf-PF13472",
    pfamAccession: "PF13472",
    profileHmm: "Lipase_GDSL_2",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "GDSL lipase / esterase",
  },
  {
    id: "pf-PF09995",
    pfamAccession: "PF09995",
    profileHmm: "MPAB_Lcp_cat",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Lcp / MpaB' latex-cleaving catalytic module",
  },
  {
    id: "pf-PF03403",
    pfamAccession: "PF03403",
    profileHmm: "PAF-AH_p_II",
    atlasComponent: 1,
    cathId: "3.40.50.1820",
    displayName: "Platelet-activating factor acetylhydrolase IB / phospholipase A2-like",
  },
  {
    id: "pf-PF00082",
    pfamAccession: "PF00082",
    profileHmm: "Peptidase_S8",
    atlasComponent: 11,
    cathId: "2.40.10.10",
    displayName: "Peptidase_S8 Pfam",
  },
  {
    id: "pf-PF03576",
    pfamAccession: "PF03576",
    profileHmm: "Peptidase_S58",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "S58 serine peptidase / nucleophilic hydrolase",
  },
  {
    id: "pf-PF06850",
    pfamAccession: "PF06850",
    profileHmm: "PHB_depo_C",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "PHA depolymerase C-terminal domain",
  },
  {
    id: "pf-PF01522",
    pfamAccession: "PF01522",
    profileHmm: "Polysacc_deac_1",
    atlasComponent: null,
    cathId: "3.40.50.1820",
    displayName: "Polysaccharide deacetylase",
  },
  {
    id: "pf-PF02983",
    pfamAccession: "PF02983",
    profileHmm: "Pro_Al_protease",
    atlasComponent: null,
    cathId: "2.40.10.10",
    displayName: "Prolyl aminopeptidase / protease module",
  },
  {
    id: "pf-PF21419",
    pfamAccession: "PF21419",
    profileHmm: "RoxA-like_Cyt-c",
    atlasComponent: null,
    cathId: "3.40.710.10",
    displayName: "RoxA-like cytochrome c / rubber oxygenase domain",
  },
]
