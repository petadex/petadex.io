# PETadex API - Database Dependencies

**Auto-generated**: 2026-11-05
**Purpose**: Maps API endpoints to database tables/columns to identify breaking changes

---

## Quick Reference

| Endpoint | Method | Tables |
|----------|--------|--------|
| `/api/fastaa` | GET | gene_metadata, fastaa, with_sra_and_biosample_loc_metadata |
| `/api/fastaa/:accession` | GET | gene_metadata, with_sra_and_biosample_loc_metadata, fastaa |
| `/api/aa-seq-features/:accession` | GET | aa_seq_features |
| `/api/gene-metadata/by-accession/:accession` | GET | gene_metadata |
| `/api/plate-data/comparison` | GET | accession_activity_view, gene_metadata |
| `/api/plate-data/gene/:gene/average` | GET | plate_data, plate_metadata |
| `/api/gene-details/locations` | GET | with_sra_and_biosample_loc_metadata |
| `/api/gene-details/:accession/header` | GET | with_sra_and_biosample_loc_metadata |
| `/api/gene-details/:accession/origin` | GET | with_sra_and_biosample_loc_metadata |
| `/api/gene-details/:accession/research` | GET | with_sra_metadata |
| `/api/pdb/accession/:accession` | GET | pdb_accessions |
| `/api/enzymes` | GET | — |
| `/api/enzymes/:enzyme_id` | GET | enzyme_fastaa, enzyme_taxonomy |
| `/api/enzymes/family/:family_id` | GET | enzyme_fastaa, enzyme_taxonomy |
| `/api/enzymes/families/summary` | GET | — |
| `/api/search` | POST | — |
| `/api/search/export` | POST | — |
| `/api/search/export/:exportSessionId` | GET | — |
| `/api/search/results/:job_id` | GET | — |
| `/api/search/history` | GET | — |
| `/api/atlas/components` | GET | — |
| `/api/family/:familyId` | GET | enzyme_taxonomy, enzyme_fastaa, family_stats |
| `/api/family/:familyId/members` | GET | enzyme_fastaa, enzyme_taxonomy |
| `/api/family/:familyId/metadata` | GET | — |
| `/api/family/:familyId/tree-members` | GET | enzyme_fastaa, enzyme_taxonomy |
| `/api/family/:familyId/tree` | GET | — |
| `/api/sara-viewer` | GET | sara_domains, sara_important_motfis, sara_signal_sequences |
| `/api/sara-viewer/:orfId` | GET | — |
| `/api/petadex-domains/by-accession/:accession` | GET | — |
| `/api/petadex-domains/:orfId` | GET | — |
| `/api/resolve/summary` | GET | corpus_summary |
| `/api/resolve` | GET | — |
| `/api/cluster/:level/:clusterId` | GET | — |
| `/api/orf/:orfId/domains` | GET | petadex_catalytic_domains, pazy_hmms |
| `/api/orf/:orfId` | GET | — |
| `/api/kinetics/published/raw` | GET | plastic_kinetics_published |
| `/api/sequence/:id/samples` | GET | — |
| `/api/search/samples` | POST | — |
| `/api/search/align` | POST | — |
| `/api/sequences/:orfId/provenance` | GET | — |
| `/api/annotations/batch` | POST | — |
| `/api/biosamples/:id` | GET | — |
| `/api/biosamples/:id/sequences` | GET | — |
| `/api/clusters/:pid90/profiles` | GET | — |
| `/api/profiles` | GET | — |
| `/api/profiles/:slug` | GET | — |
| `/api/profiles/:slug/biosamples` | GET | — |
| `/` | GET | — |
| `/health` | GET | — |

---

## /api/fastaa

### GET `/api/fastaa`

**Tables**: gene_metadata, fastaa, with_sra_and_biosample_loc_metadata

**Columns**:
- `f`: accession, aa_sequence, source, synonyms, date_entered, genotype, genotype_description, synthetic, parent_accessions, parent_genes
- `fastaa`: in_gene_metadata
- `fix_in_gene_metadata`: py
- `gm`: accession
- `m`: accession

<details>
<summary>SQL Query</summary>

