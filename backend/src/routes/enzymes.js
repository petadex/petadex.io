/**
 * Routes for BLAST-NR enzyme sequences
 * Provides access to enzyme_fastaa, enzyme_taxonomy, and variant_dictionary tables
 */

import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../db.js';
import { getSchemaFlags } from '../schemaFlags.js';

const router = Router();

// Validation schemas
const enzymeIdSchema = Joi.number().integer().positive().required();
const familyIdSchema = Joi.number().integer().positive().required();

/**
 * GET /api/enzymes
 * List all enzymes with optional filtering
 * Query params:
 *   - limit: number of results (default 50, max 1000)
 *   - offset: pagination offset (default 0)
 *   - family: filter by family_id
 *   - component: filter by component_id
 *   - has_component: true/false - filter sequences with/without component assignment
 */
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 1000);
    const offset = parseInt(req.query.offset) || 0;
    const familyFilter = req.query.family ? parseInt(req.query.family) : null;
    const componentFilter = req.query.component ? parseInt(req.query.component) : null;
    const hasComponent = req.query.has_component;

    let query = `
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
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (familyFilter !== null) {
      paramCount++;
      query += ` AND t.family = $${paramCount}`;
      params.push(familyFilter);
    }

    if (componentFilter !== null) {
      paramCount++;
      query += ` AND t.component = $${paramCount}`;
      params.push(componentFilter);
    }

    if (hasComponent === 'true') {
      query += ` AND t.component IS NOT NULL`;
    } else if (hasComponent === 'false') {
      query += ` AND t.component IS NULL`;
    }

    query += ` ORDER BY e.enzyme_id LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM enzyme_fastaa e
      LEFT JOIN enzyme_taxonomy t ON e.enzyme_id = t.enzyme_id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (familyFilter !== null) {
      countParamCount++;
      countQuery += ` AND t.family = $${countParamCount}`;
      countParams.push(familyFilter);
    }

    if (componentFilter !== null) {
      countParamCount++;
      countQuery += ` AND t.component = $${countParamCount}`;
      countParams.push(componentFilter);
    }

    if (hasComponent === 'true') {
      countQuery += ` AND t.component IS NOT NULL`;
    } else if (hasComponent === 'false') {
      countQuery += ` AND t.component IS NULL`;
    }

    const { rows: countRows } = await pool.query(countQuery, countParams);
    const total = parseInt(countRows[0].total);

    res.json({
      data: rows,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + rows.length < total
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/:enzyme_id
 * Get a specific enzyme by enzyme_id
 */
router.get('/:enzyme_id', async (req, res, next) => {
  const { error, value } = enzymeIdSchema.validate(req.params.enzyme_id);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT
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
      WHERE e.enzyme_id = $1`,
      [value]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Enzyme not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/family/:family_id
 * Get all enzymes in a specific family
 */
router.get('/family/:family_id', async (req, res, next) => {
  const { error, value } = familyIdSchema.validate(req.params.family_id);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const { rows } = await pool.query(
      `SELECT
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
      ORDER BY t.family_pid DESC NULLS FIRST`,
      [value]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No enzymes found for this family' });
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/enzymes/families/summary
 * Get family centroids with variant counts and stats
 * Query params:
 *   - sort: field to sort by (variant_count, component_count, avg_identity, family)
 *   - order: sort order (asc, desc)
 *   - limit: number of results (default 100, max 1000)
 *   - offset: pagination offset (default 0)
 */
router.get('/families/summary', async (req, res, next) => {
  try {
    const {
      sort = 'variant_count',
      order = 'desc',
      limit = 100,
      offset = 0
    } = req.query;

    const sortFieldMap = {
      variant_count: 'variant_count',
      component_count: 'component_count',
      avg_identity: 'avg_identity',
      family: 'family_id',
    };
    const sortField = sortFieldMap[sort] || 'variant_count';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const flags = await getSchemaFlags(pool);

    let dataResult;
    let countResult;
    if (flags.enzymeFamilySummary) {
      const query = `
        SELECT *
        FROM enzyme_family_summary
        ORDER BY ${sortField} ${sortOrder}
        LIMIT $1 OFFSET $2
      `;
      const countQuery = `SELECT COUNT(*) AS total FROM enzyme_family_summary`;
      [dataResult, countResult] = await Promise.all([
        pool.query(query, [parseInt(limit, 10), parseInt(offset, 10)]),
        pool.query(countQuery),
      ]);
    } else {
      const query = `
        WITH per AS (
          SELECT
            et.family AS family_id,
            COUNT(*)::bigint AS variant_count,
            COUNT(DISTINCT et.component)::int AS component_count,
            ROUND(AVG(et.family_pid)::numeric, 2) AS avg_identity,
            (ARRAY_AGG(ef.genbank_accession_id ORDER BY COALESCE(et.family_pid, -1) DESC))[1]
              AS centroid_accession
          FROM enzyme_taxonomy et
          JOIN enzyme_fastaa ef ON ef.enzyme_id = et.enzyme_id
          GROUP BY et.family
        )
        SELECT * FROM per
        ORDER BY ${sortField} ${sortOrder}
        LIMIT $1 OFFSET $2
      `;
      const countQuery = `SELECT COUNT(DISTINCT family) AS total FROM enzyme_taxonomy`;
      [dataResult, countResult] = await Promise.all([
        pool.query(query, [parseInt(limit, 10), parseInt(offset, 10)]),
        pool.query(countQuery),
      ]);
    }

    const total = parseInt(countResult.rows[0]?.total || 0);

    res.json({
      data: dataResult.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total,
        hasMore: parseInt(offset) + dataResult.rows.length < total
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
