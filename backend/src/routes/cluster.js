/**
 * Routes for cluster-block landing pages (the single-match landing target of the
 * MVP Search Index resolver — see docs/Sequence Organization/04 - MVP Search Index.md).
 *
 * Hierarchy notes (Angela PID nav prototype):
 * - Parent lookup is fast via the block centroid's petadex_clustering row (orf_id PK).
 * - Full child enumeration (30→all 60s, 60→all 90s) needs an index on
 *   petadex_clustering (30/60/90) or a parent→child map. Without it, a DISTINCT
 *   scan of ~307M rows cannot meet interactive latency. Children responses
 *   therefore soft-defer with a clear reason until that exists.
 */

import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';

const router = Router();

const LEVELS = { 90: 'block_90pid', 60: 'block_60pid', 30: 'block_30pid' };
const levelSchema = Joi.number().integer().valid(90, 60, 30).required();
const clusterIdSchema = Joi.number().integer().positive().required();

const BLOCK_SELECT = `
  cluster_id, centroid_orf_id, centroid_accession, centroid_source,
  member_count, child_count, n_pazy, n_nr, n_sra,
  dominant_organism, distinct_organism_count,
  centroid_cath_domain, centroid_domain_name, centroid_component
`;

async function fetchBlock(level, clusterId) {
  const table = LEVELS[level];
  const { rows } = await pool.query(
    `SELECT ${BLOCK_SELECT} FROM ${table} WHERE cluster_id = $1 LIMIT 1`,
    [clusterId],
  );
  return rows[0] || null;
}

/** Ancestor path for a centroid ORF (sub-ms via orf_id PK). */
async function fetchAncestorsForOrf(orfId) {
  if (orfId == null) return null;
  const { rows } = await pool.query(
    `SELECT "90pid_enzyme_id" AS c90_id,
            "60pid_family_id" AS c60_id,
            "30pid_superfamily_id" AS c30_id
     FROM petadex_clustering
     WHERE orf_id = $1`,
    [orfId],
  );
  return rows[0] || null;
}

/**
 * GET /api/cluster/:level/:clusterId/children
 * Soft-deferred until a hierarchy index/map exists. Still returns child_level
 * and expected child_count from the block row for UI honesty.
 */
router.get('/:level/:clusterId/children', async (req, res, next) => {
  const { error: levelError, value: level } = levelSchema.validate(req.params.level);
  if (levelError) return res.status(400).json({ error: 'level must be one of 90, 60, 30' });

  const { error: idError, value: clusterId } = clusterIdSchema.validate(req.params.clusterId);
  if (idError) return res.status(400).json({ error: idError.message });

  if (level === 90) {
    return res.json({
      level,
      cluster_id: clusterId,
      child_level: null,
      children: [],
      deferred: false,
      note: '90% clusters are leaves in the PID hierarchy.',
    });
  }

  const childLevel = level === 30 ? 60 : 90;

  try {
    const block = await fetchBlock(level, clusterId);
    if (!block) return res.status(404).json({ error: 'Cluster block not found' });

    res.json({
      level,
      cluster_id: clusterId,
      child_level: childLevel,
      children: [],
      deferred: true,
      expected_child_count: block.child_count != null ? Number(block.child_count) : null,
      reason: 'needs_hierarchy_index',
      note:
        'Listing child clusters requires an index on petadex_clustering ' +
        '(30pid_superfamily_id / 60pid_family_id / 90pid_enzyme_id) or a ' +
        'parent→child map. Until then, use parent links and ORF ancestor chips. ' +
        'Pin centroids on this page still works.',
      suggested_index_sql: [
        'CREATE INDEX CONCURRENTLY petadex_clustering_c30_c60 ON petadex_clustering ("30pid_superfamily_id", "60pid_family_id");',
        'CREATE INDEX CONCURRENTLY petadex_clustering_c60_c90 ON petadex_clustering ("60pid_family_id", "90pid_enzyme_id");',
      ],
    });
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({
        error: 'Cluster hierarchy backing object is unavailable',
      });
    }
    next(err);
  }
});

/**
 * GET /api/cluster/:level/:clusterId/parent
 * One step up via the block centroid's clustering row (fast).
 */
router.get('/:level/:clusterId/parent', async (req, res, next) => {
  const { error: levelError, value: level } = levelSchema.validate(req.params.level);
  if (levelError) return res.status(400).json({ error: 'level must be one of 90, 60, 30' });

  const { error: idError, value: clusterId } = clusterIdSchema.validate(req.params.clusterId);
  if (idError) return res.status(400).json({ error: idError.message });

  if (level === 30) {
    try {
      const block = await fetchBlock(level, clusterId);
      if (!block) return res.status(404).json({ error: 'Cluster block not found' });
      const ancestors = await fetchAncestorsForOrf(block.centroid_orf_id);
      return res.json({
        level,
        cluster_id: clusterId,
        parent: null,
        path: ancestors
          ? {
              c90_id: ancestors.c90_id ?? null,
              c60_id: ancestors.c60_id ?? null,
              c30_id: ancestors.c30_id ?? null,
            }
          : null,
      });
    } catch (err) {
      if (err.code === '42P01') {
        return res.status(503).json({
          error: 'Cluster hierarchy backing object is unavailable',
        });
      }
      return next(err);
    }
  }

  try {
    const block = await fetchBlock(level, clusterId);
    if (!block) return res.status(404).json({ error: 'Cluster block not found' });

    const ancestors = await fetchAncestorsForOrf(block.centroid_orf_id);
    if (!ancestors) {
      return res.json({ level, cluster_id: clusterId, parent: null, path: null });
    }

    const parentLevel = level === 90 ? 60 : 30;
    const parentId = parentLevel === 60 ? ancestors.c60_id : ancestors.c30_id;
    if (parentId == null) {
      return res.json({
        level,
        cluster_id: clusterId,
        parent: null,
        path: {
          c90_id: ancestors.c90_id ?? null,
          c60_id: ancestors.c60_id ?? null,
          c30_id: ancestors.c30_id ?? null,
        },
      });
    }

    const parentBlock = await fetchBlock(parentLevel, parentId);
    res.json({
      level,
      cluster_id: clusterId,
      parent: parentBlock
        ? { level: parentLevel, ...parentBlock }
        : { level: parentLevel, cluster_id: parentId },
      path: {
        c90_id: ancestors.c90_id ?? null,
        c60_id: ancestors.c60_id ?? null,
        c30_id: ancestors.c30_id ?? null,
      },
    });
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({
        error: 'Cluster hierarchy backing object is unavailable',
      });
    }
    next(err);
  }
});

/**
 * GET /api/cluster/:level/:clusterId
 * Returns the cluster-block row for the given clustering level (90 | 60 | 30).
 */
router.get('/:level/:clusterId', async (req, res, next) => {
  const { error: levelError, value: level } = levelSchema.validate(req.params.level);
  if (levelError) return res.status(400).json({ error: 'level must be one of 90, 60, 30' });

  const { error: idError, value: clusterId } = clusterIdSchema.validate(req.params.clusterId);
  if (idError) return res.status(400).json({ error: idError.message });

  const table = LEVELS[level];

  try {
    const { rows } = await pool.query(
      `SELECT * FROM ${table} WHERE cluster_id = $1 LIMIT 1`,
      [clusterId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cluster block not found' });
    res.json({ level, ...rows[0] });
  } catch (err) {
    if (err.code === '42P01') {
      return res
        .status(503)
        .json({ error: 'Cluster block backing object is unavailable', object: table });
    }
    next(err);
  }
});

export default router;
