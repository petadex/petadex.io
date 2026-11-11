// frontend/src/utils/identifierDetect.js
//
// Works out what a pasted or typed identifier is, from its shape alone, before anything is fetched. Used by the
// /explore lookup to say "this looks like a Logan protein ID" while the visitor is still typing, and to decide what to
// ask the API for. Pure: no DOM, no network.
//
// What PETadex v260701 identifiers look like (wiki: Clustering; vault: Sequence Release v260701 / 01 Header Schema):
//   PETadex ID      PL1, NR223, LG852233853      source prefix + a number; each source numbers from 1
//   core header     PL1|C001|9.3e-40|48|261|C001  petadex_id|hmm|hmm_evalue|hmm_start|hmm_end|component
//   cluster         /cluster/90/PL228, PDX90_PL228_C001   a cluster is named after its centroid protein
//   external        WP_054022242.1 (RefSeq), AAA33334.1 (GenBank), P07062 (UniProt), 1JFR_A (PDB chain)
//   SRA             ERR14790956 (run), SAMEA117960103 (BioSample), ERR14790956_1282094 (Logan contig)

export const SOURCES = {
  PL: { name: "Plasticome", long: "characterized plastic-degrading enzymes, curated from PAZy and the literature" },
  NR: { name: "NCBI nr", long: "relatives in NCBI's non-redundant protein database" },
  LG: { name: "Logan", long: "ORFs assembled from public sequencing runs (SRA) by the Logan project" },
}

const AA_RE = /^[ACDEFGHIKLMNPQRSTVWYXBZUO*-]+$/i
const RUN_RE = /^(SRR|ERR|DRR)\d{1,12}$/i
const BIOSAMPLE_RE = /^(SAMN|SAMEA|SAMD|ERS|SRS)\d{1,12}$/i
const BIOPROJECT_RE = /^PRJ(NA|EB|DB)\d{1,12}$/i
const CORE_HEADER_RE = /^(PL|NR|LG)([1-9]\d{0,11})\|([^|]+)\|([^|]+)\|(\d+)\|(\d+)\|([^|\s]+)$/i
// Separators people type by hand ("PL 1", "lg-852233853") and leading zeros; not "_", which RefSeq uses (NR_123 is an
// RNA accession, not PETadex NR123).
const PETADEX_LOOSE_RE = /^(PL|NR|LG)[\s-]*0*([1-9]\d{0,11})$/i
const PDX_RE = /^PDX(90|60|30)_(PL|NR|LG)([1-9]\d{0,11})(?:_C\d{3}(?:-\d+)?)?$/i
const PATH_SEQ_RE = /\/sequence\/(PL|NR|LG)([1-9]\d{0,11})\b/i
const PATH_CLUSTER_RE = /\/cluster\/(90|60|30)\/(PL|NR|LG)([1-9]\d{0,11})\b/i
const LOGAN_CONTIG_RE = /^((?:SRR|ERR|DRR)\d{1,12})_(\d+)(?:_ka:f:([\d.]+)_*)?$/i

const EXTERNAL = [
  [/^[A-Z]{2}_\d{5,12}(\.\d+)?$/i, "RefSeq accession"],
  [/^[A-Z]{3}\d{5,7}(\.\d+)?$/i, "GenBank protein accession"],
  [/^([OPQ]\d[A-Z\d]{3}\d|[A-NR-Z]\d([A-Z][A-Z\d]{2}\d){1,2})(\.\d+)?$/i, "UniProt accession"],
  [/^\d[A-Z\d]{3}_[A-Z\d]{1,4}$/i, "PDB chain"],
]

const idOf = (prefix, n) => `${prefix.toUpperCase()}${Number(n)}`

/**
 * Classify one query.
 * @returns {{
 *   kind: "empty"|"petadex"|"cluster"|"digits"|"prefix"|"run"|"biosample"|"bioproject"|"contig"|"external"|"aa"|"unknown",
 *   label: string,          what it looks like, in words
 *   id?: string,            normalised PETadex ID (petadex, cluster centroid)
 *   level?: number,         cluster level
 *   candidates?: string[],  PL/NR/LG readings of a bare number
 *   accession?: string,     normalised external / SRA accession
 *   header?: object,        parsed core header parts, when a core header was pasted
 *   contig?: object,        { run, contig, ka } for a Logan contig name
 *   sequence?: string,      cleaned amino-acid sequence
 *   note?: string,          extra explanation for the visitor
 *   lookup: boolean         whether it is worth asking the API
 * }}
 */