```sql
SELECT
        f.accession,
        f.aa_sequence AS sequence,
        f.source,
        f.synonyms,
        f.date_entered,
        f.genotype,
        f.genotype_description,
        f.synthetic,
        f.parent_accessions,
        f.parent_genes,
        -- Derived, not the stored fastaa.in_gene_metadata column, which nothing
        -- keeps in sync (it drifted to 199 false positives; fixed 2026-09-24 by
        -- petadex-access/scripts/fix_in_gene_metadata.py).
        EXISTS(
          SELECT 1 FROM gene_metadata gm WHERE gm.accession = f.accession
        ) AS in_gene_metadata,
        (m.accession IS NOT NULL) AS in_sra_metadata
      FROM fastaa f
      LEFT JOIN (
        SELECT DISTINCT accession
        FROM with_sra_and_biosample_loc_metadata
      ) m ON m.accession = f.accession
      ORDER BY f.accession ASC
```
</details>

---

### GET `/api/fastaa/:accession`

**Parameters**: `accession`

**Tables**: gene_metadata, with_sra_and_biosample_loc_metadata, fastaa

**Columns**:
- `f`: accession, aa_sequence, source, synonyms, date_entered, genotype, genotype_description, synthetic, parent_accessions, parent_genes
- `gm`: accession
- `m`: accession

<details>
<summary>SQL Query</summary>

```sql
SELECT
        f.accession,
        f.aa_sequence as sequence,
        f.source,
        f.synonyms,
        f.date_entered,
        f.genotype,
        f.genotype_description,
        f.synthetic,
        f.parent_accessions,
        f.parent_genes,
        EXISTS(
          SELECT 1 FROM gene_metadata gm WHERE gm.accession = f.accession
        ) as in_gene_metadata,
        EXISTS(
          SELECT 1
          FROM with_sra_and_biosample_loc_metadata m
          WHERE m.accession = f.accession
        ) as in_sra_metadata
      FROM fastaa f
      WHERE f.accession = $1
```
</details>

---

## /api/aa-seq-features

### GET `/api/aa-seq-features/:accession`

**Parameters**: `accession`

**Tables**: aa_seq_features

**Columns**:
- `aa_seq_features`: *

<details>
<summary>SQL Query</summary>

```sql
SELECT * FROM aa_seq_features WHERE accession = $1
```
</details>

---

## /api/gene-metadata

### GET `/api/gene-metadata/by-accession/:accession`

**Parameters**: `accession`

**Tables**: gene_metadata

<details>
<summary>SQL Query</summary>

```sql
SELECT 
        gene, 
        nickname, 
        accession, 
        orf_nt_sequence, 
        left_homology_arm, 
        right_homology_arm, 
        batch, 
        date_entered, 
        genetic_code 
      FROM gene_metadata 
      WHERE accession = $1
      ORDER BY gene ASC
```
</details>

---

## /api/plate-data

### GET `/api/plate-data/comparison`

**Tables**: accession_activity_view, gene_metadata

**Columns**:
- `aav`: gene, accession, source, media, timepoint_hours, readout_value
- `gm`: nickname, gene

<details>
<summary>SQL Query</summary>

```sql
SELECT
        aav.gene,
        gm.nickname,
        aav.accession,
        aav.source,
        aav.media,
        aav.timepoint_hours,
        AVG(aav.readout_value)      AS average_readout,
        STDDEV_SAMP(aav.readout_value) AS stddev_readout,
        COUNT(*)                    AS sample_count
      FROM accession_activity_view aav
      LEFT JOIN gene_metadata gm ON aav.gene = gm.gene
      WHERE aav.media = ANY($1::text[])
        AND aav.readout_value IS NOT NULL
      GROUP BY
        aav.gene, gm.nickname, aav.accession, aav.source,
        aav.media, aav.timepoint_hours
      ORDER BY aav.gene, aav.media, aav.timepoint_hours
```
</details>

---

### GET `/api/plate-data/gene/:gene/average`

**Parameters**: `gene`

**Tables**: plate_data, plate_metadata

**Columns**:
- `pd`: plate, readout_value, measurement_type, gene
- `pm`: timepoint_hours, temp_celsius, ph, media, organism, exp_id, exp_description, date_created, date_read, plate

<details>
<summary>SQL Query</summary>

```sql
SELECT
        pd.plate,
        AVG(pd.readout_value) as average_readout,
        STDDEV_SAMP(pd.readout_value) as stddev_readout,
        COUNT(*) as sample_count,
        pd.measurement_type,
        pm.timepoint_hours,
        pm.temp_celsius,
        pm.ph,
        pm.media,
        pm.organism,
        pm.exp_id,
        pm.exp_description,
        pm.date_created,
        pm.date_read
      FROM plate_data pd
      LEFT JOIN plate_metadata pm ON pd.plate = pm.plate
      WHERE pd.gene = $1 AND pd.readout_value IS NOT NULL
      GROUP BY pd.plate, pd.measurement_type, pm.timepoint_hours, pm.temp_celsius,
               pm.ph, pm.media, pm.organism, pm.exp_id, pm.exp_description,
               pm.date_created, pm.date_read
      ORDER BY pm.timepoint_hours, pd.plate
```
</details>

