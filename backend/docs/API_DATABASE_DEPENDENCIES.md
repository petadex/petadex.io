# PETadex API - Database Dependencies

**Auto-generated**: 2026-09-01
**Purpose**: Maps API endpoints to database tables/columns to identify breaking changes

---

## Quick Reference

| Endpoint | Method | Tables |
|----------|--------|--------|
| `/api/aa-seq-features/` | GET | aa_seq_features |
| `/api/aa-seq-features/:accession` | GET | aa_seq_features |
| `/api/atlas/umap` | GET | None |
| `/api/atlas/components` | GET | None |
| `/api/cluster/:level/:clusterId` | GET | None |
| `/api/enzymes/` | GET | None |
| `/api/enzymes/search` | GET | enzyme_taxonomy, family_stats, enzyme_fastaa |
| `/api/enzymes/:enzyme_id` | GET | enzyme_fastaa, enzyme_taxonomy |
| `/api/enzymes/accession/:accession` | GET | enzyme_fastaa, enzyme_taxonomy |
| `/api/enzymes/:enzyme_id/variants` | GET | variant_dictionary |
| `/api/enzymes/family/:family_id` | GET | enzyme_fastaa, enzyme_taxonomy |
| `/api/enzymes/component/:component_id` | GET | enzyme_fastaa, enzyme_taxonomy |
| `/api/enzymes/stats/overview` | GET | enzyme_stats_overview, enzyme_taxonomy, enzyme_fastaa |
| `/api/enzymes/families/summary` | GET | None |
| `/api/family/:familyId` | GET | enzyme_taxonomy, family_stats, enzyme_fastaa |
| `/api/family/:familyId/members` | GET | enzyme_fastaa, enzyme_taxonomy |
| `/api/family/:familyId/metadata` | GET | None |
| `/api/family/:familyId/umap` | GET | None |
| `/api/family/:familyId/tree-members` | GET | enzyme_fastaa, enzyme_taxonomy |
| `/api/family/:familyId/tree` | GET | None |
| `/api/fastaa/` | GET | fastaa, with_sra_and_biosample_loc_metadata |
| `/api/fastaa/:accession` | GET | with_sra_and_biosample_loc_metadata, fastaa |
| `/api/gene-details/locations` | GET | None |
| `/api/gene-details/:accession/header` | GET | with_sra_and_biosample_loc_metadata |
| `/api/gene-details/:accession/origin` | GET | with_sra_and_biosample_loc_metadata |
| `/api/gene-details/:accession/synthesized` | GET | with_sra_metadata |
| `/api/gene-details/:accession/research` | GET | with_sra_metadata |
| `/api/gene-details/:accession` | GET | with_sra_metadata, with_sra_and_biosample_loc_metadata |
| `/api/gene-metadata/` | GET | gene_metadata |
| `/api/gene-metadata/:gene` | GET | gene_metadata |
| `/api/gene-metadata/by-accession/:accession` | GET | gene_metadata |
| `/api/kinetics/published` | GET | None |
| `/api/kinetics/published/raw` | GET | public |
| `/api/orf/:orfId/provenance` | GET | None |
| `/api/orf/:orfId/domains` | GET | petadex_catalytic_domains, pazy_hmms |
| `/api/orf/:orfId` | GET | None |
| `/api/pdb/accession/:accession` | GET | pdb_accessions |
| `/api/pdb/:pdb_id` | GET | pdb_accessions |
| `/api/petadex-domains/by-accession/:accession` | GET | None |
| `/api/petadex-domains/:orfId` | GET | None |
| `/api/plate-data/comparison` | GET | accession_activity_view, gene_metadata |
| `/api/plate-data/gene/:gene/average` | GET | plate_data, plate_metadata |
| `/api/plate-data/gene/:gene` | GET | plate_data |
| `/api/plate-data/activity/gene/:gene` | GET | plate_activity_view |
| `/api/plate-data/experiment/:exp_id` | GET | plate_activity_view |
| `/api/resolve/summary` | GET | corpus_summary |
| `/api/resolve/` | GET | None |
| `/api/sara-viewer/` | GET | sara_domains, sara_important_motfis, sara_signal_sequences |
| `/api/sara-viewer/by-accession/:accession` | GET | None |
| `/api/sara-viewer/:orfId` | GET | None |
| `/api/search/` | POST | None |
| `/api/search/phylo-tree/:family_id` | GET | None |
| `/api/search/results/:job_id` | GET | None |
| `/api/search/history` | GET | None |

