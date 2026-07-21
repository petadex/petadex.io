// backend/src/routes/sra.js
//
// SRA / BioSample / organism hubs backed by sra_metadata (Denis CSV ingest).
// Join to corpus: sra_metadata.acc = logan_catalytic_orfs.library_id.
//
// Performance: file-backed organism/summary cache (src/lib/sraStatsCache.js)
// because the app DB role often cannot CREATE INDEX/TABLE on shared RDS.
import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';
import {
  ensureSraStatsCache,
  getOrganismStats,
  getSummaryFromCache,
  isCacheBuilding,
  isCacheReady,
  searchOrganisms,
} from '../lib/sraStatsCache.js';

const router = Router();

const accSchema = Joi.string().max(64).required();
const biosampleSchema = Joi.string().max(64).required();
const organismSchema = Joi.string().min(1).max(512).required();
const qSchema = Joi.string().min(1).max(200).required();
const pageSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(25),
  offset: Joi.number().integer().min(0).default(0),
});

const RUN_COLS = `
  acc, assay_type, center_name, experiment, sample_name, instrument,
  librarylayout, libraryselection, librarysource, platform, sample_acc,
  biosample, organism, sra_study, releasedate, bioproject, mbytes, avgspotlen,
  mbases, library_name, biosamplemodel_sam, collection_date_sam,
  geo_loc_name_country_calc, geo_loc_name_country_continent_calc,
  geo_loc_name_sam, latitude, longitude, elevation, country, biome, confidence
`;

const SUMMARY_TTL_MS = 60 * 60 * 1000;
let summaryMem = { at: 0, payload: null };

function parsePage(query) {
  const { error, value } = pageSchema.validate({
    limit: query.limit != null ? Number(query.limit) : undefined,
    offset: query.offset != null ? Number(query.offset) : undefined,
  });
  if (error) return { error: error.message };
  return { value };
}

function kickOffCacheBuild() {
  ensureSraStatsCache().catch(err => {
    console.error('[sra] stats cache build failed:', err.message);
  });
}

// Warm cache in background as soon as routes load (no-op if disk cache exists).
kickOffCacheBuild();