---

## /api/gene-details

### GET `/api/gene-details/locations`

**Tables**: with_sra_and_biosample_loc_metadata

**Columns**:
- `w`: accession, geo_loc_name_country_calc, geo_loc_name_sam, geo_loc_name_country_continent_calc, biome, organism, elevation, lat_lon

<details>
<summary>SQL Query</summary>

```sql
SELECT
          w.accession,
          COALESCE(
            NULLIF(NULLIF(w.geo_loc_name_country_calc, ''), 'uncalculated'),
            CASE WHEN w.geo_loc_name_sam ILIKE 'Antarctica%' THEN 'Antarctica' END
          ) AS country,
          COALESCE(
            NULLIF(NULLIF(w.geo_loc_name_country_continent_calc, ''), 'uncalculated'),
            CASE WHEN w.geo_loc_name_sam ILIKE 'Antarctica%' THEN 'Antarctica' END
          ) AS continent,
          w.biome,
          w.organism,
          w.elevation,
          ST_Y(w.lat_lon) AS latitude,
          ST_X(w.lat_lon) AS longitude,
          w.geo_loc_name_sam AS location_name
        FROM with_sra_and_biosample_loc_metadata w
        WHERE w.lat_lon IS NOT NULL
```
</details>

---

### GET `/api/gene-details/:accession/header`

**Parameters**: `accession`

**Tables**: with_sra_and_biosample_loc_metadata

**Columns**:
- `w`: accession, geo_loc_name_country_calc

<details>
<summary>SQL Query</summary>

```sql
SELECT 
        w.accession,
        w.geo_loc_name_country_calc as origin_country
      FROM with_sra_and_biosample_loc_metadata w
      WHERE w.accession = $1
      LIMIT 1
```
</details>

---

### GET `/api/gene-details/:accession/origin`

**Parameters**: `accession`

**Tables**: with_sra_and_biosample_loc_metadata

**Columns**:
- `w`: accession, geo_loc_name_country_calc, geo_loc_name_country_continent_calc, biome, organism, elevation, lat_lon, geo_loc_name_sam

<details>
<summary>SQL Query</summary>

```sql
SELECT
        w.accession,
        w.geo_loc_name_country_calc as country,
        w.geo_loc_name_country_continent_calc as continent,
        w.biome,
        w.organism as source_organism,
        w.elevation,
        CASE
          WHEN w.lat_lon IS NOT NULL THEN ST_Y(w.lat_lon)
          ELSE NULL
        END as latitude,
        CASE
          WHEN w.lat_lon IS NOT NULL THEN ST_X(w.lat_lon)
          ELSE NULL
        END as longitude,
        w.geo_loc_name_sam as location_name
      FROM with_sra_and_biosample_loc_metadata w
      WHERE w.accession = $1
      LIMIT 1
```
</details>

---

### GET `/api/gene-details/:accession/research`

**Parameters**: `accession`

**Tables**: with_sra_metadata

**Columns**:
- `w`: accession, bioproject, biosample, acc, sra_study, release_date, organism, biosamplemodel_sam

<details>
<summary>SQL Query</summary>

```sql
SELECT 
        w.accession,
        w.bioproject,
        w.biosample,
        w.acc as sra_accession,
        w.sra_study,
        w.release_date,
        w.organism,
        w.biosamplemodel_sam as biosample_model
      FROM with_sra_metadata w
      WHERE w.accession = $1
      LIMIT 1
```
</details>

---

## /api/pdb

### GET `/api/pdb/accession/:accession`

**Parameters**: `accession`

**Tables**: pdb_accessions

<details>
<summary>SQL Query</summary>

```sql
SELECT pdb_id, accession, technique, relaxed, date_created, date_entered, alignment
       FROM pdb_accessions
       WHERE accession = $1
       ORDER BY date_created DESC
       LIMIT 1
```
</details>

---

## /api/enzymes

### GET `/api/enzymes`

**Tables**: —

---

### GET `/api/enzymes/:enzyme_id`

**Parameters**: `enzyme_id`

**Tables**: enzyme_fastaa, enzyme_taxonomy

**Columns**:
- `e`: enzyme_id, translated_sequence, genbank_accession_id, contig_id, orf_start, orf_end, orf_type, library_id
- `t`: family, family_pid, component, enzyme_id

<details>
<summary>SQL Query</summary>

