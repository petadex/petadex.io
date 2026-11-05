/**
 * Atlas / family queries: production uses `family_atlas` (materialized view);
 * some databases only have `family_umap_coordinates` + `enzyme_taxonomy`.
 * The full UMAP point set is not served by the API (it exceeds Lambda's 6 MB
 * response cap) — it is exported to S3 by scripts/export-atlas.js.
 */

export const FAMILY_METADATA_FROM_FAMILY_ATLAS = `
  SELECT family_id, genbank_accession_id, definition, organism, taxonomy,
         journal, collection_date, country, family_size, umap_x, umap_y
  FROM family_atlas
  WHERE family_id = $1
  LIMIT 1`;

export const FAMILY_METADATA_FROM_BASE_TABLES = `
  SELECT f.family_id, b.genbank_accession_id, b.definition, b.organism, b.taxonomy,
         b.journal, b.collection_date, b.country, f.family_size, f.umap_x, f.umap_y
  FROM family_umap_coordinates f
  LEFT JOIN LATERAL (
    SELECT ef.genbank_accession_id
    FROM enzyme_taxonomy et
    JOIN enzyme_fastaa ef ON ef.enzyme_id = et.enzyme_id
    WHERE et.family = f.family_id
    ORDER BY et.enzyme_id
    LIMIT 1
  ) gid ON true
  LEFT JOIN blast_nr_metadata b ON b.genbank_accession_id = gid.genbank_accession_id
  WHERE f.family_id = $1
  LIMIT 1`;

/** Distinct components for CATH domains page + atlas deep links. */
export const ATLAS_COMPONENTS_FROM_FAMILY_ATLAS = `
  SELECT DISTINCT ON (fa.component)
     fa.component,
     fa.cath_domain,
     fa.domain_name,
     COUNT(*) OVER (PARTITION BY fa.component)::int AS family_count
   FROM family_atlas fa
   WHERE fa.component IS NOT NULL
   ORDER BY fa.component, fa.family_size DESC NULLS LAST`;

/**
 * Same shape as `ATLAS_COMPONENTS_FROM_FAMILY_ATLAS` when the materialized view is absent.
 */
export const ATLAS_COMPONENTS_FROM_BASE_TABLES = `
  WITH counts AS (
    SELECT component, COUNT(DISTINCT family)::int AS family_count
    FROM enzyme_taxonomy
    WHERE component IS NOT NULL
    GROUP BY component
  ),
  rep AS (
    SELECT DISTINCT ON (et.component)
      et.component,
      et.cath_domain,
      et.domain_name
    FROM enzyme_taxonomy et
    INNER JOIN family_umap_coordinates fuc ON fuc.family_id = et.family
    WHERE et.component IS NOT NULL
    ORDER BY et.component, fuc.family_size DESC NULLS LAST
  )
  SELECT r.component, r.cath_domain, r.domain_name, c.family_count
  FROM rep r
  INNER JOIN counts c ON c.component = r.component
  ORDER BY r.component`;
