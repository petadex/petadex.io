/**
 * Atlas / family UMAP payloads: production uses `family_atlas` (materialized view);
 * some databases only have `family_umap_coordinates` + `enzyme_taxonomy`.
 */

export const UMAP_POINTS_FROM_FAMILY_ATLAS = `
  SELECT family_id, umap_x, umap_y, family_size,
         organism, taxonomy, country, component,
         cath_domain, domain_name
  FROM family_atlas`;

/**
 * ~65k rows; DISTINCT ON + hash join — typically a few seconds on RDS.
 */
export const UMAP_POINTS_FROM_BASE_TABLES = `
  WITH fam_tax AS (
    SELECT DISTINCT ON (family) family AS family_id, component, cath_domain, domain_name
    FROM enzyme_taxonomy
    ORDER BY family, enzyme_id
  )
  SELECT f.family_id, f.umap_x, f.umap_y, f.family_size,
         NULL::text AS organism,
         (COALESCE(t.domain_name::text, 'Unknown') || '; Unknown') AS taxonomy,
         NULL::text AS country,
         t.component,
         t.cath_domain,
         t.domain_name
  FROM family_umap_coordinates f
  LEFT JOIN fam_tax t ON t.family_id = f.family_id`;

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

/**
 * Superfamily atlas (v260701 Run 2, 30 % identity centroids): one row per superfamily with
 * every layout's coordinates. Source: `superfamily_atlas` (materialized view over
 * `superfamily_atlas_metadata` + `superfamily_atlas_coordinates`). Served to the site as a
 * static S3 export (see scripts/export-superfamily-atlas.js), like `family_atlas`.
 * `domain_name` falls back to the pipeline fold label where the fold has no CATH code (C024).
 */
export const SUPERFAMILY_ATLAS_POINTS = `
  SELECT superfamily_id,
         round(umap_x::numeric, 4)::float8 AS umap_x, round(umap_y::numeric, 4)::float8 AS umap_y,
         round(tsne_x::numeric, 4)::float8 AS tsne_x, round(tsne_y::numeric, 4)::float8 AS tsne_y,
         source, cath_fold, cath_domain, COALESCE(domain_name, cath_fold) AS domain_name, component,
         core_length, n_sequences::int AS n_sequences, n_families, n_enzyme_clusters, organism, taxonomy
  FROM superfamily_atlas
  ORDER BY superfamily_id`;

/** Layout provenance shown under the map (model, method, parameters). */
export const SUPERFAMILY_ATLAS_LAYOUTS = `
  SELECT layout, label, embedding, parameters,
         to_char(date_computed, 'YYYY-MM-DD') AS date_computed,
         to_char(date_clustered, 'YYYY-MM-DD') AS date_clustered
  FROM superfamily_atlas_layouts
  ORDER BY CASE layout WHEN 'umap' THEN 0 ELSE 1 END, layout`;
