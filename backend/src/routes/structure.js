// backend/src/routes/structure.js
//
// Resolve an ORF / accession to a viewable 3D structure for Mol*.
// Preference order: experimental PDB (pdb_accessions) → ESMFold2 90pid centroid
// CIF → ESMFold2 ORF CIF. Predicted URLs follow Alex's S3 layout under
// petadex-protein-structures (assumed readable; ACL is a parallel ops track).
import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';

const router = Router();

const STRUCTURE_S3_BASE = (
  process.env.STRUCTURE_S3_BASE ||
  'https://petadex-protein-structures.s3.amazonaws.com'
).replace(/\/$/, '');

const STRUCTURE_ARRAY_EXT = process.env.STRUCTURE_ARRAY_EXT || '.npy';

const orfIdSchema = Joi.number().integer().min(1).required();
const accessionSchema = Joi.string().max(64).required();

function predictedPayload(orfId, { isCentroid90, accession = null } = {}) {
  const id = String(orfId);
  if (isCentroid90) {
    return {
      orf_id: orfId,
      accession,
      source: 'esmfold2_centroid_90',
      format: 'mmcif',
      structure_url: `${STRUCTURE_S3_BASE}/esmfold2-centroids/90pid/structures/${id}.cif`,
      metrics_url: `${STRUCTURE_S3_BASE}/esmfold2-centroids/90pid/arrays/${id}${STRUCTURE_ARRAY_EXT}`,
      method: 'ESMFold2',
      updated_at: null,
    };
  }
  return {
    orf_id: orfId,
    accession,
    source: 'esmfold2_orf',
    format: 'mmcif',
    structure_url: `${STRUCTURE_S3_BASE}/esmatlas/structures/${id}.cif`,
    metrics_url: `${STRUCTURE_S3_BASE}/esmatlas/arrays/${id}${STRUCTURE_ARRAY_EXT}`,
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
    structure_url: `https://petadex.s3.amazonaws.com/pdb_structs/${row.pdb_id}.pdb`,
    metrics_url: null,
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
    // Table may be absent in some local envs — fall back to ORF CIF paths.
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

async function resolveForOrf(orfId) {
  const accession = await orfAccession(orfId);
  const experimental = await fetchExperimentalByAccession(accession);
  if (experimental) {
    return { ...experimental, orf_id: orfId };
  }
  const centroid = await isCentroid90(orfId);
  return predictedPayload(orfId, { isCentroid90: centroid, accession });
}

// GET /api/structure/orf/:orfId
router.get('/orf/:orfId', async (req, res, next) => {
  const { error, value: orfId } = orfIdSchema.validate(Number(req.params.orfId));
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT 1 AS ok FROM orf_origins WHERE orf_id = $1 LIMIT 1`,
      [orfId],
    );
    if (!rows.length) {
      return res.status(404).json({ error: `ORF ${orfId} not found` });
    }
    res.json(await resolveForOrf(orfId));
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'Structure backing table is unavailable' });
    }
    next(err);
  }
});

// GET /api/structure/accession/:accession
router.get('/accession/:accession', async (req, res, next) => {
  const { error, value: accession } = accessionSchema.validate(req.params.accession);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const experimental = await fetchExperimentalByAccession(accession);
    if (experimental) {
      // Enrich with orf_id when the accession is in the corpus.
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
    res.json(predictedPayload(orfId, { isCentroid90: centroid, accession }));
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'Structure backing table is unavailable' });
    }
    next(err);
  }
});

export default router;
