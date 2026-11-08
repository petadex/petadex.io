/**
 * Cluster pages: /api/cluster/:level/:clusterId (+ /members, /children).
 *
 * v260701 (current): clusters are named after their centroid's petadex_id (PL… / NR… / LG…) and read from the
 * RDS schema `v260701` (+ the S3 member store). The level is part of the address: /cluster/90/PL228.
 *
 * v1.1 (legacy, until the v1.1 tables are dropped): integer cluster ids, read from block_{90,60,30}pid. Kept so
 * old links resolve until cutover.
 */

import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';
import { parseId, fetchCluster, fetchMemberRange, fetchChildren } from '../lib/v260701.js';

const router = Router();

const LEGACY_TABLES = { 90: 'block_90pid', 60: 'block_60pid', 30: 'block_30pid' };
const levelSchema = Joi.number().integer().valid(90, 60, 30).required();
const legacyIdSchema = Joi.number().integer().positive().required();
const unavailable = err => err?.code === '42P01' || err?.code === '3F000';

function parseLevel(req, res) {
  const { error, value } = levelSchema.validate(req.params.level);
  if (error) { res.status(400).json({ error: 'level must be one of 90, 60, 30' }); return null; }
  return value;
}

function v2Id(req) {
  const id = String(req.params.clusterId || '').trim().toUpperCase();
  return parseId(id) ? id : null;
}

/** GET /api/cluster/:level/:clusterId */
router.get('/:level/:clusterId', async (req, res, next) => {
  const level = parseLevel(req, res); if (level == null) return;
  const id = v2Id(req);
  try {
    if (id) {
      const row = await fetchCluster(level, id);
      if (!row) return res.status(404).json({ error: `No ${level}% cluster named ${id}` });
      const parents = {};
      if (row.parent_60) parents[60] = await fetchCluster(60, row.parent_60);
      if (row.parent_30) parents[30] = await fetchCluster(30, row.parent_30);
      res.set('Cache-Control', 'public, max-age=3600');
      return res.json({ release: 'v260701', ...row, parents });
    }
    const { error, value: clusterId } = legacyIdSchema.validate(req.params.clusterId);
    if (error) return res.status(400).json({ error: 'cluster id must be a petadex_id (PL…, NR…, LG…) or a legacy integer id' });
    const table = LEGACY_TABLES[level];
    const { rows } = await pool.query(`SELECT * FROM ${table} WHERE cluster_id = $1 LIMIT 1`, [clusterId]);
    if (!rows.length) return res.status(404).json({ error: 'Cluster block not found' });
    res.json({ release: 'v1.1', level, ...rows[0] });
  } catch (err) {
    if (unavailable(err)) return res.status(503).json({ error: 'Cluster backing object is unavailable' });
    next(err);
  }
});

const pageSchema = Joi.object({
  offset: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(500).default(100),
});

/** GET /api/cluster/:level/:clusterId/members?offset=&limit= — sequences in the cluster, centroid first. */
router.get('/:level/:clusterId/members', async (req, res, next) => {
  const level = parseLevel(req, res); if (level == null) return;
  const id = v2Id(req);
  if (!id) return res.status(400).json({ error: 'members are available for v260701 cluster names only' });
  const { error, value } = pageSchema.validate(req.query);
  if (error) return res.status(400).json({ error: error.message });
  try {
    const row = await fetchCluster(level, id);
    if (!row) return res.status(404).json({ error: `No ${level}% cluster named ${id}` });
    const limit = Math.max(0, Math.min(value.limit, row.member_count - value.offset));
    const members = limit ? await fetchMemberRange(row.rank_start, value.offset, limit) : [];
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
      level, cluster_id: id, member_count: row.member_count, offset: value.offset, limit: value.limit, members,
      next_offset: value.offset + members.length < row.member_count ? value.offset + members.length : null,
    });
  } catch (err) {
    if (unavailable(err)) return res.status(503).json({ error: 'Cluster backing object is unavailable' });
    next(err);
  }
});

const childSchema = Joi.object({
  after_count: Joi.number().integer().min(0),
  after_id: Joi.string().pattern(/^(PL|NR|LG)[1-9]\d*$/),
  limit: Joi.number().integer().min(1).max(200).default(50),
}).and('after_count', 'after_id');

/** GET /api/cluster/:level/:clusterId/children — the clusters one level down, largest first (keyset paged). */
router.get('/:level/:clusterId/children', async (req, res, next) => {
  const level = parseLevel(req, res); if (level == null) return;
  const id = v2Id(req);
  if (!id) return res.status(400).json({ error: 'children are available for v260701 cluster names only' });
  const { error, value } = childSchema.validate(req.query);
  if (error) return res.status(400).json({ error: error.message });
  try {
    const out = await fetchChildren(level, id, { afterCount: value.after_count, afterId: value.after_id, limit: value.limit });
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ level, cluster_id: id, child_level: level === 30 ? 60 : level === 60 ? 90 : null, ...out });
  } catch (err) {
    if (unavailable(err)) return res.status(503).json({ error: 'Cluster backing object is unavailable' });
    next(err);
  }
});

export default router;
