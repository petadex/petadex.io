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
 * Rollup stats for a CATH domain's overview card, via enzyme_taxonomy -> enzyme_fastaa.
 * - uniquePdbs: distinct `pdb_accessions` rows (ColabFold predictions).
 * - namedSpecies: distinct `blast_nr_metadata.organism` values at genuine species level,
 *   excluding "Candidatus ...", "<taxon> sp.", "<taxon> bacterium/archaeon", and
 *   uncultured/metagenome/environmental entries. Rollup across every enzyme, not per family.
 */
export const DOMAIN_ROLLUP_STATS = `
  WITH enz AS (
    SELECT et.enzyme_id, ef.genbank_accession_id
    FROM enzyme_taxonomy et
    JOIN enzyme_fastaa ef ON ef.enzyme_id = et.enzyme_id
    WHERE et.cath_domain = $1
  )
  SELECT
    (SELECT COUNT(DISTINCT pa.pdb_id)
       FROM pdb_accessions pa
       JOIN enz ON enz.genbank_accession_id = pa.accession) AS unique_pdbs,
    (SELECT COUNT(DISTINCT bnm.organism)
       FROM blast_nr_metadata bnm
       JOIN enz ON enz.genbank_accession_id = bnm.genbank_accession_id
       WHERE bnm.organism IS NOT NULL
         AND bnm.organism !~* 'uncultured|metagenome|environmental sample'
         AND bnm.organism !~* 'bacterium$|archaeon$'
         AND bnm.organism !~* '^candidatus\\s'
         AND bnm.organism !~* '\\ssp\\.?$') AS named_species`;

/**
 * In-house BHET halo-assay activity per gene under this `cath_domain`, normalized against each
 * plate's own EV (empty vector) baseline: mean of (plate mean − EV mean) per gene, averaged
 * across every plate tested.
 */
export const PLATE_ACTIVITY_FOR_CATH_DOMAIN = `
  WITH domain_genes AS (
    SELECT DISTINCT gm.gene
    FROM enzyme_taxonomy et
    JOIN enzyme_fastaa ef ON ef.enzyme_id = et.enzyme_id
    JOIN gene_metadata gm ON gm.accession = ef.genbank_accession_id
    WHERE et.cath_domain = $1
  ),
  ev_baseline AS (
    SELECT plate, AVG(readout_value) AS ev_mean
    FROM plate_data
    WHERE gene = 'EV'
    GROUP BY plate
  ),
  gene_per_plate AS (
    SELECT pd.gene, pd.plate, AVG(pd.readout_value) AS gene_mean, COUNT(*) AS n_wells
    FROM plate_data pd
    JOIN domain_genes dg ON dg.gene = pd.gene
    GROUP BY pd.gene, pd.plate
  )
  SELECT
    gp.gene,
    COUNT(DISTINCT gp.plate)::int AS n_plates,
    SUM(gp.n_wells)::int AS n_wells,
    AVG(gp.gene_mean - ev.ev_mean) AS mean_delta_vs_ev
  FROM gene_per_plate gp
  JOIN ev_baseline ev ON ev.plate = gp.plate
  GROUP BY gp.gene
  ORDER BY mean_delta_vs_ev DESC`;

/**
 * Distinct-cluster counts for a CATH domain's enzymes at 30/60/90% identity (`petadex_clustering`).
 *
 * SLOW: `petadex_clustering` has 307M rows, ~40s for the largest domain. Never call synchronously
 * from a request handler; use `lib/sequenceDiversityCache.js`.
 */
export const SEQUENCE_DIVERSITY_FOR_CATH_DOMAIN = `
  SELECT
    COUNT(DISTINCT pc."30pid_superfamily_id")::int AS clusters_30,
    COUNT(DISTINCT pc."60pid_family_id")::int AS clusters_60,
    COUNT(DISTINCT pc."90pid_enzyme_id")::int AS clusters_90,
    COUNT(*)::int AS total_orfs
  FROM enzyme_taxonomy et
  JOIN petadex_clustering pc ON pc.orf_id = et.enzyme_id
  WHERE et.cath_domain = $1`;

/**
 * Documented GenBank functions for a `cath_domain`'s enzymes. Pulls `blast_nr_metadata.definition`,
 * strips assembly noise (prefixes, organism brackets, "partial"), excludes generic non-answers
 * ("hypothetical protein" etc), returns the top 8. The fold's own generic name is not excluded
 * and can dominate for large folds.
 *
 * SLOW: ~25s for the largest domain. Never call inline; use `lib/knownFunctionsCache.js`.
 */
export const KNOWN_FUNCTIONS_FOR_CATH_DOMAIN = `
  SELECT func, COUNT(*)::int AS n
  FROM (
    SELECT
      lower(trim(
        regexp_replace(
          regexp_replace(
            regexp_replace(bnm.definition, '\\s*\\[[^\\]]*\\]\\s*$', ''),
            '^(mag(\\s+tpa_asm)?|tpa_asm|multispecies)\\s*:\\s*', '', 'i'
          ),
          ',?\\s*partial\\s*$', '', 'i'
        )
      )) AS func
    FROM enzyme_taxonomy et
    JOIN enzyme_fastaa ef ON ef.enzyme_id = et.enzyme_id
    JOIN blast_nr_metadata bnm ON bnm.genbank_accession_id = ef.genbank_accession_id
    WHERE et.cath_domain = $1 AND bnm.definition IS NOT NULL AND bnm.definition <> ''
  ) normalized
  WHERE func <> ''
    AND func !~ '^(hypothetical protein|uncharacterized protein|unnamed protein product|predicted protein)$'
  GROUP BY func
  ORDER BY COUNT(*) DESC
  LIMIT 8`;

/** Every `cath_domain` currently assigned to at least one enzyme - used to pre-warm the cache. */
export const ALL_CATH_DOMAINS = `
  SELECT DISTINCT cath_domain
  FROM enzyme_taxonomy
  WHERE cath_domain IS NOT NULL AND cath_domain <> 'NA'`;