// GET /api/sra/summary
router.get('/summary', async (_req, res, next) => {
  try {
    const now = Date.now();
    if (summaryMem.payload && now - summaryMem.at < SUMMARY_TTL_MS) {
      return res.json({ ...summaryMem.payload, cached: true });
    }

    const fromFile = getSummaryFromCache();
    if (fromFile) {
      const payload = {
        ...fromFile,
        source: 'sra_stats_cache',
        s3_canonical: 's3://petadex/sra/petadex_metadata_dedup.csv',
      };
      summaryMem = { at: now, payload };
      return res.json({ ...payload, cached: false });
    }

    if (isCacheBuilding()) {
      return res.status(202).json({
        status: 'warming',
        message:
          'SRA summary cache is building (one-time scan of sra_metadata). Retry shortly.',
      });
    }

    kickOffCacheBuild();
    return res.status(202).json({
      status: 'warming',
      message: 'Started building SRA summary cache. Retry in a minute.',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/sra/organism?q=
router.get('/organism', async (req, res, next) => {
  const { error, value: q } = qSchema.validate(String(req.query.q || '').trim());
  if (error) return res.status(400).json({ error: 'q is required (1–200 chars)' });
  if (q.length < 2) {
    return res.status(400).json({ error: 'q must be at least 2 characters' });
  }

  try {
    if (!isCacheReady()) {
      kickOffCacheBuild();
      return res.status(202).json({
        status: 'warming',
        building: isCacheBuilding(),
        message:
          'Organism search cache is warming (one-time). Please retry in ~1–3 minutes.',
        q,
        results: [],
      });
    }

    const results = searchOrganisms(q, 50) || [];
    res.json({
      q,
      source: 'sra_stats_cache',
      results,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/sra/organism/:name/biosamples
router.get('/organism/:name/biosamples', async (req, res, next) => {
  const name = decodeURIComponent(req.params.name);
  const { error: nameErr } = organismSchema.validate(name);
  if (nameErr) return res.status(400).json({ error: nameErr.message });
  const page = parsePage(req.query);
  if (page.error) return res.status(400).json({ error: page.error });
  const { limit, offset } = page.value;

  try {
    const client = await pool.connect();
    try {
      // Cap work if unindexed; organism filter still helps once rows are found.
      await client.query('SET LOCAL statement_timeout = 20000');
      const { rows } = await client.query(
        `SELECT biosample,
                COUNT(*)::int AS n_runs,
                MIN(geo_loc_name_country_calc) AS country,
                MIN(biome) AS biome
         FROM sra_metadata
         WHERE organism = $1 AND biosample IS NOT NULL
         GROUP BY biosample
         ORDER BY n_runs DESC
         LIMIT $2 OFFSET $3`,
        [name, limit, offset],
      );
      res.json({ organism: name, limit, offset, biosamples: rows });
    } catch (err) {
      if (err.code === '57014') {
        return res.json({
          organism: name,
          limit,
          offset,
          biosamples: [],
          warning: 'biosample aggregation timed out; ask ops to index organism',
        });
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'sra_metadata is unavailable' });
    }
    next(err);
  }
});

// GET /api/sra/organism/:name
router.get('/organism/:name', async (req, res, next) => {
  const name = decodeURIComponent(req.params.name);
  const { error } = organismSchema.validate(name);
  if (error) return res.status(400).json({ error: error.message });

  try {
    if (!isCacheReady()) {
      kickOffCacheBuild();
      return res.status(202).json({
        status: 'warming',
        organism: name,
        message: 'Organism stats cache is warming. Retry shortly.',
      });
    }

    const stats = getOrganismStats(name);
    if (!stats) {
      return res.status(404).json({ error: `Organism not found: ${name}` });
    }

    const enrich = String(req.query.enrich || '') === '1';
    let sampleRuns = [];
    let top_countries = [];
    let top_biomes = [];

    const client = await pool.connect();
    try {
      await client.query('SET LOCAL statement_timeout = 15000');
      try {
        const { rows } = await client.query(
          `SELECT acc, biosample, assay_type, platform, geo_loc_name_country_calc AS country,
                  biome, releasedate
           FROM sra_metadata
           WHERE organism = $1
           LIMIT 10`,
          [name],
        );
        sampleRuns = rows;
      } catch (err) {
        if (err.code !== '57014') throw err;
      }

      if (enrich) {
        try {
          const [countries, biomes] = await Promise.all([
            client.query(
              `SELECT geo_loc_name_country_calc AS country, COUNT(*)::int AS n
               FROM sra_metadata
               WHERE organism = $1
                 AND geo_loc_name_country_calc IS NOT NULL
                 AND geo_loc_name_country_calc <> ''
                 AND geo_loc_name_country_calc <> 'uncalculated'
               GROUP BY 1
               ORDER BY n DESC
               LIMIT 15`,
              [name],
            ),
            client.query(
              `SELECT biome, COUNT(*)::int AS n
               FROM sra_metadata
               WHERE organism = $1 AND biome IS NOT NULL
               GROUP BY 1
               ORDER BY n DESC
               LIMIT 10`,
              [name],
            ),
          ]);
          top_countries = countries.rows;
          top_biomes = biomes.rows;
        } catch (err) {
          if (err.code !== '57014') throw err;
        }
      }
    } finally {
      client.release();
    }

    res.json({
      organism: stats.organism,
      n_runs: stats.n_runs,
      n_biosamples: stats.n_biosamples,
      n_countries: top_countries.length || null,
      n_biomes: top_biomes.length || null,
      top_countries,
      top_biomes,
      sample_runs: sampleRuns,
      bacdrive: null,
      enrich,
      source: 'sra_stats_cache',
    });
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'sra_metadata is unavailable' });
    }
    next(err);
  }
});

// GET /api/sra/biosample/:id/runs
router.get('/biosample/:id/runs', async (req, res, next) => {
  const { error, value: id } = biosampleSchema.validate(req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  const page = parsePage(req.query);
  if (page.error) return res.status(400).json({ error: page.error });
  const { limit, offset } = page.value;

  try {
    const { rows } = await pool.query(
      `SELECT acc, assay_type, platform, instrument, organism, sra_study, bioproject,
              mbytes, mbases, releasedate, geo_loc_name_country_calc AS country, biome
       FROM sra_metadata
       WHERE biosample = $1
       ORDER BY releasedate DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [id, limit, offset],
    );
    res.json({ biosample: id, limit, offset, runs: rows });
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'sra_metadata is unavailable' });
    }
    next(err);
  }
});

// GET /api/sra/biosample/:id
router.get('/biosample/:id', async (req, res, next) => {
  const { error, value: id } = biosampleSchema.validate(req.params.id);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT
         biosample,
         MIN(organism) FILTER (WHERE organism IS NOT NULL AND organism <> '') AS organism,
         COUNT(*)::int AS n_runs,
         COUNT(DISTINCT acc)::int AS n_acc,
         MIN(bioproject) AS bioproject,
         MIN(geo_loc_name_country_calc) AS country,
         MIN(geo_loc_name_country_continent_calc) AS continent,
         MIN(biome) AS biome,
         MIN(latitude) AS latitude,
         MIN(longitude) AS longitude,
         MIN(collection_date_sam) AS collection_date
       FROM sra_metadata
       WHERE biosample = $1
       GROUP BY biosample`,
      [id],
    );
    if (!rows.length) {
      return res.status(404).json({ error: `BioSample not found: ${id}` });
    }

    res.json({
      ...rows[0],
      orf_count: null,
      bacdrive: null,
      external_link: `https://www.ncbi.nlm.nih.gov/biosample/${encodeURIComponent(id)}`,
    });
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'sra_metadata is unavailable' });
    }
    next(err);
  }
});

// GET /api/sra/run/:acc/orfs
router.get('/run/:acc/orfs', async (req, res, next) => {
  const { error, value: acc } = accSchema.validate(req.params.acc);
  if (error) return res.status(400).json({ error: error.message });
  const page = parsePage(req.query);
  if (page.error) return res.status(400).json({ error: page.error });
  const { limit, offset } = page.value;

  try {
    const { rows } = await pool.query(
      `SELECT orf_id, contig, orf_start, orf_end, orf_type
       FROM logan_catalytic_orfs
       WHERE library_id = $1
       ORDER BY orf_id
       LIMIT $2 OFFSET $3`,
      [acc, limit, offset],
    );
    res.json({ acc, limit, offset, orfs: rows });
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'logan_catalytic_orfs is unavailable' });
    }
    next(err);
  }
});

// GET /api/sra/run/:acc
router.get('/run/:acc', async (req, res, next) => {
  const { error, value: acc } = accSchema.validate(req.params.acc);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT ${RUN_COLS}
       FROM sra_metadata
       WHERE acc = $1
       LIMIT 1`,
      [acc],
    );
    if (!rows.length) {
      return res.status(404).json({ error: `SRA run not found: ${acc}` });
    }

    let orf_count = 0;
    try {
      const { rows: orfRows } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM logan_catalytic_orfs WHERE library_id = $1`,
        [acc],
      );
      orf_count = orfRows[0]?.n ?? 0;
    } catch (err) {
      if (err.code !== '42P01') throw err;
    }

    res.json({
      ...rows[0],
      orf_count,
      external_link: `https://www.ncbi.nlm.nih.gov/sra/?term=${encodeURIComponent(acc)}`,
    });
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'sra_metadata is unavailable' });
    }
    next(err);
  }
});

export default router;
