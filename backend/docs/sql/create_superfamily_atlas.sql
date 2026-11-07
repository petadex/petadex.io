-- Superfamily atlas (v260701 Run 2, 30 % identity centroids). New objects only; nothing existing is altered.
-- Run: psql -v ON_ERROR_STOP=1 -f create_superfamily_atlas.sql   (from this directory; \copy reads out/*.tsv)
-- Data files (out/*.tsv) are built by build_atlas_tables.py in petadex-clustering/atlas_v260701 (watson); applied to RDS 2026-11-07.
BEGIN;

CREATE TABLE superfamily_atlas_layouts (
  layout         text PRIMARY KEY,
  label          text NOT NULL,
  embedding      text NOT NULL,
  parameters     text NOT NULL,
  date_computed  date NOT NULL,
  date_clustered date NOT NULL
);

CREATE TABLE superfamily_atlas_metadata (
  superfamily_id    text PRIMARY KEY,
  source            text NOT NULL CHECK (source IN ('logan', 'nr', 'pazy')),
  cath_fold         text NOT NULL,
  cath_domain       text,
  domain_name       text,
  component         text NOT NULL,
  core_length       integer NOT NULL,
  n_sequences       bigint  NOT NULL,
  n_families        integer NOT NULL,
  n_enzyme_clusters integer NOT NULL,
  organism          text,
  taxonomy          text,
  date_clustered    date NOT NULL
);

CREATE TABLE superfamily_atlas_coordinates (
  superfamily_id text NOT NULL REFERENCES superfamily_atlas_metadata (superfamily_id),
  layout         text NOT NULL REFERENCES superfamily_atlas_layouts (layout),
  x              double precision NOT NULL,
  y              double precision NOT NULL,
  PRIMARY KEY (superfamily_id, layout)
);

\copy superfamily_atlas_layouts     FROM 'out/superfamily_atlas_layouts.tsv'     WITH (FORMAT text)
\copy superfamily_atlas_metadata    FROM 'out/superfamily_atlas_metadata.tsv'    WITH (FORMAT text)
\copy superfamily_atlas_coordinates FROM 'out/superfamily_atlas_coordinates.tsv' WITH (FORMAT text)

CREATE INDEX superfamily_atlas_metadata_component_idx   ON superfamily_atlas_metadata (component);
CREATE INDEX superfamily_atlas_metadata_cath_domain_idx ON superfamily_atlas_metadata (cath_domain);

-- One row per superfamily with every layout's coordinates: what export-superfamily-atlas.js dumps for the site.
CREATE MATERIALIZED VIEW superfamily_atlas AS
SELECT m.superfamily_id,
       u.x AS umap_x, u.y AS umap_y,
       t.x AS tsne_x, t.y AS tsne_y,
       m.source, m.cath_fold, m.cath_domain, m.domain_name, m.component, m.core_length,
       m.n_sequences, m.n_families, m.n_enzyme_clusters, m.organism, m.taxonomy, m.date_clustered
FROM superfamily_atlas_metadata m
JOIN superfamily_atlas_coordinates u ON u.superfamily_id = m.superfamily_id AND u.layout = 'umap'
JOIN superfamily_atlas_coordinates t ON t.superfamily_id = m.superfamily_id AND t.layout = 'tsne';
CREATE UNIQUE INDEX superfamily_atlas_superfamily_id_idx ON superfamily_atlas (superfamily_id);

-- checks: abort the transaction on any mismatch
DO $$
DECLARE n_m bigint; n_c bigint; n_v bigint; n_s numeric;
BEGIN
  SELECT count(*), sum(n_sequences) INTO n_m, n_s FROM superfamily_atlas_metadata;
  SELECT count(*) INTO n_c FROM superfamily_atlas_coordinates;
  SELECT count(*) INTO n_v FROM superfamily_atlas;
  IF n_m <> 65769 OR n_c <> 131538 OR n_v <> 65769 OR n_s <> 298687346 THEN
    RAISE EXCEPTION 'superfamily atlas load mismatch: meta % coords % view % seqs %', n_m, n_c, n_v, n_s;
  END IF;
END $$;

COMMIT;