---

## AaSeqFeatures Routes

Base: `/api/aa-seq-features`

### GET `/api/aa-seq-features/`

**Tables**: aa_seq_features

**Columns**:
- `aa_seq_features`: *

<details>
<summary>SQL Query</summary>

```sql
SELECT * FROM aa_seq_features ORDER BY accession ASC
```
</details>

---

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

## Atlas Routes

Base: `/api/atlas`

### GET `/api/atlas/umap`

**Tables**: None

---

### GET `/api/atlas/components`

**Tables**: None

---

## Cluster Routes

Base: `/api/cluster`

### GET `/api/cluster/:level/:clusterId`

**Parameters**: `level`, `clusterId`

**Tables**: None

<details>
<summary>SQL Query</summary>

```sql
SELECT * FROM ${table} WHERE cluster_id = $1 LIMIT 1
```
</details>

---

## Enzymes Routes

Base: `/api/enzymes`

### GET `/api/enzymes/`

**Tables**: None

---

### GET `/api/enzymes/search`

**Tables**: enzyme_taxonomy, family_stats, enzyme_fastaa

**Columns**:
- `t`: family, component, family_pid, enzyme_id
- `e`: enzyme_id, genbank_accession_id, contig_id, library_id
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
           fs.variant_count,
           fs.component_count,
           fs.avg_identity
         FROM family_stats fs
         INNER JOIN enzyme_taxonomy t ON fs.family = t.family AND (t.family_pid = 100 OR t.family_pid IS NULL)
         INNER JOIN enzyme_fastaa e ON t.enzyme_id = e.enzyme_id
```
</details>

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

### GET `/api/enzymes/accession/:accession`

**Parameters**: `accession`

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
      WHERE e.genbank_accession_id = $1
```
</details>

---

### GET `/api/enzymes/:enzyme_id/variants`

**Parameters**: `enzyme_id`

**Tables**: variant_dictionary

**Columns**:
- `v`: variant_id, enzyme_id, genbank_accession_id, enzyme_pid, library_id, contig_id

<details>
<summary>SQL Query</summary>

```sql
SELECT
        v.variant_id,
        v.enzyme_id,
        v.genbank_accession_id,
        v.enzyme_pid,
        v.library_id,
        v.contig_id
      FROM variant_dictionary v
      WHERE v.enzyme_id = $1
      ORDER BY v.enzyme_pid DESC NULLS FIRST
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

### GET `/api/enzymes/component/:component_id`

**Parameters**: `component_id`

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
      WHERE t.component = $1
      ORDER BY t.family, t.family_pid DESC NULLS FIRST
```
</details>

---

### GET `/api/enzymes/stats/overview`

**Tables**: enzyme_stats_overview, enzyme_taxonomy, enzyme_fastaa

**Columns**:
- `enzyme_stats_overview`: *

<details>
<summary>SQL Query</summary>

```sql
SELECT * FROM enzyme_stats_overview LIMIT 1
```
</details>

---

### GET `/api/enzymes/families/summary`

**Tables**: None

---

## Family Routes

Base: `/api/family`

### GET `/api/family/:familyId`

**Parameters**: `familyId`

**Tables**: enzyme_taxonomy, family_stats, enzyme_fastaa

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

**Tables**: None

---

### GET `/api/family/:familyId/umap`

**Parameters**: `familyId`

**Tables**: None

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

**Tables**: None

---

## Fastaa Routes

Base: `/api/fastaa`

### GET `/api/fastaa/`

**Tables**: fastaa, with_sra_and_biosample_loc_metadata

**Columns**:
- `f`: accession, aa_sequence, source, synonyms, date_entered, genotype, genotype_description, synthetic, parent_accessions, parent_genes, in_gene_metadata
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
        f.in_gene_metadata,
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

