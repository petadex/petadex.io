// backend/src/routes/structure.js
//
// Resolve an ORF / accession to a viewable 3D structure for Mol*.
// Preference order: experimental PDB (pdb_accessions) → Alex ESMFold2 predicted
// CIF under petadex-protein-structures.
//
// Alex schema (Jul 2026):
//   {lane}/structures/orf{id}.cif
//   {lane}/metrics/orf{id}.json
// Demo lane (public today): esmfold2-centroids/test2
// Production lane (ACL pending Dennis): esmfold2-centroids/60pid
// MSA experimental (Alex confirmed; ACL pending): esmfold2-centroids/60pid-msa
//   same layout: structures/orf{id}.cif · metrics/orf{id}.json
import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';
import { fetchAndSummarizeMetrics } from '../lib/structureMetrics.js';

const router = Router();

const STRUCTURE_S3_BASE = (
  process.env.STRUCTURE_S3_BASE ||
  'https://petadex-protein-structures.s3.amazonaws.com'
).replace(/\/$/, '');

/** Baseline predicted folds. test2 = public demo; flip to 60pid after Dennis opens ACL. */
const STRUCTURE_S3_LANE = (
  process.env.STRUCTURE_S3_LANE ||
  'esmfold2-centroids/test2'
).replace(/^\/+|\/+$/g, '');

/**
 * Optional MSA experimental lane (replaces former “finetune” labeling).
 * Alex confirmed prefix: esmfold2-centroids/60pid-msa (same structures/ + metrics/).
 * Default empty so we don’t probe a still-private prefix on every resolve;
 * set STRUCTURE_S3_MSA_LANE=esmfold2-centroids/60pid-msa once Dennis opens public GET
 * (existence probe hides the Base/MSA toggle if the CIF is still 403).
 */
const STRUCTURE_S3_MSA_LANE = (
  process.env.STRUCTURE_S3_MSA_LANE ||
  process.env.STRUCTURE_S3_FINETUNE_LANE || // legacy env alias
  ''
).replace(/^\/+|\/+$/g, '');

const orfIdSchema = Joi.number().integer().min(1).required();
const accessionSchema = Joi.string().max(64).required();
// `finetune` accepted as legacy alias for `msa`
const variantSchema = Joi.string().valid('base', 'msa', 'finetune').default('base');

function normalizeVariant(v) {
  return v === 'finetune' ? 'msa' : v;
}

function predictedUrls(orfId, { msa = false } = {}) {
  const lane = msa ? STRUCTURE_S3_MSA_LANE : STRUCTURE_S3_LANE;
  if (!lane) return { structure_url: null, metrics_url: null };
  const key = `orf${orfId}`;
  return {
    structure_url: `${STRUCTURE_S3_BASE}/${lane}/structures/${key}.cif`,
    metrics_url: `${STRUCTURE_S3_BASE}/${lane}/metrics/${key}.json`,
  };
}

function predictedPayload(orfId, { isCentroid, accession = null, variant = 'base' } = {}) {
  const base = predictedUrls(orfId, { msa: false });
  const msaUrls = predictedUrls(orfId, { msa: true });
  const wantMsa = variant === 'msa' && msaUrls.structure_url;
  const active = wantMsa ? msaUrls : base;
  return {
    orf_id: orfId,
    accession,
    source: isCentroid ? 'esmfold2_centroid_60' : 'esmfold2_orf',
    format: 'mmcif',
    variant: wantMsa ? 'msa' : 'base',
    structure_url: active.structure_url,
    metrics_url: active.metrics_url,
    base_structure_url: base.structure_url,
    base_metrics_url: base.metrics_url,
    msa_structure_url: msaUrls.structure_url,
    msa_metrics_url: msaUrls.metrics_url,
    // legacy aliases (same URLs) so older clients keep working briefly
    finetune_structure_url: msaUrls.structure_url,
    finetune_metrics_url: msaUrls.metrics_url,
    method: 'ESMFold2',
    updated_at: null,
    s3_lane: wantMsa ? STRUCTURE_S3_MSA_LANE : STRUCTURE_S3_LANE,
  };
}

/** True if the predicted CIF is publicly fetchable (Range GET; HEAD is flaky on this bucket). */
async function predictedFileExists(url) {
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok || res.status === 206) return true;
    if (res.status === 404 || res.status === 403) return false;
  } catch {
    // fall through
  }
  try {
    const head = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(8000),
    });
    return head.ok;
  } catch {
    return false;
  }
}