```sql
SELECT
        e.enzyme_id,
        e.translated_sequence,
        e.genbank_accession_id,
        e.contig_id,
        e.orf_start,
        e.orf_end,
        e.orf_type,
        e.library_id,
        t.family,
        t.family_pid,
        t.component
      FROM enzyme_fastaa e
      LEFT JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
      WHERE e.enzyme_id = $1
```
</details>

---

### GET `/api/enzymes/family/:family_id`

**Parameters**: `family_id`

**Tables**: enzyme_fastaa, enzyme_taxonomy

**Columns**:
- `e`: enzyme_id, translated_sequence, genbank_accession_id, contig_id, orf_start, orf_end, orf_type, library_id
- `t`: family, family_pid, component, enzyme_id

<details>
<summary>SQL Query</summary>

```sql
SELECT
        e.enzyme_id,
        e.translated_sequence,
        e.genbank_accession_id,
        e.contig_id,
        e.orf_start,
        e.orf_end,
        e.orf_type,
        e.library_id,
        t.family,
        t.family_pid,
        t.component
      FROM enzyme_fastaa e
      INNER JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
      WHERE t.family = $1
      ORDER BY t.family_pid DESC NULLS FIRST
```
</details>

---

### GET `/api/enzymes/families/summary`

**Tables**: —

---

## /api/search

### POST `/api/search`

**Tables**: —

---

### POST `/api/search/export`

**Tables**: —

---

### GET `/api/search/export/:exportSessionId`

**Parameters**: `exportSessionId`

**Tables**: —

---

### GET `/api/search/results/:job_id`

**Parameters**: `job_id`

**Tables**: —

---

### GET `/api/search/history`

**Tables**: —

---

### POST `/api/search/samples`

**Tables**: —

---

### POST `/api/search/align`

**Tables**: —

---

## /api/atlas

### GET `/api/atlas/components`

**Tables**: —

---

## /api/family

### GET `/api/family/:familyId`

**Parameters**: `familyId`

**Tables**: enzyme_taxonomy, enzyme_fastaa, family_stats

**Columns**:
- `t`: family, component, family_pid, enzyme_id
- `e`: enzyme_id, genbank_accession_id, translated_sequence
- `fs`: family, variant_count, component_count, avg_identity

<details>
<summary>SQL Query</summary>

```sql
WITH family_stats AS (
         SELECT
           t.family,
           COUNT(DISTINCT e.enzyme_id) as variant_count,
           COUNT(DISTINCT t.component) FILTER (WHERE t.component IS NOT NULL) as component_count,
           ROUND(AVG(t.family_pid) FILTER (WHERE t.family_pid IS NOT NULL AND t.family_pid < 100), 1) as avg_identity
         FROM enzyme_taxonomy t
         INNER JOIN enzyme_fastaa e ON t.enzyme_id = e.enzyme_id
         WHERE t.family = $1
         GROUP BY t.family
       )
       SELECT
         fs.family as family_id,
         e.genbank_accession_id as centroid_accession,
         e.translated_sequence as centroid_sequence,
         e.enzyme_id as centroid_enzyme_id,
         fs.variant_count,
         fs.component_count,
         fs.avg_identity,
         t.component as centroid_component
       FROM family_stats fs
       INNER JOIN enzyme_taxonomy t ON fs.family = t.family AND (t.family_pid = 100 OR t.family_pid IS NULL)
       INNER JOIN enzyme_fastaa e ON t.enzyme_id = e.enzyme_id
```
</details>

---

### GET `/api/family/:familyId/members`

**Parameters**: `familyId`

**Tables**: enzyme_fastaa, enzyme_taxonomy

**Columns**:
- `e`: enzyme_id, genbank_accession_id, translated_sequence
- `t`: family_pid, component, enzyme_id, family

<details>
<summary>SQL Query</summary>

```sql
SELECT
           e.enzyme_id,
           e.genbank_accession_id,
           e.translated_sequence,
           t.family_pid,
           t.component
         FROM enzyme_fastaa e
         INNER JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
         WHERE t.family = $1
         ORDER BY t.family_pid DESC NULLS FIRST
         LIMIT $2 OFFSET $3
```
</details>

---

### GET `/api/family/:familyId/metadata`

**Parameters**: `familyId`

**Tables**: —

---

### GET `/api/family/:familyId/tree-members`

**Parameters**: `familyId`

**Tables**: enzyme_fastaa, enzyme_taxonomy

**Columns**:
- `e`: enzyme_id, genbank_accession_id
- `t`: family_pid, component, enzyme_id, family

