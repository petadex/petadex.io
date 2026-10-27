import { describe, expect, it } from "vitest"
import type {
  HitOrigin,
  LoganMetadata,
  SearchHit,
  SearchResultMetadata,
} from "@/lib/api/types"
import {
  characterizedRelatives,
  clusterLabel,
  enrichmentStatus,
  environmentRows,
  fieldEvidence,
  filterRelatives,
  formatXExpected,
  hasEnrichment,
  hitsInProfile,
  listValue,
  onePerCluster,
  relativeHits,
  sortRelatives,
  toFasta,
} from "./searchMetadata"

const C60 = "PL228|C001|3.4e-40|48|261|C001"

function hit(
  rank: number,
  origin: HitOrigin | null,
  overrides: Partial<SearchHit> = {},
  metadata: Partial<LoganMetadata> | null = {}
): SearchHit {
  const prefix = { plasticome: "PL", ncbi_nr: "NR", logan: "LG" }
  const id = origin ? `${prefix[origin]}${rank}` : `${rank}|WP_1.1|||||`
  return {
    rank,
    accession: id,
    target_id: id,
    id_format: origin ? "petadex_id" : "v1.1",
    origin,
    name: null,
    organism: null,
    taxonomy: null,
    percent_identity: 100 - rank,
    identity: 100 - rank,
    evalue: 1e-50,
    bitscore: 500 - rank,
    query_coverage: 90,
    alignment_length: 200,
    query_start: 1,
    query_end: 200,
    target_start: 1,
    target_end: 200,
    target_sequence: "M".repeat(70),
    metadata:
      metadata === null
        ? null
        : {
            id,
            component: "C001",
            c90: null,
            c60: C60,
            c30: null,
            n_cores: 1,
            ...metadata,
          },
    ...overrides,
  }
}

describe("enrichmentStatus", () => {
  it("reads null (a pre-1.5.0 result) as unavailable", () => {
    expect(enrichmentStatus({ enrichment_status: null })).toBe("unavailable")
  })

  it("shows metadata for ok and partial only", () => {
    expect(hasEnrichment("ok")).toBe(true)
    expect(hasEnrichment("partial")).toBe(true)
    expect(hasEnrichment("failed")).toBe(false)
    expect(hasEnrichment("unavailable")).toBe(false)
  })
})

describe("clusterLabel", () => {
  it("displays the part of a domain_id before the first pipe", () => {
    expect(clusterLabel(C60)).toBe("PL228")
  })

  it("returns null for a missing cluster", () => {
    expect(clusterLabel(null)).toBeNull()
    expect(clusterLabel("")).toBeNull()
  })
})

describe("fieldEvidence", () => {
  it("follows the per-origin contract", () => {
    expect(fieldEvidence("logan", "tenv")).toBe("inferred")
    expect(fieldEvidence("logan", "n_biosamples")).toBe("measured")
    expect(fieldEvidence("ncbi_nr", "n_biosamples")).toBe("measured")
    expect(fieldEvidence("ncbi_nr", "organism")).toBe("stated")
    expect(fieldEvidence("ncbi_nr", "oxygen")).toBe("organism_physiology")
    expect(fieldEvidence("plasticome", "t_opt_c")).toBe("organism_physiology")
    expect(fieldEvidence("logan", "prof_hist")).toBe("profile")
  })

  it("has no evidence for unknown fields or v1.1 hits", () => {
    expect(fieldEvidence("logan", "organism")).toBeNull()
    expect(fieldEvidence(null, "organism")).toBeNull()
  })
})