**Tables**: with_sra_and_biosample_loc_metadata, fastaa

**Columns**:
- `f`: accession, aa_sequence, source, synonyms, date_entered, genotype, genotype_description, synthetic, parent_accessions, parent_genes, in_gene_metadata
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
        f.in_gene_metadata,
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

## GeneDetails Routes

Base: `/api/gene-details`

### GET `/api/gene-details/locations`

**Tables**: None

**Columns**:
- `w`: accession, geo_loc_name_country_calc

<details>
<summary>SQL Query</summary>

```sql
SELECT
          w.accession,
          COALESCE(
            NULLIF(NULLIF(w.geo_loc_name_country_calc,
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

### GET `/api/gene-details/:accession/synthesized`

**Parameters**: `accession`

**Tables**: with_sra_metadata

**Columns**:
- `w`: accession, aa_sequence, source, genotype, genotype_description, synthetic, parent_accessions, parent_genes, synonyms

<details>
<summary>SQL Query</summary>

```sql
SELECT 
        w.accession,
        w.aa_sequence,
        w.source,
        w.genotype,
        w.genotype_description,
        w.synthetic,
        w.parent_accessions,
        w.parent_genes,
        w.synonyms
      FROM with_sra_metadata w
      WHERE w.accession = $1
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

### GET `/api/gene-details/:accession`

**Parameters**: `accession`

**Tables**: with_sra_metadata, with_sra_and_biosample_loc_metadata

**Columns**:
- `s`: accession, aa_sequence, source, genotype, genotype_description, synthetic, parent_accessions, parent_genes, synonyms, bioproject, biosample, acc, sra_study, release_date, organism, biosamplemodel_sam, geo_loc_name_country_calc, geo_loc_name_country_continent_calc, collection_date_sam, geo_loc_name_sam
- `l`: biome, elevation, lat_lon, accession

<details>
<summary>SQL Query</summary>

```sql
SELECT
        s.accession,
        s.aa_sequence,
        s.source,
        s.genotype,
        s.genotype_description,
        s.synthetic,
        s.parent_accessions,
        s.parent_genes,
        s.synonyms,
        s.bioproject,
        s.biosample,
        s.acc as sra_accession,
        s.sra_study,
        s.release_date,
        s.organism,
        s.biosamplemodel_sam as biosample_model,
        s.geo_loc_name_country_calc as country,
        s.geo_loc_name_country_continent_calc as continent,
        s.collection_date_sam as collection_date,
        s.geo_loc_name_sam as location_name,
        l.biome,
        l.elevation,
        CASE
          WHEN l.lat_lon IS NOT NULL THEN ST_Y(l.lat_lon)
          ELSE NULL
        END as latitude,
        CASE
          WHEN l.lat_lon IS NOT NULL THEN ST_X(l.lat_lon)
          ELSE NULL
        END as longitude
      FROM with_sra_metadata s
      LEFT JOIN with_sra_and_biosample_loc_metadata l ON s.accession = l.accession
      WHERE s.accession = $1
      LIMIT 1
```
</details>

---

## GeneMetadata Routes

Base: `/api/gene-metadata`

### GET `/api/gene-metadata/`

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
      ORDER BY gene ASC
```
</details>

---

### GET `/api/gene-metadata/:gene`

**Parameters**: `gene`

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
      WHERE gene = $1
```
</details>

---

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

## Kinetics Routes

Base: `/api/kinetics`

### GET `/api/kinetics/published`

**Tables**: None

<details>
<summary>SQL Query</summary>

```sql
SELECT
```
</details>

---

### GET `/api/kinetics/published/raw`

**Tables**: public

**Columns**:
- `public`: plastic_kinetics_published

<details>
<summary>SQL Query</summary>

```sql
SELECT * FROM public.plastic_kinetics_published ORDER BY
```
</details>

---

## Orf Routes

Base: `/api/orf`

### GET `/api/orf/:orfId/provenance`

**Parameters**: `orfId`

**Tables**: None

---

### GET `/api/orf/:orfId/domains`

**Parameters**: `orfId`