async function fetchExperimentalByAccession(accession) {
  if (!accession) return null;
  const { rows } = await pool.query(
    `SELECT pdb_id, accession, technique, relaxed, date_created, date_entered, alignment
     FROM pdb_accessions
     WHERE accession = $1
     ORDER BY date_created DESC
     LIMIT 1`,
    [accession],
  );
  if (!rows.length) return null;
  const row = rows[0];
  return {
    orf_id: null,
    accession: row.accession,
    source: 'experimental_pdb',
    format: 'pdb',
    variant: 'base',
    structure_url: `https://petadex.s3.amazonaws.com/pdb_structs/${row.pdb_id}.pdb`,
    metrics_url: null,
    base_structure_url: `https://petadex.s3.amazonaws.com/pdb_structs/${row.pdb_id}.pdb`,
    base_metrics_url: null,
    msa_structure_url: null,
    msa_metrics_url: null,
    finetune_structure_url: null,
    finetune_metrics_url: null,
    method: row.technique || 'experimental',
    updated_at: row.date_entered || row.date_created || null,
    pdb_id: row.pdb_id,
    relaxed: row.relaxed ?? null,
    alignment: row.alignment ?? null,
  };
}

/** True if this ORF is a 60% identity centroid (Alex production lane). */
async function isCentroid60(orfId) {
  try {
    const { rows } = await pool.query(
      `SELECT 1 AS ok FROM block_60pid WHERE centroid_orf_id = $1 LIMIT 1`,
      [orfId],
    );
    return rows.length > 0;
  } catch (err) {
    if (err.code === '42P01') return false;
    throw err;
  }
}

async function accessionToOrfId(accession) {
  const { rows } = await pool.query(
    `SELECT orf_id FROM (
         SELECT orf_id FROM pazy_catalytic_orfs WHERE genbank_accession_id = $1
         UNION ALL
         SELECT orf_id FROM nr_catalytic_orfs WHERE genbank_accession_id = $1
       ) x
       LIMIT 1`,
    [accession],
  );
  return rows[0]?.orf_id != null ? Number(rows[0].orf_id) : null;
}

async function orfAccession(orfId) {
  try {
    const { rows } = await pool.query(
      `SELECT genbank_accession_id AS accession FROM (
           SELECT genbank_accession_id FROM pazy_catalytic_orfs WHERE orf_id = $1
           UNION ALL
           SELECT genbank_accession_id FROM nr_catalytic_orfs WHERE orf_id = $1
         ) x
         WHERE genbank_accession_id IS NOT NULL
         LIMIT 1`,
      [orfId],
    );
    return rows[0]?.accession ?? null;
  } catch (err) {
    if (err.code === '42P01') return null;
    throw err;
  }
}

async function maybeClearMsaUrls(payload) {
  if (
    payload.msa_structure_url &&
    !(await predictedFileExists(payload.msa_structure_url))
  ) {
    payload.msa_structure_url = null;
    payload.msa_metrics_url = null;
    payload.finetune_structure_url = null;
    payload.finetune_metrics_url = null;
  }
  return payload;
}

async function resolveForOrf(orfId, variant = 'base') {
  const accession = await orfAccession(orfId);
  const experimental = await fetchExperimentalByAccession(accession);
  if (experimental) {
    return { ...experimental, orf_id: orfId };
  }
  const centroid = await isCentroid60(orfId);
  const payload = predictedPayload(orfId, {
    isCentroid: centroid,
    accession,
    variant: normalizeVariant(variant),
  });
  if (!(await predictedFileExists(payload.structure_url))) {
    return null;
  }
  return maybeClearMsaUrls(payload);
}

function parseVariant(req) {
  const { error, value } = variantSchema.validate(req.query.variant ?? 'base');
  if (error) return { error: error.message };
  return { value: normalizeVariant(value) };
}

// GET /api/structure/orf/:orfId?variant=base|msa
router.get('/orf/:orfId', async (req, res, next) => {
  const { error, value: orfId } = orfIdSchema.validate(Number(req.params.orfId));
  if (error) return res.status(400).json({ error: error.message });
  const variantResult = parseVariant(req);
  if (variantResult.error) return res.status(400).json({ error: variantResult.error });

  try {
    const { rows } = await pool.query(
      `SELECT 1 AS ok FROM orf_origins WHERE orf_id = $1 LIMIT 1`,
      [orfId],
    );
    if (!rows.length) {
      return res.status(404).json({ error: `ORF ${orfId} not found` });
    }
    const resolved = await resolveForOrf(orfId, variantResult.value);
    if (!resolved) {
      return res.status(404).json({ error: 'No structure available for this ORF' });
    }
    res.json(resolved);
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'Structure backing table is unavailable' });
    }
    next(err);
  }
});

