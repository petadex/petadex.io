// backend/src/routes/structure.js
//
// Resolve an ORF / accession to a viewable 3D structure for Mol*.
// Preference order: experimental PDB (pdb_accessions) → ESMFold2 90pid centroid
// CIF → ESMFold2 ORF CIF. Predicted URLs follow Alex's S3 layout under
// petadex-protein-structures (assumed readable; ACL is a parallel ops track).
//
// Assumed finetune parallels (confirm with Alex):
//   esmfold2-centroids/90pid-finetune/...
//   esmatlas-finetune/...
import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';
import { fetchAndSummarizeMetrics } from '../lib/structureMetrics.js';

const router = Router();

const STRUCTURE_S3_BASE = (
  process.env.STRUCTURE_S3_BASE ||
  'https://petadex-protein-structures.s3.amazonaws.com'
).replace(/\/$/, '');

const STRUCTURE_ARRAY_EXT = process.env.STRUCTURE_ARRAY_EXT || '.npy';

const orfIdSchema = Joi.number().integer().min(1).required();
const accessionSchema = Joi.string().max(64).required();
const variantSchema = Joi.string().valid('base', 'finetune').default('base');

function predictedUrls(orfId, { isCentroid90, finetune = false } = {}) {
  const id = String(orfId);
  if (isCentroid90) {
    const root = finetune
      ? 'esmfold2-centroids/90pid-finetune'
      : 'esmfold2-centroids/90pid';
    return {
      structure_url: `${STRUCTURE_S3_BASE}/${root}/structures/${id}.cif`,
      metrics_url: `${STRUCTURE_S3_BASE}/${root}/arrays/${id}${STRUCTURE_ARRAY_EXT}`,
    };
  }
  const root = finetune ? 'esmatlas-finetune' : 'esmatlas';
  return {
    structure_url: `${STRUCTURE_S3_BASE}/${root}/structures/${id}.cif`,
    metrics_url: `${STRUCTURE_S3_BASE}/${root}/arrays/${id}${STRUCTURE_ARRAY_EXT}`,
  };
}

function predictedPayload(orfId, { isCentroid90, accession = null, variant = 'base' } = {}) {
  const base = predictedUrls(orfId, { isCentroid90, finetune: false });
  const ft = predictedUrls(orfId, { isCentroid90, finetune: true });
  const active = variant === 'finetune' ? ft : base;
  return {
    orf_id: orfId,
    accession,
    source: isCentroid90 ? 'esmfold2_centroid_90' : 'esmfold2_orf',
    format: 'mmcif',
    variant,
    structure_url: active.structure_url,
    metrics_url: active.metrics_url,
    base_structure_url: base.structure_url,
    base_metrics_url: base.metrics_url,
    finetune_structure_url: ft.structure_url,
    finetune_metrics_url: ft.metrics_url,
    method: 'ESMFold2',
    updated_at: null,
  };
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
    finetune_structure_url: null,
    finetune_metrics_url: null,
    method: row.technique || 'experimental',
    updated_at: row.date_entered || row.date_created || null,
    pdb_id: row.pdb_id,
    relaxed: row.relaxed ?? null,
    alignment: row.alignment ?? null,
  };
}

async function isCentroid90(orfId) {
  try {
    const { rows } = await pool.query(
      `SELECT 1 AS ok FROM block_90pid WHERE centroid_orf_id = $1 LIMIT 1`,
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

async function resolveForOrf(orfId, variant = 'base') {
  const accession = await orfAccession(orfId);
  const experimental = await fetchExperimentalByAccession(accession);
  if (experimental) {
    return { ...experimental, orf_id: orfId };
  }
  const centroid = await isCentroid90(orfId);
  return predictedPayload(orfId, { isCentroid90: centroid, accession, variant });
}

function parseVariant(req) {
  const { error, value } = variantSchema.validate(req.query.variant ?? 'base');
  if (error) return { error: error.message };
  return { value };
}

// GET /api/structure/orf/:orfId?variant=base|finetune
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
    res.json(await resolveForOrf(orfId, variantResult.value));
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'Structure backing table is unavailable' });
    }
    next(err);
  }
});

// GET /api/structure/accession/:accession?variant=base|finetune
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

    const centroid = await isCentroid90(orfId);
    res.json(
      predictedPayload(orfId, {
        isCentroid90: centroid,
        accession,
        variant: variantResult.value,
      }),
    );
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'Structure backing table is unavailable' });
    }
    next(err);
  }
});

// GET /api/structure/metrics/:orfId?variant=base|finetune
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
      variantResult.value === 'finetune'
        ? resolved.finetune_metrics_url
        : resolved.base_metrics_url || resolved.metrics_url;

    const summary = await fetchAndSummarizeMetrics(metricsUrl, {
      isCentroid: resolved.source === 'esmfold2_centroid_90',
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

export default router;