**Tables**: petadex_catalytic_domains, pazy_hmms

**Columns**:
- `d`: pazy_hmm_id, domain_start, domain_end, catalytic_residues, date_performed
- `h`: domain, catalytic_match_states, pazy_hmm_id

<details>
<summary>SQL Query</summary>

```sql
SELECT d.pazy_hmm_id, d.domain_start, d.domain_end,
              d.catalytic_residues, d.date_performed,
              h.domain AS domain_name, h.catalytic_match_states
       FROM petadex_catalytic_domains d
       LEFT JOIN pazy_hmms h
         ON regexp_replace(h.pazy_hmm_id,
```
</details>

---

### GET `/api/orf/:orfId`

**Parameters**: `orfId`

**Tables**: None

---

## Pdb Routes

Base: `/api/pdb`

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

### GET `/api/pdb/:pdb_id`

**Parameters**: `pdb_id`

**Tables**: pdb_accessions

<details>
<summary>SQL Query</summary>

```sql
SELECT pdb_id, accession, technique, relaxed, date_created, date_entered, alignment
       FROM pdb_accessions
       WHERE pdb_id = $1
```
</details>

---

## PetadexDomains Routes

Base: `/api/petadex-domains`

### GET `/api/petadex-domains/by-accession/:accession`

**Parameters**: `accession`

**Tables**: None

---

### GET `/api/petadex-domains/:orfId`

**Parameters**: `orfId`

**Tables**: None

---

## PlateData Routes

Base: `/api/plate-data`

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

### GET `/api/plate-data/gene/:gene`

**Parameters**: `gene`

**Tables**: plate_data

<details>
<summary>SQL Query</summary>

```sql
SELECT
        id,
        gene,
        plate,
        plasmid,
        column,
        row,
        normalization_method,
        readout_value,
        colony_size,
        date_entered,
        measurement_type
      FROM plate_data
      WHERE gene = $1
      ORDER BY plate, row, column
```
</details>

---

### GET `/api/plate-data/activity/gene/:gene`

**Parameters**: `gene`

**Tables**: plate_activity_view

<details>
<summary>SQL Query</summary>

```sql
SELECT
        id,
        gene,
        plate,
        readout_value,
        measurement_type,
        normalization_method,
        colony_size,
        row,
        column,
        plasmid,
        exp_id,
        exp_description,
        media,
        timepoint_hours,
        temp_celsius,
        ph,
        organism,
        control_genes,
        operator,
        date_created,
        date_read
      FROM plate_activity_view
      WHERE gene = $1
      ORDER BY plate, row, column
```
</details>

---

### GET `/api/plate-data/experiment/:exp_id`

**Parameters**: `exp_id`

**Tables**: plate_activity_view

<details>
<summary>SQL Query</summary>

```sql
SELECT
        id,
        gene,
        plate,
        readout_value,
        measurement_type,
        normalization_method,
        colony_size,
        row,
        column,
        plasmid,
        exp_id,
        exp_description,
        media,
        timepoint_hours,
        temp_celsius,
        ph,
        organism,
        control_genes,
        operator,
        date_created,
        date_read
      FROM plate_activity_view
      WHERE exp_id = $1
      ORDER BY gene, plate, row, column
```
</details>

---

## Resolve Routes

Base: `/api/resolve`

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

### GET `/api/resolve/`

**Tables**: None

---

## SaraViewer Routes

Base: `/api/sara-viewer`

### GET `/api/sara-viewer/`

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

### GET `/api/sara-viewer/by-accession/:accession`

**Parameters**: `accession`

**Tables**: None

---

### GET `/api/sara-viewer/:orfId`

**Parameters**: `orfId`

**Tables**: None

---

## Search Routes

Base: `/api/search`

### POST `/api/search/`

**Tables**: None

---

### GET `/api/search/phylo-tree/:family_id`

**Parameters**: `family_id`

**Tables**: None

---

### GET `/api/search/results/:job_id`

**Parameters**: `job_id`

**Tables**: None

---

### GET `/api/search/history`

**Tables**: None

---

---

*Generated by GitHub Actions on every route change*