export function detectIdentifier(raw) {
  let s = String(raw ?? "").trim()
  if (!s) return { kind: "empty", label: "", lookup: false }

  // Site URLs and paths.
  let m = PATH_CLUSTER_RE.exec(s)
  if (m) return cluster(Number(m[1]), idOf(m[2], m[3]), "PETadex cluster link")
  m = PATH_SEQ_RE.exec(s)
  if (m) return petadex(idOf(m[1], m[2]), "PETadex protein link")

  // A FASTA header line: drop ">" and keep the first token, which is the sequence ID in every tool.
  const multiLine = /[\r\n]/.test(s)
  if (s.startsWith(">")) {
    const first = s.slice(1).split(/[\r\n]/)[0].trim().split(/\s+/)[0]
    // ">PL1|C001|…" or ">LG1 …" headers name the protein; a free-text header with a sequence below is a sequence.
    if (/^(PL|NR|LG)\d/i.test(first) && (!multiLine || !first.includes(" "))) s = first
    else {
      const body = s.split(/\r?\n/).slice(1).join("").replace(/\s+/g, "")
      if (body && AA_RE.test(body)) return aa(body)
      s = first
    }
  }

  // Protein sequence (possibly wrapped over several lines).
  const compact = s.replace(/\s+/g, "")
  if (multiLine && AA_RE.test(compact)) return aa(compact)

  m = CORE_HEADER_RE.exec(s)
  if (m) {
    const id = idOf(m[1], m[2])
    return {
      ...petadex(id, "PETadex catalytic-core header"),
      header: { prefix: m[1].toUpperCase(), number: String(Number(m[2])), hmm: m[3], evalue: m[4], start: Number(m[5]), end: Number(m[6]), component: m[7] },
      note: "The first field is the protein's PETadex ID; the rest describe its catalytic core.",
    }
  }
  if (s.includes("|")) {
    const first = s.split("|")[0].trim()
    const pm = PETADEX_LOOSE_RE.exec(first)
    if (pm) return { ...petadex(idOf(pm[1], pm[2]), "PETadex FASTA header"), note: "Using the first field, the PETadex ID." }
  }

  m = PDX_RE.exec(s)
  if (m) return cluster(Number(m[1]), idOf(m[2], m[3]), `${m[1]} % cluster name`)

  m = PETADEX_LOOSE_RE.exec(s)
  if (m) {
    const id = idOf(m[1], m[2])
    const typed = s.toUpperCase().replace(/[\s-]/g, "")
    return { ...petadex(id, `${SOURCES[id.slice(0, 2)].name} protein ID`), note: typed !== id ? `Read as ${id}.` : undefined }
  }

  m = /^(PL|NR|LG)[\s-]*$/i.exec(s)
  if (m) {
    const p = m[1].toUpperCase()
    return { kind: "prefix", label: `${SOURCES[p].name} protein ID`, note: `Add the protein's number, e.g. ${p}1.`, lookup: false }
  }

  if (/^\d{1,12}$/.test(s) && Number(s) > 0) {
    const n = String(Number(s))
    return {
      kind: "digits",
      label: "A number without a source prefix",
      candidates: ["PL", "NR", "LG"].map(p => `${p}${n}`),
      note: `Each source numbers its proteins from 1, so PL${n}, NR${n} and LG${n} are different proteins.`,
      lookup: true,
    }
  }

  m = LOGAN_CONTIG_RE.exec(s)
  if (m) {
    return {
      kind: "contig",
      label: "Logan contig name",
      accession: m[1].toUpperCase(),
      contig: { run: m[1].toUpperCase(), contig: m[2], ka: m[3] != null ? Number(m[3]) : null },
      note: `Contig ${m[2]} of run ${m[1].toUpperCase()}. Contigs can't be looked up on their own, so this shows the run.`,
      lookup: true,
    }
  }
  if (RUN_RE.test(s)) return { kind: "run", label: "SRA run accession", accession: s.toUpperCase(), lookup: true }
  if (BIOSAMPLE_RE.test(s)) return { kind: "biosample", label: "BioSample accession", accession: s.toUpperCase(), lookup: true }
  if (BIOPROJECT_RE.test(s)) {
    return { kind: "bioproject", label: "BioProject accession", accession: s.toUpperCase(), note: "BioProjects can't be looked up here yet; try one of its runs or BioSamples.", lookup: false }
  }

  for (const [re, label] of EXTERNAL) if (re.test(s)) return { kind: "external", label, accession: s, lookup: true }

  // A single unbroken run of residues, long enough not to be a short code.
  if (compact.length >= 20 && AA_RE.test(compact) && !/\d/.test(compact)) return aa(compact)

  return { kind: "unknown", label: "Unrecognised format", accession: s, note: "We'll try it as an accession.", lookup: s.length <= 64 }
}

function petadex(id, label) {
  return { kind: "petadex", label, id, lookup: true }
}

function cluster(level, id, label) {
  return { kind: "cluster", label, id, level, lookup: true }
}

function aa(seq) {
  const clean = seq.replace(/[*-]/g, "").toUpperCase()
  return {
    kind: "aa",
    label: `Protein sequence, ${clean.length.toLocaleString("en-US")} residues`,
    sequence: clean,
    note: clean.length < 10 ? "Too short to search; sequence search needs at least 10 residues." : "Sequences are found by similarity search, not by lookup.",
    lookup: false,
  }
}