<details>
<summary>SQL Query</summary>

```sql
SELECT
         e.enzyme_id,
         e.genbank_accession_id,
         t.family_pid,
         t.component
       FROM enzyme_fastaa e
       INNER JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
       WHERE t.family = $1
       ORDER BY t.family_pid DESC NULLS FIRST, e.enzyme_id
```
</details>

---

### GET `/api/family/:familyId/tree`

**Parameters**: `familyId`

**Tables**: —

---

## /api/sara-viewer

### GET `/api/sara-viewer`

**Tables**: sara_domains, sara_important_motfis, sara_signal_sequences

<details>
<summary>SQL Query</summary>

```sql
SELECT DISTINCT orf_id FROM (
        SELECT orf_id FROM sara_domains
        UNION
        SELECT orf_id FROM sara_important_motfis
        UNION
        SELECT orf_id FROM sara_signal_sequences
      ) t
      ORDER BY orf_id ASC
```
</details>

---

### GET `/api/sara-viewer/:orfId`

**Parameters**: `orfId`

**Tables**: —

---

## /api/petadex-domains

### GET `/api/petadex-domains/by-accession/:accession`

**Parameters**: `accession`

**Tables**: —

---

### GET `/api/petadex-domains/:orfId`

**Parameters**: `orfId`

**Tables**: —

---

## /api/resolve

### GET `/api/resolve/summary`

**Tables**: corpus_summary

**Columns**:
- `corpus_summary`: *

<details>
<summary>SQL Query</summary>

```sql
SELECT * FROM corpus_summary LIMIT 1
```
</details>

---

### GET `/api/resolve`

**Tables**: —

---

## /api/cluster

### GET `/api/cluster/:level/:clusterId`

**Parameters**: `level`, `clusterId`

**Tables**: —

<details>
<summary>SQL Query</summary>

```sql
SELECT * FROM ${table} WHERE cluster_id = $1 LIMIT 1
```
</details>

---

## /api/orf

### GET `/api/orf/:orfId/domains`

**Parameters**: `orfId`

**Tables**: petadex_catalytic_domains, pazy_hmms

**Columns**:
- `d`: pazy_hmm_id, domain_start, domain_end, catalytic_residues, date_performed, orf_id
- `h`: domain, catalytic_match_states, pazy_hmm_id

<details>
<summary>SQL Query</summary>

```sql
SELECT d.pazy_hmm_id, d.domain_start, d.domain_end,
              d.catalytic_residues, d.date_performed,
              h.domain AS domain_name, h.catalytic_match_states
       FROM petadex_catalytic_domains d
       LEFT JOIN pazy_hmms h
         ON regexp_replace(h.pazy_hmm_id, '_[0-9]+(\\.hmm)?$', '')
          = regexp_replace(d.pazy_hmm_id, '_[0-9]+(\\.hmm)?$', '')
       WHERE d.orf_id = $1
       ORDER BY d.domain_start
```
</details>

---

### GET `/api/orf/:orfId`

**Parameters**: `orfId`

**Tables**: —

---

## /api/kinetics

### GET `/api/kinetics/published/raw`

**Tables**: plastic_kinetics_published

**Columns**:
- `plastic_kinetics_published`: *

<details>
<summary>SQL Query</summary>

```sql
SELECT * FROM public.plastic_kinetics_published ORDER BY "Experiment_#"
```
</details>

---

## /api/sequence

### GET `/api/sequence/:id/samples`

**Parameters**: `id`

**Tables**: —

---

## /api/sequences

### GET `/api/sequences/:orfId/provenance`

**Parameters**: `orfId`

**Tables**: —

---

## /api/annotations

### POST `/api/annotations/batch`

**Tables**: —

---

## /api/biosamples

### GET `/api/biosamples/:id`

**Parameters**: `id`

**Tables**: —

---

### GET `/api/biosamples/:id/sequences`

**Parameters**: `id`

**Tables**: —

---

## /api/clusters

### GET `/api/clusters/:pid90/profiles`

**Parameters**: `pid90`

**Tables**: —

---

## /api/profiles

### GET `/api/profiles`

**Tables**: —

---

### GET `/api/profiles/:slug`

**Parameters**: `slug`

**Tables**: —

---

### GET `/api/profiles/:slug/biosamples`

**Parameters**: `slug`

**Tables**: —

---

## /

### GET `/`

**Tables**: —

---

### GET `/health`

**Tables**: —

<details>
<summary>SQL Query</summary>

```sql
SELECT 1
```
</details>

---

*Generated from the mounted Express app by backend/scripts/generate-api-docs.js*