describe("relatives", () => {
  const hits = [
    hit(1, "plasticome"),
    hit(2, "logan", {}, { n_biosamples: 5, n_bioprojects: 2, c90: "A|x" }),
    hit(3, "ncbi_nr", { query_coverage: 40 }, { n_biosamples: 9 }),
    hit(4, "logan", {}, { n_biosamples: 50, n_bioprojects: 1, c90: "A|x" }),
    hit(5, "logan", {}, null),
    hit(6, null),
  ]

  it("excludes characterized (Plasticome) and v1.1 hits", () => {
    expect(relativeHits(hits).map(h => h.rank)).toEqual([2, 3, 4, 5])
  })

  it("filters by identity, coverage and origin", () => {
    const rel = relativeHits(hits)
    expect(
      filterRelatives(rel, {
        minIdentity: 0,
        minCoverage: 50,
        origins: ["ncbi_nr", "logan"],
      }).map(h => h.rank)
    ).toEqual([2, 4, 5])
    expect(
      filterRelatives(rel, {
        minIdentity: 96,
        minCoverage: 0,
        origins: ["logan"],
      }).map(h => h.rank)
    ).toEqual([2, 4])
  })

  it("defaults to search rank and never invents a ranking", () => {
    expect(sortRelatives(relativeHits(hits), "rank").map(h => h.rank)).toEqual([
      2, 3, 4, 5,
    ])
  })

  it("sorts samples descending with missing values last", () => {
    expect(
      sortRelatives(relativeHits(hits), "samples").map(h => h.rank)
    ).toEqual([4, 3, 2, 5])
  })

  it("keeps ties in search rank order", () => {
    const tied = [hit(9, "logan"), hit(8, "logan")].map(h => ({
      ...h,
      percent_identity: 80,
    }))
    expect(sortRelatives(tied, "identity").map(h => h.rank)).toEqual([8, 9])
  })

  it("keeps the best-ranked hit per 90% cluster and every unclustered hit", () => {
    expect(onePerCluster(relativeHits(hits)).map(h => h.rank)).toEqual([
      2, 3, 5,
    ])
  })
})

describe("toFasta", () => {
  it("wraps at 60 residues and skips hits without a full sequence", () => {
    const fasta = toFasta([
      hit(1, "logan"),
      hit(2, "logan", { target_sequence: null }),
    ])
    expect(fasta).toBe(
      `>LG1 rank=1 pident=99\n${"M".repeat(60)}\n${"M".repeat(10)}`
    )
  })
})

describe("environments", () => {
  it("orders chart rows by this search's share, largest first", () => {
    const rows = environmentRows([
      {
        profile: "soil",
        sequences: 1,
        share: 0.1,
        background_share: 0.2,
        x_expected: 0.5,
      },
      {
        profile: "compost",
        sequences: 3,
        share: 0.3,
        background_share: 0.1,
        x_expected: 3,
      },
    ])
    expect(rows.map(r => r.profile)).toEqual(["compost", "soil"])
  })

  it("counts each Logan sequence once, weighted across its profiles", () => {
    const hits = [
      hit(2, "logan", {}, { prof_hist: { soil: 3, compost: 1 } }),
      hit(1, "logan", {}, { prof_hist: { soil: 1 } }),
      hit(3, "ncbi_nr", {}, { prof_dominant: "soil" }),
      hit(4, "logan", {}, { prof_hist: { compost: 2 } }),
    ]
    expect(hitsInProfile(hits, "soil").map(m => [m.hit.rank, m.share])).toEqual(
      [
        [1, 1],
        [2, 0.75],
      ]
    )
  })

  it("formats the ratio without a judgement", () => {
    expect(formatXExpected(3.14)).toBe("3.1× expected")
    expect(formatXExpected(16.2)).toBe("16× expected")
  })
})

describe("characterizedRelatives", () => {
  const query = hit(5, "logan")
  const plHit = hit(1, "plasticome", {}, { c60: C60 })
  const otherPl = hit(2, "plasticome", {}, { c60: "PL9|C2|1|1|1|C2" })

  it("uses the store's pl_members and links any that were hits", () => {
    const clusters: SearchResultMetadata["clusters"] = {
      c60: { [C60]: { pl_members: [{ id: "PL1" }, { id: "PL77" }] } },
    }
    const rel = characterizedRelatives(query, [plHit, query], clusters)
    expect(rel.map(r => [r.id, r.hit?.rank ?? null])).toEqual([
      ["PL1", 1],
      ["PL77", null],
    ])
  })

  it("falls back to Plasticome hits sharing the 60% cluster", () => {
    const rel = characterizedRelatives(query, [plHit, otherPl, query], null)
    expect(rel.map(r => r.id)).toEqual(["PL1"])
  })

  it("is empty for a hit with no 60% cluster", () => {
    expect(
      characterizedRelatives(hit(6, "logan", {}, { c60: null }), [plHit], null)
    ).toEqual([])
  })
})

describe("listValue", () => {
  it("accepts arrays and delimited strings", () => {
    expect(listValue(["PET", "", "BHET"])).toEqual(["PET", "BHET"])
    expect(listValue("PET; BHET")).toEqual(["PET", "BHET"])
    expect(listValue(null)).toEqual([])
  })
})