// GET /api/structure/accession/:accession?variant=base|msa
router.get('/accession/:accession', async (req, res, next) => {
  const { error, value: accession } = accessionSchema.validate(req.params.accession);
  if (error) return res.status(400).json({ error: error.message });
  const variantResult = parseVariant(req);
  if (variantResult.error) return res.status(400).json({ error: variantResult.error });

  try {
    const experimental = await fetchExperimentalByAccession(accession);
    if (experimental) {
      try {
        const orfId = await accessionToOrfId(accession);
        if (orfId != null) experimental.orf_id = orfId;
      } catch (err) {
        if (err.code !== '42P01') throw err;
      }
      return res.json(experimental);
    }

    let orfId = null;
    try {
      orfId = await accessionToOrfId(accession);
    } catch (err) {
      if (err.code !== '42P01') throw err;
    }

    if (orfId == null) {
      return res.status(404).json({
        error: 'No structure available for this accession',
      });
    }

    const centroid = await isCentroid60(orfId);
    const payload = await maybeClearMsaUrls(
      predictedPayload(orfId, {
        isCentroid: centroid,
        accession,
        variant: variantResult.value,
      }),
    );
    if (!(await predictedFileExists(payload.structure_url))) {
      return res.status(404).json({
        error: 'No structure available for this accession',
      });
    }
    res.json(payload);
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'Structure backing table is unavailable' });
    }
    next(err);
  }
});

// GET /api/structure/metrics/:orfId?variant=base|msa
router.get('/metrics/:orfId', async (req, res, next) => {
  const { error, value: orfId } = orfIdSchema.validate(Number(req.params.orfId));
  if (error) return res.status(400).json({ error: error.message });
  const variantResult = parseVariant(req);
  if (variantResult.error) return res.status(400).json({ error: variantResult.error });

  try {
    const { rows } = await pool.query(
      `SELECT 1 AS ok FROM orf_origins WHERE orf_id = $1 LIMIT 1`,
      [orfId],
    );
    if (!rows.length) {
      return res.status(404).json({ error: `ORF ${orfId} not found` });
    }

    const resolved = await resolveForOrf(orfId, variantResult.value);
    if (!resolved) {
      return res.status(404).json({ error: 'No structure available for this ORF' });
    }
    if (resolved.source === 'experimental_pdb') {
      return res.json({
        available: false,
        reason: 'Experimental PDB — predicted confidence arrays not attached',
        orf_id: orfId,
        source: resolved.source,
        variant: 'base',
        mean_plddt: null,
        ptm: null,
        molprobity: null,
        pae: null,
        plddt: null,
        validated: true,
        is_centroid: false,
        disclaimer: null,
      });
    }

    const metricsUrl =
      variantResult.value === 'msa'
        ? resolved.msa_metrics_url || resolved.finetune_metrics_url
        : resolved.base_metrics_url || resolved.metrics_url;

    const summary = await fetchAndSummarizeMetrics(metricsUrl, {
      isCentroid: resolved.source === 'esmfold2_centroid_60',
    });

    res.json({
      orf_id: orfId,
      source: resolved.source,
      variant: variantResult.value,
      ...summary,
    });
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'Structure backing table is unavailable' });
    }
    next(err);
  }
});

/**
 * Stream predicted CIF through the API so browsers are not blocked by S3 CORS
 * (bucket currently allows Origin https://petadex.net only; Alex may add localhost later).
 * GET /api/structure/content/orf/:orfId?variant=base|msa
 */
router.get('/content/orf/:orfId', async (req, res, next) => {
  const { error, value: orfId } = orfIdSchema.validate(Number(req.params.orfId));
  if (error) return res.status(400).json({ error: error.message });
  const variantResult = parseVariant(req);
  if (variantResult.error) return res.status(400).json({ error: variantResult.error });

  try {
    const resolved = await resolveForOrf(orfId, variantResult.value);
    if (!resolved?.structure_url) {
      return res.status(404).json({ error: 'No structure available for this ORF' });
    }
    const upstream = await fetch(resolved.structure_url, {
      signal: AbortSignal.timeout(60000),
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: `Upstream structure fetch failed (${upstream.status})`,
      });
    }
    const ctype =
      resolved.format === 'mmcif' || resolved.format === 'cif'
        ? 'chemical/x-mmcif'
        : upstream.headers.get('content-type') || 'text/plain';
    res.setHeader('Content-Type', ctype);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

export default router;
